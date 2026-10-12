import { describe, expect, it } from "vitest";
import { nextStep, SECTIONS } from "@/lib/profile/constants";
import {
  basicsSchema,
  contactSchema,
  hoursSchema,
  servicesSchema,
} from "@/lib/profile/schemas";
import { getSuggestions } from "@/lib/profile/suggestions";
import { parseAmount } from "@/lib/profile/amount";
import { safeNextPath } from "@/lib/safe-next";

const id = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("onboarding order", () => {
  it("walks through every section and ends with done", () => {
    expect(SECTIONS.map(nextStep)).toEqual(["contact", "services", "hours", "faqs", "assistant", "done"]);
  });
});

describe("validation", () => {
  it("requires a name and at least one language", () => {
    expect(basicsSchema.safeParse({ name: " ", type: "cafe", languages: ["cs"], description: "" }).success).toBe(false);
    expect(basicsSchema.safeParse({ name: "Café", type: "cafe", languages: [], description: "" }).success).toBe(false);
    expect(basicsSchema.safeParse({ name: "Café", type: "cafe", languages: ["cs"], description: "" }).success).toBe(true);
  });

  it("rejects unknown business types and languages", () => {
    expect(basicsSchema.safeParse({ name: "X", type: "casino", languages: ["cs"], description: "" }).success).toBe(false);
    expect(basicsSchema.safeParse({ name: "X", type: "cafe", languages: ["xx"], description: "" }).success).toBe(false);
  });

  it("adds https:// to web addresses and rejects other schemes", () => {
    const base = { address: "", phone: "", email: "", website: "" };
    const ok = contactSchema.parse({ ...base, booking_url: "reservio.com/kavarna" });
    expect(ok.booking_url).toBe("https://reservio.com/kavarna");
    expect(contactSchema.parse({ ...base, booking_url: "" }).booking_url).toBe("");
    expect(contactSchema.safeParse({ ...base, booking_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects a price range that ends below its start", () => {
    const service = {
      id,
      name: "Cut",
      description: "",
      price_from: 500,
      price_to: 300,
      currency: "CZK",
      price_note: "",
      duration_minutes: 30,
      active: true,
    };
    expect(servicesSchema.safeParse({ services: [service] }).success).toBe(false);
    expect(servicesSchema.safeParse({ services: [{ ...service, price_to: 800 }] }).success).toBe(true);
    expect(servicesSchema.safeParse({ services: [{ ...service, price_from: null, price_to: null }] }).success).toBe(true);
  });

  it("accepts opening hours, including after midnight, but not zero-length ones", () => {
    const parse = (opens_at: string, closes_at: string) =>
      hoursSchema.safeParse({ hours: [{ id, weekday: 5, opens_at, closes_at }], exceptions: [] }).success;
    expect(parse("09:00", "17:00")).toBe(true);
    expect(parse("18:00", "02:00")).toBe(true);
    expect(parse("09:00", "09:00")).toBe(false);
    expect(parse("25:00", "26:00")).toBe(false);
  });

  it("needs times for a special day that is not closed", () => {
    const parse = (closed: boolean, opens_at: string | null, closes_at: string | null) =>
      hoursSchema.safeParse({
        hours: [],
        exceptions: [{ id, date: "2026-12-24", closed, opens_at, closes_at, note: "" }],
      }).success;
    expect(parse(true, null, null)).toBe(true);
    expect(parse(false, null, null)).toBe(false);
    expect(parse(false, "10:00", "14:00")).toBe(true);
  });
});

describe("more validation", () => {
  const base = { address: "", phone: "", email: "", website: "" };
  const url = (booking_url: string) => contactSchema.safeParse({ ...base, booking_url });

  it("rejects strange web addresses and enforces the stored length", () => {
    expect(url("ftp://x.cz").success).toBe(false);
    expect(url("my site.cz").success).toBe(false);
    expect(url("HTTP://Example.com").success && contactSchema.parse({ ...base, booking_url: "HTTP://Example.com" }).booking_url).toBe(
      "http://Example.com",
    );
    expect(url(`${"a".repeat(491)}.cz`).success).toBe(false); // 500 chars only after adding https://
  });

  it("keeps the language order (first = main) and rejects duplicates", () => {
    const parse = (languages: string[]) =>
      basicsSchema.safeParse({ name: "X", type: "cafe", languages, description: "" });
    expect(parse(["en", "cs"]).success && basicsSchema.parse({ name: "X", type: "cafe", languages: ["en", "cs"], description: "" }).languages).toEqual(["en", "cs"]);
    expect(parse(["cs", "cs"]).success).toBe(false);
  });

  it("rejects overlapping time ranges on one day and duplicate special days", () => {
    const hours = (ranges: Array<[string, string]>, weekday = 1) => ({
      hours: ranges.map(([opens_at, closes_at], i) => ({
        id: `6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4${i}`,
        weekday,
        opens_at,
        closes_at,
      })),
      exceptions: [],
    });
    expect(hoursSchema.safeParse(hours([["09:00", "12:00"], ["13:00", "18:00"]])).success).toBe(true);
    expect(hoursSchema.safeParse(hours([["09:00", "17:00"], ["13:00", "18:00"]])).success).toBe(false);
    expect(hoursSchema.safeParse(hours([["18:00", "02:00"], ["20:00", "23:00"]])).success).toBe(false);
    const day = (id: string) => ({ id, date: "2026-12-24", closed: true, opens_at: null, closes_at: null, note: "" });
    expect(
      hoursSchema.safeParse({
        hours: [],
        exceptions: [day("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a41"), day("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a42")],
      }).success,
    ).toBe(false);
  });

  it("reads prices typed the Czech way", () => {
    expect(parseAmount("1 250,50")).toBe(1250.5);
    expect(parseAmount("450")).toBe(450);
    expect(parseAmount("1250.5")).toBe(1250.5);
    expect(parseAmount("")).toBe(null);
    expect(parseAmount("od 500")).toBe("od 500");
    expect(parseAmount("-5")).toBe("-5");
  });
});

describe("suggestions", () => {
  it("are given in the business's main language and never include prices", () => {
    const cs = getSuggestions("tattoo", "cs");
    const en = getSuggestions("tattoo", "en");
    expect(cs.services).toContain("Tetování na míru");
    expect(en.services).toContain("Custom tattoo");
    expect([...cs.services, ...en.services].some((s) => /\d/.test(s))).toBe(false);
  });

  it("fall back to generic ones for unknown types", () => {
    expect(getSuggestions("unknown", "cs").faqs.length).toBeGreaterThan(0);
  });
});

describe("redirect safety", () => {
  it("only allows paths on our own site", () => {
    expect(safeNextPath("/settings/faqs")).toBe("/settings/faqs");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("/\t/evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\n/evil.example")).toBe("/dashboard");
    expect(safeNextPath("/%09/evil.example")).toBe("/%09/evil.example");
    expect(safeNextPath("/settings?tab=1")).toBe("/settings?tab=1");
  });
});
