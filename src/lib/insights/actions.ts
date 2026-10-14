"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { analyseWeek } from "./ai";
import { loadWeek } from "./queries";
import { isWeekStart } from "./week";

export type AnalyseState = { status: "idle" | "done" | "error"; error?: "not_owner" | "ai_unavailable" | "nothing_to_analyse" | "failed" };

/** Owner asks for the AI analysis of one week (one Claude call), and it is saved. */
export async function analyseWeekAction(weekStart: string): Promise<AnalyseState> {
  if (!isWeekStart(weekStart)) return { status: "error", error: "failed" };
  const current = await getCurrentBusiness();
  if (!current || current.role !== "owner") return { status: "error", error: "not_owner" };
  const { business } = current;
  const supabase = await createClient();

  const [week, faqs] = await Promise.all([
    loadWeek(business.id, weekStart, business.timezone || "Europe/Prague", supabase),
    supabase.from("faqs").select("question").eq("business_id", business.id),
  ]);

  // Customer messages and handover notes, grouped by conversation.
  const byConversation = new Map<string, { messages: string[]; handoffReasons: string[] }>();
  for (const m of week.messages) {
    const entry = byConversation.get(m.conversation_id) ?? { messages: [], handoffReasons: [] };
    const meta = (m.metadata ?? {}) as { decision?: string; handoff_reason?: string };
    if (m.sender === "customer") entry.messages.push(m.content);
    if (m.sender === "ai" && meta.decision === "handoff" && meta.handoff_reason) entry.handoffReasons.push(meta.handoff_reason);
    byConversation.set(m.conversation_id, entry);
  }
  const conversations = [...byConversation.values()].filter((c) => c.messages.length > 0);

  const result = await analyseWeek({
    businessName: business.name,
    ownerLanguage: business.languages[0] === "en" ? "en" : "cs",
    conversations,
    existingFaqs: (faqs.data ?? []).map((f) => f.question),
  });
  if (!result.ok) return { status: "error", error: result.error };

  const row = { insights: result.insights, message_count: week.stats.customerMessages };
  const { error } = await supabase.from("weekly_summaries").insert({ business_id: business.id, week_start: weekStart, ...row });
  if (error && error.code === "23505") {
    // Already analysed once: replace it with the fresh analysis.
    const { error: updateError } = await supabase
      .from("weekly_summaries")
      .update(row)
      .eq("business_id", business.id)
      .eq("week_start", weekStart);
    if (updateError) {
      console.error("analyseWeekAction update failed", updateError);
      return { status: "error", error: "failed" };
    }
  } else if (error) {
    console.error("analyseWeekAction insert failed", error);
    return { status: "error", error: "failed" };
  }
  revalidatePath("/summary");
  return { status: "done" };
}
