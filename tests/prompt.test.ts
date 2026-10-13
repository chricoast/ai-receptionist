import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  formatNow,
  formatOpeningHours,
  formatPrice,
  localDate,
  type ReceptionistKnowledge,
} from "@/lib/ai/prompt";

const knowledge: ReceptionistKnowledge = {
  business: {
    name: "Inkoust Studio",
    type: "tattoo",
    description: "Tetovací studio na Žižkově.",
    address: "Seifertova 1, Praha 3",
    phone: "+420 777 123 456",
    email: "",
    website: "",
    booking_url: "https://reservio.com/inkoust",
    languages: ["cs", "en"],
    timezone: "Europe/Prague",
    tone: "friendly",
    tone_notes: "Tykáme si.",
    goal: "answer",
  },
  services: [
    { name: "Malé tetování", description: "", price_from: 1500, price_to: null, currency: "CZK", price_note: "", duration_minutes: 60, active: true },
    { name: "Tetování na míru", description: "", price_from: 2000, price_to: 8000.5, currency: "CZK", price_note: "záloha 1 000 Kč", duration_minutes: null, active: true },
    { name: "Cover-up", description: "", price_from: null, price_to: null, currency: "CZK", price_note: "", duration_minutes: null, active: true },
    { name: "Piercing", description: "", price_from: 500, price_to: null, currency: "CZK", price_note: "", duration_minutes: null, active: false },
  ],
  hours: [
    { weekday: 1, opens_at: "13:00:00", closes_at: "18:00:00" },
    { weekday: 1, opens_at: "09:00:00", closes_at: "12:00:00" },
    { weekday: 5, opens_at: "18:00:00", closes_at: "02:00:00" },
  ],
  exceptions: [
    { date: "2026-12-24", closed: true, opens_at: null, closes_at: null, note: "Vánoce" },
    { date: "2026-01-01", closed: true, opens_at: null, closes_at: null, note: "old" },
  ],
  faqs: [{ question: "Kolik je záloha?", answer: "1 000 Kč převodem." }],
  rules: [
    { kind: "never_answer", content: "Zdravotní otázky" },
    { kind: "instruction", content: "Vždy zmiň, že bereme jen karty." },
    { kind: "question", content: "Jakou velikost tetování chcete?" },
  ],
  pages: [{ url: "https://inkoust.example/o-nas", title: "O nás", content: "Tetujeme od roku 2015." }],
};

describe("receptionist prompt", () => {
  it("formats prices as fixed, range or not listed", () => {
    expect(formatPrice(knowledge.services[0])).toBe("1500 CZK");
    expect(formatPrice(knowledge.services[1])).toBe("2000–8000.50 CZK");
    expect(formatPrice(knowledge.services[2])).toBe("price not listed");
  });

  it("lists every weekday, sorted ranges, closed days and overnight hours", () => {
    const text = formatOpeningHours(knowledge.hours);
    expect(text).toContain("Monday: 09:00–12:00, 13:00–18:00");
    expect(text).toContain("Tuesday: closed");
    expect(text).toContain("Friday: 18:00–02:00 (until the next day)");
    expect(formatOpeningHours([])).toBe("Not provided.");
  });

  it("includes the business facts and rules, but hides inactive services and past special days", () => {
    const prompt = buildSystemPrompt(knowledge, "2026-10-12");
    expect(prompt).toContain("Tetování na míru: 2000–8000.50 CZK (záloha 1 000 Kč)");
    expect(prompt).not.toContain("Piercing");
    expect(prompt).toContain("2026-12-24: closed (Vánoce)");
    expect(prompt).not.toContain("2026-01-01");
    expect(prompt).toContain("- Zdravotní otázky");
    expect(prompt).toContain("- Vždy zmiň, že bereme jen karty.");
    expect(prompt).toContain("share the booking link: https://reservio.com/inkoust");
    expect(prompt).toContain("Q: Kolik je záloha?\nA: 1 000 Kč převodem.");
    expect(prompt).toContain("Tykáme si.");
  });

  it("includes the website content and, in meeting mode, the questions and booking link", () => {
    const answerMode = buildSystemPrompt(knowledge, "2026-10-12");
    expect(answerMode).toContain("## O nás\n(https://inkoust.example/o-nas)\nTetujeme od roku 2015.");
    expect(answerMode).not.toContain("arrange a meeting");
    const meeting = buildSystemPrompt({ ...knowledge, business: { ...knowledge.business, goal: "meeting" } }, "2026-10-12");
    expect(meeting).toContain("arrange a meeting");
    expect(meeting).toContain("- Jakou velikost tetování chcete?");
    expect(meeting).toContain("pick a time here: https://reservio.com/inkoust");
    expect(meeting).toContain("summary for the business owner in Czech");
  });

  it("stays identical within a day so it can be cached", () => {
    expect(buildSystemPrompt(knowledge, "2026-10-12")).toBe(buildSystemPrompt(knowledge, "2026-10-12"));
    expect(buildSystemPrompt(knowledge, "2026-10-12")).not.toContain("Current date and time");
  });

  it("uses the business's local time", () => {
    const now = new Date("2026-10-12T22:30:00Z"); // 00:30 on the 13th in Prague
    expect(localDate(now, "Europe/Prague")).toBe("2026-10-13");
    expect(formatNow(now, "Europe/Prague")).toBe("Tuesday, 13 October 2026 at 00:30");
  });
});
