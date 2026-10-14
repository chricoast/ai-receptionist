import "server-only";
import { INSIGHTS } from "@/config/app";
import { createClient } from "@/lib/supabase/server";
import { parseInsights, type Insights } from "./ai";
import { computeWeekStats, weekRange, type StatsConversation, type StatsMessage, type WeekStats } from "./week";

type Supabase = Awaited<ReturnType<typeof createClient>>;
const PAGE = 1000; // Supabase returns at most 1000 rows per request

/** Reads all pages of a query (up to INSIGHTS.maxRows rows). */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; from < INSIGHTS.maxRows; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export type WeekData = {
  stats: WeekStats;
  conversations: StatsConversation[];
  messages: Array<StatsMessage & { content: string }>;
};

/** Everything about one week (test chats from settings are left out). Row Level Security keeps it to the user's business. */
export async function loadWeek(businessId: string, weekStart: string, timeZone: string, supabase?: Supabase): Promise<WeekData> {
  const db = supabase ?? (await createClient());
  const { from, to } = weekRange(weekStart, timeZone);
  // Messages a little after the week still belong to conversations started in it.
  const messagesUntil = new Date(to.getTime() + 2 * 24 * 3600_000);

  const [conversations, messages, leads] = await Promise.all([
    readAll<StatsConversation>((a, b) =>
      db
        .from("conversations")
        .select("id, status, created_at, lead_at")
        .eq("business_id", businessId)
        .eq("is_test", false)
        .gte("created_at", from.toISOString())
        .lt("created_at", to.toISOString())
        .order("created_at")
        .range(a, b),
    ),
    readAll<StatsMessage & { content: string }>((a, b) =>
      db
        .from("messages")
        .select("conversation_id, sender, created_at, metadata, content")
        .eq("business_id", businessId)
        .gte("created_at", from.toISOString())
        .lt("created_at", messagesUntil.toISOString())
        .order("created_at")
        .range(a, b),
    ),
    db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("is_test", false)
      .gte("lead_at", from.toISOString())
      .lt("lead_at", to.toISOString()),
  ]);

  const ids = new Set(conversations.map((c) => c.id));
  const own = messages.filter((m) => ids.has(m.conversation_id));
  return { stats: computeWeekStats(conversations, own, leads.count ?? 0, timeZone), conversations, messages: own };
}

/** The stored AI analysis of a week, if any. */
export async function getWeekInsights(
  businessId: string,
  weekStart: string,
): Promise<{ insights: Insights; messageCount: number; updatedAt: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_summaries")
    .select("insights, message_count, updated_at")
    .eq("business_id", businessId)
    .eq("week_start", weekStart)
    .maybeSingle();
  const insights = data ? parseInsights(data.insights) : null;
  return data && insights ? { insights, messageCount: data.message_count, updatedAt: data.updated_at } : null;
}
