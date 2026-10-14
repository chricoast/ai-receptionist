/*
 * Weekly numbers for the summary page. Pure functions (no database), so they
 * can be tested. Weeks run Monday to Sunday in the business's time zone.
 */

const DAY_MS = 24 * 3600_000;

/** Local calendar parts of an instant in a time zone. */
function localParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    // 1 = Monday … 7 = Sunday
    weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1,
    utcOfLocal: Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")),
      Number(get("minute")),
      Number(get("second")),
    ),
  };
}

/** YYYY-MM-DD plus n days (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The Monday (YYYY-MM-DD) of the week containing `instant`, in the business's time zone. */
export function weekStartOf(instant: Date, timeZone: string): string {
  const { date, weekday } = localParts(instant, timeZone);
  return addDays(date, 1 - weekday);
}

export const isWeekStart = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).getUTCDay() === 1;

/** The instant of local midnight at the start of `date` in `timeZone` (handles summer time). */
export function localMidnight(date: string, timeZone: string): Date {
  const guess = Date.parse(`${date}T00:00:00Z`);
  let instant = guess;
  for (let i = 0; i < 2; i++) {
    const offset = localParts(new Date(instant), timeZone).utcOfLocal - instant;
    instant = guess - offset;
  }
  return new Date(instant);
}

/** [from, to) of the week starting on `weekStart`. */
export function weekRange(weekStart: string, timeZone: string) {
  return { from: localMidnight(weekStart, timeZone), to: localMidnight(addDays(weekStart, 7), timeZone) };
}

export type StatsConversation = { id: string; status: string; created_at: string; lead_at: string | null };
export type StatsMessage = { conversation_id: string; sender: string; created_at: string; metadata: unknown };

export type WeekStats = {
  conversations: number;
  /** Answered by the receptionist alone (never handed over, nobody from the team stepped in). */
  handledByAi: number;
  /** Handed over to the team, or the team took over. */
  handedOver: number;
  leads: number;
  customerMessages: number;
  /** Median seconds from a customer's message to the receptionist's reply, or null. */
  medianReplySeconds: number | null;
  /** Conversations started per weekday, Monday first. */
  byWeekday: number[];
  /** Local hour (0–23) with the most customer messages, or null. */
  busiestHour: number | null;
};

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Numbers for one week. `conversations` = the (non-test) conversations started
 * that week; `messages` = their messages; `leads` = enquiries received that week.
 */
export function computeWeekStats(
  conversations: StatsConversation[],
  messages: StatsMessage[],
  leads: number,
  timeZone: string,
): WeekStats {
  const ids = new Set(conversations.map((c) => c.id));
  const own = messages.filter((m) => ids.has(m.conversation_id)).sort((a, b) => a.created_at.localeCompare(b.created_at));

  const handedOverIds = new Set<string>();
  for (const c of conversations) if (c.status === "needs_human" || c.status === "human_active" || c.lead_at) handedOverIds.add(c.id);
  for (const m of own) {
    const decision = (m.metadata as { decision?: string } | null)?.decision;
    if (m.sender === "human" || (m.sender === "ai" && decision === "handoff")) handedOverIds.add(m.conversation_id);
  }

  const replyTimes: number[] = [];
  const waiting = new Map<string, number>(); // conversation → time of the first unanswered customer message
  const hours = new Array<number>(24).fill(0);
  let customerMessages = 0;
  for (const m of own) {
    const at = Date.parse(m.created_at);
    if (m.sender === "customer") {
      customerMessages++;
      hours[localParts(new Date(at), timeZone).hour]++;
      if (!waiting.has(m.conversation_id)) waiting.set(m.conversation_id, at);
    } else if (m.sender === "ai" && waiting.has(m.conversation_id)) {
      replyTimes.push((at - waiting.get(m.conversation_id)!) / 1000);
      waiting.delete(m.conversation_id);
    } else if (m.sender === "human") {
      waiting.delete(m.conversation_id);
    }
  }

  const byWeekday = new Array<number>(7).fill(0);
  for (const c of conversations) byWeekday[localParts(new Date(c.created_at), timeZone).weekday - 1]++;

  const peak = Math.max(...hours);
  const replies = median(replyTimes);
  return {
    conversations: conversations.length,
    handledByAi: conversations.length - handedOverIds.size,
    handedOver: handedOverIds.size,
    leads,
    customerMessages,
    medianReplySeconds: replies === null ? null : Math.round(replies),
    byWeekday,
    busiestHour: peak > 0 ? hours.indexOf(peak) : null,
  };
}
