"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { widgetThemeSchema } from "./theme";

/** Owner switches the website chat on or off. */
export async function setWidgetEnabled(formData: FormData) {
  const current = await getCurrentBusiness();
  if (!current || current.role !== "owner") return;
  const supabase = await createClient();
  await supabase
    .from("channels")
    .update({ enabled: formData.get("enabled") === "true" })
    .eq("business_id", current.business.id)
    .eq("type", "web_chat");
  revalidatePath("/settings/widget");
  revalidatePath("/dashboard");
}

export type AppearanceState = { status: "idle" | "saved" | "error"; at?: number };

/** Owner saves the website chat's look (colour, corners, font). */
export async function saveWidgetAppearance(theme: unknown): Promise<AppearanceState> {
  const parsed = widgetThemeSchema.safeParse(theme);
  const current = await getCurrentBusiness();
  if (!parsed.success || !current || current.role !== "owner") return { status: "error", at: Date.now() };
  const supabase = await createClient();
  const { error } = await supabase
    .from("channels")
    .update({ appearance: parsed.data })
    .eq("business_id", current.business.id)
    .eq("type", "web_chat");
  if (error) {
    console.error("saveWidgetAppearance failed", error);
    return { status: "error", at: Date.now() };
  }
  revalidatePath("/settings/widget");
  return { status: "saved", at: Date.now() };
}
