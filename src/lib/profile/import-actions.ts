"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { draftProfileFromWebsite, type WebsiteImportResult } from "@/lib/ai/website";

const input = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.url({ protocol: /^https?$/, hostname: z.regexes.domain })),
  language: z.enum(["cs", "en"]),
});

/** "Fill in from website": a logged-in owner gets a draft to review, nothing is saved. */
export async function importFromWebsite(
  url: string,
  language: string,
): Promise<WebsiteImportResult | { ok: false; error: "invalid_url" }> {
  await requireUser();
  const parsed = input.safeParse({ url, language });
  if (!parsed.success) return { ok: false, error: "invalid_url" };
  return draftProfileFromWebsite(parsed.data.url, parsed.data.language);
}
