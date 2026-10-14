import { describe, expect, it } from "vitest";
import { addDays, computeWeekStats, isWeekStart, localMidnight, weekRange, weekStartOf } from "@/lib/insights/week";

const TZ = "Europe/Prague";

describe("weeks in the business's time zone", () => {
  it("finds the Monday of the week", () => {
    expect(weekStartOf(new Date("2026-10-14T10:00:00Z"), TZ)).toBe("2026-10-12"); // Wednesday
    expect(weekStartOf(new Date("2026-10-18T21:30:00Z"), TZ)).toBe("2026-10-12"); // Sunday 23:30 in Prague
    expect(weekStartOf(new Date("2026-10-18T22:30:00Z"), TZ)).toBe("2026-10-19"); // already Monday 00:30 in Prague
  });

  it("uses local midnight, also across the change to winter time", () => {
    expect(localMidnight("2026-10-12", TZ).toISOString()).toBe("2026-10-11T22:00:00.000Z"); // summer time (+2)
    expect(localMidnight("2026-10-26", TZ).toISOString()).toBe("2026-10-25T23:00:00.000Z"); // winter time (+1)
    const { from, to } = weekRange("2026-10-19", TZ);
    expect(from.toISOString()).toBe("2026-10-18T22:00:00.000Z");
    expect(to.toISOString()).toBe("2026-10-25T23:00:00.000Z"); // the week with the clock change has 169 hours
  });

  it("validates week starts", () => {
    expect(isWeekStart("2026-10-12")).toBe(true);
    expect(isWeekStart("2026-10-13")).toBe(false);
    expect(isWeekStart("12.10.2026")).toBe(false);
    expect(addDays("2026-10-12", -7)).toBe("2026-10-05");
  });
});

describe("week numbers", () => {
  const conversations = [
    { id: "a", status: "ai_active", created_at: "2026-10-12T08:00:00Z", lead_at: null }, // Monday
    { id: "b", status: "needs_human", created_at: "2026-10-12T16:00:00Z", lead_at: null }, // Monday, handed over
    { id: "c", status: "ai_active", created_at: "2026-10-16T17:00:00Z", lead_at: null }, // Friday, team replied
    { id: "d", status: "closed", created_at: "2026-10-17T09:00:00Z", lead_at: "2026-10-17T09:05:00Z" }, // Saturday, enquiry
  ];
  const m = (conversation_id: string, sender: string, created_at: string, decision?: string) => ({
    conversation_id,
    sender,
    created_at,
    metadata: decision ? { decision } : {},
  });
  const messages = [
    m("a", "customer", "2026-10-12T08:00:00Z"),
    m("a", "ai", "2026-10-12T08:00:04Z", "answer"),
    m("b", "customer", "2026-10-12T16:00:00Z"),
    m("b", "ai", "2026-10-12T16:00:06Z", "handoff"),
    m("c", "customer", "2026-10-16T17:00:00Z"),
    m("c", "ai", "2026-10-16T17:00:08Z", "answer"),
    m("c", "customer", "2026-10-16T17:01:00Z"),
    m("c", "human", "2026-10-16T17:30:00Z"),
    m("d", "customer", "2026-10-17T09:00:00Z"),
    m("d", "ai", "2026-10-17T09:00:10Z", "answer"),
    m("x", "customer", "2026-10-17T09:00:00Z"), // a test conversation: not counted
  ];

  it("counts handled vs handed over, replies, days and the busiest hour", () => {
    const stats = computeWeekStats(conversations, messages, 1, TZ);
    expect(stats.conversations).toBe(4);
    expect(stats.handedOver).toBe(3); // b (handoff), c (team replied), d (enquiry)
    expect(stats.handledByAi).toBe(1);
    expect(stats.leads).toBe(1);
    expect(stats.customerMessages).toBe(5);
    expect(stats.medianReplySeconds).toBe(7); // 4, 6, 8, 10 s → 7
    expect(stats.byWeekday).toEqual([2, 0, 0, 0, 1, 1, 0]);
    expect(stats.busiestHour).toBe(19); // 17:00 UTC = 19:00 in Prague (two messages)
  });

  it("handles an empty week", () => {
    const stats = computeWeekStats([], [], 0, TZ);
    expect(stats).toMatchObject({ conversations: 0, handledByAi: 0, medianReplySeconds: null, busiestHour: null });
  });
});
