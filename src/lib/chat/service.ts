import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { AI, CHAT_LIMITS } from "@/config/app";
import { getReceptionistReply, holdingReply, type ChatTurn } from "@/lib/ai/receptionist";
import type { ReceptionistKnowledge } from "@/lib/ai/prompt";
import type { ConversationRow, MessageRow } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWidgetTheme, type WidgetTheme } from "./theme";

type Admin = ReturnType<typeof createAdminClient>;

/** What the widget may see of a message (no internal metadata). */
export type PublicMessage = Pick<MessageRow, "id" | "sender" | "content" | "created_at">;

export type ChatResult =
  | { ok: true; conversationId: string; token?: string; messages: PublicMessage[]; status: ConversationRow["status"] }
  | { ok: false; error: "not_found" | "disabled" | "forbidden" | "rate_limited" | "server" };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

/** IP addresses are only stored as a keyed hash, for rate limiting. */
export function hashIp(ip: string): string {
  if (!ip) return "";
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "salt").update(ip).digest("hex");
}

export type WidgetChannel = {
  id: string;
  businessId: string;
  businessName: string;
  enabled: boolean;
  theme: WidgetTheme;
};

export async function findWidgetChannel(publicKey: string, admin: Admin = createAdminClient()): Promise<WidgetChannel | null> {
  if (!/^wc_[a-f0-9]{32}$/.test(publicKey)) return null;
  // One request: the channel with its business's name.
  const { data, error } = await admin
    .from("channels")
    .select("id, business_id, enabled, appearance, businesses(name)")
    .eq("public_key", publicKey)
    .eq("type", "web_chat")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const channel = data as unknown as {
    id: string;
    business_id: string;
    enabled: boolean;
    appearance: unknown;
    businesses: { name: string } | null;
  };
  const business = { name: channel.businesses?.name ?? "" };
  return {
    id: channel.id,
    businessId: channel.business_id,
    businessName: business.name,
    enabled: channel.enabled,
    theme: parseWidgetTheme(channel.appearance),
  };
}

/** Everything the receptionist needs to know about one business. */
async function loadKnowledge(admin: Admin, businessId: string): Promise<ReceptionistKnowledge> {
  const [business, services, hours, exceptions, faqs, rules, pages] = await Promise.all([
    admin.from("businesses").select("*").eq("id", businessId).single(),
    admin.from("services").select("*").eq("business_id", businessId).order("position"),
    admin.from("opening_hours").select("*").eq("business_id", businessId),
    admin.from("opening_hour_exceptions").select("*").eq("business_id", businessId),
    admin.from("faqs").select("*").eq("business_id", businessId).order("position"),
    admin.from("rules").select("*").eq("business_id", businessId).order("position"),
    admin.from("knowledge_pages").select("url, title, content").eq("business_id", businessId).order("url"),
  ]);
  for (const r of [business, services, hours, exceptions, faqs, rules, pages]) if (r.error) throw r.error;
  return {
    business: business.data!,
    services: services.data ?? [],
    hours: hours.data ?? [],
    exceptions: exceptions.data ?? [],
    faqs: faqs.data ?? [],
    rules: rules.data ?? [],
    // The whole website is only used when the business switched it on.
    pages: business.data!.use_website_knowledge ? (pages.data ?? []) : [],
  };
}

async function findConversation(admin: Admin, channel: WidgetChannel, conversationId: string, token: string) {
  const { data, error } = await admin
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("business_id", channel.businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.visitor_token_hash !== sha256(token)) return null;
  return data;
}

