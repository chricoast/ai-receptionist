import "server-only";
import type { ContactRow, ConversationRow, MessageRow } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export const INBOX_FILTERS = ["open", "waiting", "leads", "closed"] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const isInboxFilter = (value: unknown): value is InboxFilter =>
  typeof value === "string" && (INBOX_FILTERS as readonly string[]).includes(value);

export type InboxItem = Pick<
  ConversationRow,
  "id" | "status" | "last_message" | "last_message_at" | "is_test" | "lead_at" | "summary"
> & { contact: Pick<ContactRow, "name" | "phone" | "email"> | null };

const WAITING: ConversationRow["status"][] = ["needs_human", "human_active"];

/** Conversations that need the team (badge in the menu). Row Level Security keeps it to the user's business. */
export async function countWaiting(businessId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "needs_human");
  return count ?? 0;
}

async function withContacts<T extends { contact_id: string }>(rows: T[]) {
  if (!rows.length) return [];
  const supabase = await createClient();
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, name, phone, email")
    .in("id", [...new Set(rows.map((r) => r.contact_id))]);
  if (error) throw error;
  return rows.map(({ contact_id, ...row }) => ({
    ...row,
    contact: contacts.find((c) => c.id === contact_id) ?? null,
  }));
}

const LIST_COLUMNS = "id, status, last_message, last_message_at, is_test, lead_at, summary, contact_id";

/** The inbox list, newest first. */
export async function listConversations(businessId: string, filter: InboxFilter, limit = 100): Promise<InboxItem[]> {
  const supabase = await createClient();
  let query = supabase.from("conversations").select(LIST_COLUMNS).eq("business_id", businessId);
  if (filter === "open") query = query.neq("status", "closed");
  if (filter === "waiting") query = query.in("status", WAITING);
  if (filter === "closed") query = query.eq("status", "closed");
  if (filter === "leads") query = query.not("lead_at", "is", null);
  const { data, error } = await query
    .order(filter === "leads" ? "lead_at" : "last_message_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return withContacts(data);
}

export type ConversationDetail = {
  conversation: ConversationRow;
  contact: Pick<ContactRow, "name" | "phone" | "email"> | null;
  messages: MessageRow[];
};

/** One conversation with its messages, or null if it isn't the user's. */
export async function getConversationDetail(businessId: string, id: string): Promise<ConversationDetail | null> {
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!conversation) return null;
  const [contact, messages] = await Promise.all([
    supabase.from("contacts").select("name, phone, email").eq("id", conversation.contact_id).maybeSingle(),
    supabase.from("messages").select("*").eq("conversation_id", id).neq("sender", "system").order("created_at"),
  ]);
  if (messages.error) throw messages.error;
  return { conversation, contact: contact.data, messages: messages.data };
}

/** Numbers for the dashboard tiles (test chats from settings are left out). */
export async function getInboxStats(businessId: string) {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const base = () =>
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_test", false);
  const [total, handled, waiting, leads] = await Promise.all([
    base().gte("created_at", weekAgo),
    base().gte("created_at", weekAgo).in("status", ["ai_active", "closed"]),
    base().eq("status", "needs_human"),
    base().gte("lead_at", weekAgo),
  ]);
  return {
    total: total.count ?? 0,
    handled: handled.count ?? 0,
    waiting: waiting.count ?? 0,
    leads: leads.count ?? 0,
  };
}
