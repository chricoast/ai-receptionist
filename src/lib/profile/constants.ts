/** The parts of the business profile, in onboarding order. */
export const SECTIONS = ["basics", "contact", "services", "hours", "faqs", "assistant"] as const;
export type Section = (typeof SECTIONS)[number];

export function isSection(value: unknown): value is Section {
  return typeof value === "string" && (SECTIONS as readonly string[]).includes(value);
}

/** The step after `section` in onboarding, or "done" after the last one. */
export function nextStep(section: Section): Section | "done" {
  const i = SECTIONS.indexOf(section);
  return SECTIONS[i + 1] ?? "done";
}

export const BUSINESS_TYPES = [
  "salon",
  "barber",
  "clinic",
  "tattoo",
  "studio",
  "cafe",
  "restaurant",
  "service_shop",
  "agency",
  "other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const CUSTOMER_LANGUAGES = ["cs", "en"] as const;
export type CustomerLanguage = (typeof CUSTOMER_LANGUAGES)[number];

export const TONES = ["friendly", "professional", "casual"] as const;
export type Tone = (typeof TONES)[number];

/** ISO weekdays: 1 = Monday … 7 = Sunday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const CURRENCIES = ["CZK", "EUR"] as const;

export type FormMode = "onboarding" | "settings";

export type FormState =
  | { status: "idle" }
  | { status: "saved"; at: number }
  | { status: "error"; error: "invalid" | "notOwner" | "saveFailed" | "tooManyBusinesses"; field?: string };

export const initialFormState: FormState = { status: "idle" };
