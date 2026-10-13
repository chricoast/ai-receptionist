"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { INBOX } from "@/config/app";
import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

export type InboxActionState = { status: "idle" | "ok" | "error"; error?: "invalid" | "failed"; at?: number };

const idSchema = z.uuid();
const statusSchema = z.enum(["ai_active", "human_active", "closed"]);

/**
 * Take over, hand back or close a conversation. The database function checks
 * that the conversation belongs to the user's business.
 */
export async function changeConversationStatus(
  conversationId: string,
  status: "ai_active" | "human_active" | "closed",
): Promise<InboxActionState> {
  if (!idSchema.safeParse(conversationId).success || !statusSchema.safeParse(status).success) {
    return { status: "error", error: "invalid" };
  }
  if (!(await getCurrentBusiness())) return { status: "error", error: "failed" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_conversation_status", { p_conversation_id: conversationId, p_status: status });
  if (error) {
    console.error("changeConversationStatus failed", error);
    return { status: "error", error: "failed" };
  }
  revalidatePath("/", "layout");
  return { status: "ok", at: Date.now() };
}

/** A team member replies to the customer (this also takes the conversation over). */
export async function sendReply(conversationId: string, text: string): Promise<InboxActionState> {
  const content = typeof text === "string" ? text.trim() : "";
  if (!idSchema.safeParse(conversationId).success || !content || content.length > INBOX.maxReplyLength) {
    return { status: "error", error: "invalid" };
  }
  if (!(await getCurrentBusiness())) return { status: "error", error: "failed" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_human_reply", { p_conversation_id: conversationId, p_content: content });
  if (error) {
    console.error("sendReply failed", error);
    return { status: "error", error: error.code === "22023" ? "invalid" : "failed" };
  }
  revalidatePath("/", "layout");
  return { status: "ok", at: Date.now() };
}
