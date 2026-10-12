"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

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
