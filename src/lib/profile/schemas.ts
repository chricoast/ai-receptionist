import { z } from "zod";
import { BUSINESS_TYPES, CURRENCIES, CUSTOMER_LANGUAGES, TONES } from "./constants";

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);

/**
 * Accepts "", or a web address. "example.com" becomes "https://example.com".
 * The length limit applies after adding "https://" (it's what gets stored).
 */
const optionalUrl = (max: number) =>
  z
    .string()
    .trim()
    .transform((value) => {
      if (!value) return value;
      if (/^https?:\/\//i.test(value)) return value.replace(/^https?/i, (p) => p.toLowerCase());
      return `https://${value}`;
    })
    .pipe(
      z.union([
        z.literal(""),
        z
          .url({ protocol: /^https?$/, hostname: z.regexes.domain })
          .max(max)
          .refine((v) => !/\s/.test(v)),
      ]),
    );

const optionalEmail = z.string().trim().max(200).pipe(z.union([z.literal(""), z.email()]));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/).transform((v) => v.slice(0, 5));
const money = z.number().min(0).max(10_000_000).nullable();

export const basicsSchema = z.object({
  name: requiredText(120),
  type: z.enum(BUSINESS_TYPES),
  // First language = main language (the one business content is written in).
  languages: z
    .array(z.enum(CUSTOMER_LANGUAGES))
    .min(1)
    .refine((l) => new Set(l).size === l.length),
  description: text(2000),
});

export const contactSchema = z.object({
  address: text(300),
  phone: text(50),
  email: optionalEmail,
  website: optionalUrl(300),
  booking_url: optionalUrl(500),
});

export const servicesSchema = z.object({
  services: z
    .array(
      z
        .object({
          id: z.uuid(),
          name: requiredText(120),
          description: text(1000),
          price_from: money,
          price_to: money,
          currency: z.enum(CURRENCIES),
          price_note: text(200),
          duration_minutes: z.number().int().min(1).max(1440).nullable(),
          active: z.boolean(),
        })
        .refine((s) => s.price_from === null || s.price_to === null || s.price_to >= s.price_from, {
          path: ["price_to"],
        }),
    )
    .max(100),
});

/** Minutes since midnight; an end at or before the start means "after midnight". */
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
function overlaps(a: { opens_at: string; closes_at: string }, b: { opens_at: string; closes_at: string }) {
  const span = (x: typeof a) => {
    const start = toMinutes(x.opens_at);
    let end = toMinutes(x.closes_at);
    if (end <= start) end += 24 * 60;
    return [start, end] as const;
  };
  const [s1, e1] = span(a);
  const [s2, e2] = span(b);
  return s1 < e2 && s2 < e1;
}

export const hoursSchema = z.object({
  hours: z
    .array(
      z
        .object({
          id: z.uuid(),
          weekday: z.number().int().min(1).max(7),
          opens_at: time,
          closes_at: time,
        })
        .refine((h) => h.opens_at !== h.closes_at, { path: ["closes_at"] }),
    )
    .max(70)
    .superRefine((hours, ctx) => {
      hours.forEach((h, i) => {
        const clash = hours.findIndex((o, j) => j < i && o.weekday === h.weekday && overlaps(o, h));
        if (clash !== -1) ctx.addIssue({ code: "custom", path: [i, "opens_at"], message: "overlap" });
      });
    }),
  exceptions: z
    .array(
      z
        .object({
          id: z.uuid(),
          date: z.iso.date(),
          closed: z.boolean(),
          opens_at: time.nullable(),
          closes_at: time.nullable(),
          note: text(200),
        })
        .refine((e) => e.closed || (e.opens_at && e.closes_at && e.opens_at !== e.closes_at), {
          path: ["closes_at"],
        }),
    )
    .max(100)
    .superRefine((days, ctx) => {
      days.forEach((d, i) => {
        if (days.findIndex((o) => o.date === d.date) !== i) {
          ctx.addIssue({ code: "custom", path: [i, "date"], message: "duplicate" });
        }
      });
    }),
});

export const faqsSchema = z.object({
  faqs: z
    .array(
      z.object({
        id: z.uuid(),
        question: requiredText(500),
        answer: requiredText(2000),
      }),
    )
    .max(100),
});

export const assistantSchema = z.object({
  tone: z.enum(TONES),
  tone_notes: text(1000),
  approve_replies: z.boolean(),
  rules: z
    .array(
      z.object({
        id: z.uuid(),
        kind: z.enum(["never_answer", "instruction"]),
        content: requiredText(500),
      }),
    )
    .max(100),
});

export type BasicsInput = z.infer<typeof basicsSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ServicesInput = z.infer<typeof servicesSchema>;
export type HoursInput = z.infer<typeof hoursSchema>;
export type FaqsInput = z.infer<typeof faqsSchema>;
export type AssistantInput = z.infer<typeof assistantSchema>;
