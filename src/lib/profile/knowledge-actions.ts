"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { storeWebsiteKnowledge } from "./knowledge";

export type KnowledgeRefreshResult = { ok: true; count: number } | { ok: false; error: "notOwner" | "noWebsite" | "failed" };

/** "Načíst znovu z webu": re-reads the owner's website now. */
export async function refreshWebsiteKnowledge(): Promise<KnowledgeRefreshResult> {
  const current = await getCurrentBusiness();
  if (!current || current.role !== "owner") return { ok: false, error: "notOwner" };
  if (!current.business.website) return { ok: false, error: "noWebsite" };
  try {
    const count = await storeWebsiteKnowledge(current.business.id, current.business.website);
    revalidatePath("/", "layout");
    return count ? { ok: true, count } : { ok: false, error: "failed" };
  } catch (error) {
    console.error("Website knowledge refresh failed", error);
    return { ok: false, error: "failed" };
  }
}

/** Owner switches "use the whole website" on or off. Switching on reads the website right away. */
export async function setWebsiteKnowledge(enabled: boolean): Promise<KnowledgeRefreshResult> {
  const current = await getCurrentBusiness();
  if (!current || current.role !== "owner") return { ok: false, error: "notOwner" };
  if (enabled && !current.business.website) return { ok: false, error: "noWebsite" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ use_website_knowledge: enabled })
    .eq("id", current.business.id);
  if (error) {
    console.error("Website knowledge switch failed", error);
    return { ok: false, error: "failed" };
  }
  revalidatePath("/", "layout");
  if (!enabled) return { ok: true, count: 0 };
  try {
    const count = await storeWebsiteKnowledge(current.business.id, current.business.website);
    return count ? { ok: true, count } : { ok: false, error: "failed" };
  } catch (e) {
    console.error("Website knowledge refresh failed", e);
    return { ok: false, error: "failed" };
  }
}