async function countSince(
  admin: Admin,
  table: "messages" | "conversations",
  filters: Record<string, string>,
  sinceIso: string,
) {
  let query = admin.from(table).select("id", { count: "exact", head: true }).gte("created_at", sinceIso);
  for (const [k, v] of Object.entries(filters)) query = query.eq(k, v);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function listMessages(admin: Admin, conversationId: string, limit: number): Promise<PublicMessage[]> {
  const { data, error } = await admin
    .from("messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", conversationId)
    .neq("sender", "system")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

/** Messages so far, for a visitor reopening the chat. */
export async function getConversation(publicKey: string, conversationId: string, token: string): Promise<ChatResult> {
  const admin = createAdminClient();
  const channel = await findWidgetChannel(publicKey, admin);
  if (!channel) return { ok: false, error: "not_found" };
  const conversation = await findConversation(admin, channel, conversationId, token);
  if (!conversation) return { ok: false, error: "forbidden" };
  return {
    ok: true,
    conversationId,
    status: conversation.status,
    messages: await listMessages(admin, conversationId, 100),
  };
}

const clean = (value: string, max: number) => value.trim().slice(0, max);

/** A customer sends a message: store it, get the receptionist's reply, store that. */
export async function postCustomerMessage(input: {
  publicKey: string;
  conversationId?: string;
  token?: string;
  text: string;
  language: string;
  preview: boolean;
  ip: string;
}): Promise<ChatResult> {
  const admin = createAdminClient();
  const channel = await findWidgetChannel(input.publicKey, admin);
  if (!channel) return { ok: false, error: "not_found" };
  if (!channel.enabled) return { ok: false, error: "disabled" };

  // 1. Find the visitor's conversation, or start a new one.
  let conversation: ConversationRow | null = null;
  let newToken: string | undefined;
  if (input.conversationId && input.token) {
    conversation = await findConversation(admin, channel, input.conversationId, input.token);
    if (!conversation) return { ok: false, error: "forbidden" };
  } else {
    const ipHash = hashIp(input.ip);
    if (ipHash) {
      const recent = await countSince(
        admin,
        "conversations",
        { business_id: channel.businessId, client_ip_hash: ipHash },
        hoursAgo(1),
      );
      if (recent >= CHAT_LIMITS.conversationsPerIpPerHour) return { ok: false, error: "rate_limited" };
    }
    newToken = randomBytes(24).toString("base64url");
    const { data: contact, error: cError } = await admin
      .from("contacts")
      .insert({ business_id: channel.businessId })
      .select("id")
      .single();
    if (cError) throw cError;
    const { data: created, error } = await admin
      .from("conversations")
      .insert({
        business_id: channel.businessId,
        channel_id: channel.id,
        contact_id: contact.id,
        visitor_token_hash: sha256(newToken),
        client_ip_hash: ipHash,
        is_test: input.preview,
      })
      .select("*")
      .single();
    if (error) throw error;
    conversation = created;
  }

  // 2. Rate limit per conversation.
  const recentMessages = await countSince(
    admin,
    "messages",
    { conversation_id: conversation.id, sender: "customer" },
    hoursAgo(1),
  );
  if (recentMessages >= CHAT_LIMITS.messagesPerConversationPerHour) return { ok: false, error: "rate_limited" };

  // 3. Store the customer's message.
  const customerText = clean(input.text, CHAT_LIMITS.maxMessageLength);
  let lastMessage = customerText;
  const { error: mError } = await admin.from("messages").insert({
    conversation_id: conversation.id,
    business_id: channel.businessId,
    sender: "customer",
    content: customerText,
  });
  if (mError) throw mError;

  // A customer writing again reopens a closed conversation.
  let newStatus: ConversationRow["status"] | null = conversation.status === "closed" ? "ai_active" : null;

  // 4. When a person from the team has taken over, the AI stays quiet.
  if (conversation.status !== "human_active") {
    // Independent reads, done together to keep the reply fast.
    const [repliesToday, history, knowledge] = await Promise.all([
      countSince(admin, "messages", { business_id: channel.businessId, sender: "ai" }, hoursAgo(24)),
      listMessages(admin, conversation.id, AI.historyLimit) as Promise<ChatTurn[]>,
      loadKnowledge(admin, channel.businessId),
    ]);
    const reply =
      repliesToday >= CHAT_LIMITS.aiRepliesPerBusinessPerDay
        ? holdingReply(input.language, "Daily AI reply limit reached for this business.")
        : await getReceptionistReply(knowledge, history, input.language);

    // The team may have taken over while the receptionist was thinking.
    const { data: fresh } = await admin.from("conversations").select("status").eq("id", conversation.id).single();
    if (fresh?.status !== "human_active") {
      const { error: aError } = await admin.from("messages").insert({
        conversation_id: conversation.id,
        business_id: channel.businessId,
        sender: "ai",
        content: reply.reply,
        metadata: {
          decision: reply.decision,
          handoff_reason: reply.handoff_reason,
          from_ai: reply.fromAi,
          ...reply.meta,
        },
      });
      if (aError) throw aError;
      lastMessage = reply.reply;
      if (reply.decision === "handoff") newStatus = "needs_human";
    }

    // 5. Remember contact details the customer gave, without overwriting.
    const details = {
      name: clean(reply.customer_name, 200),
      phone: clean(reply.customer_phone, 50),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply.customer_email.trim()) ? clean(reply.customer_email, 200) : "",
    };
    if (details.name || details.phone || details.email) {
      const { data: contact } = await admin.from("contacts").select("*").eq("id", conversation.contact_id).single();
      if (contact) {
        const patch: { name?: string; phone?: string; email?: string } = {};
        if (details.name && !contact.name) patch.name = details.name;
        if (details.phone && !contact.phone) patch.phone = details.phone;
        if (details.email && !contact.email) patch.email = details.email;
        if (Object.keys(patch).length) await admin.from("contacts").update(patch).eq("id", contact.id);
      }
    }

    // An enquiry with contact details: keep the latest summary for the owner.
    if (reply.lead_ready && reply.lead_summary.trim()) {
      conversation.summary = clean(reply.lead_summary, 3000);
      conversation.lead_at ??= new Date().toISOString();
      newStatus = "needs_human";
    }
  }

  const [, , messages] = await Promise.all([
    admin
      .from("conversations")
      .update({
        summary: conversation.summary,
        lead_at: conversation.lead_at,
        last_message: lastMessage.slice(0, 300),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation.id),
    // Never override a team member who has taken over in the meantime.
    newStatus
      ? admin.from("conversations").update({ status: newStatus }).eq("id", conversation.id).neq("status", "human_active")
      : null,
    listMessages(admin, conversation.id, 100),
  ]);
  if (newStatus && conversation.status !== "human_active") conversation.status = newStatus;

  return { ok: true, conversationId: conversation.id, token: newToken, status: conversation.status, messages };
}

export type ChatCheck = {
  /** Server can read the chat (the Supabase secret key works). */
  database: "ok" | "missing_key" | "wrong_key" | "error";
  /** The chat channel exists and is switched on. */
  channel: "ok" | "not_found" | "disabled" | "unknown";
  /** A Claude API key is set (it isn't called here, so this doesn't prove it's valid). */
  ai: "set" | "missing";
  detail: string;
};

/**
 * Self-check for the owner (Settings → Website chat): does the public chat
 * work end to end? Never reveals any key, only what is wrong.
 */
export async function checkChat(publicKey: string): Promise<ChatCheck> {
  const ai = process.env.ANTHROPIC_API_KEY?.trim() ? "set" : "missing";
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
  if (!secret) return { database: "missing_key", channel: "unknown", ai, detail: "" };
  // A common mix-up: the public (publishable) key pasted as the secret one.
  if (!secret.startsWith("sb_secret_") && !secret.startsWith("eyJ")) {
    const hint = secret.startsWith("sb_publishable_") ? "SUPABASE_SECRET_KEY contains the publishable key (sb_publishable_…), not the secret one (sb_secret_…)." : "SUPABASE_SECRET_KEY doesn't look like a Supabase secret key (sb_secret_…).";
    return { database: "wrong_key", channel: "unknown", ai, detail: hint };
  }
  try {
    const channel = await findWidgetChannel(publicKey);
    if (!channel) return { database: "ok", channel: "not_found", ai, detail: "" };
    return { database: "ok", channel: channel.enabled ? "ok" : "disabled", ai, detail: "" };
  } catch (error) {
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
    // An unknown key is treated like a visitor without rights: "permission denied".
    const wrongKey = /invalid api key|jwt|unauthori[sz]ed|401|apikey|permission denied/i.test(message);
    return { database: wrongKey ? "wrong_key" : "error", channel: "unknown", ai, detail: message.slice(0, 200) };
  }
}
