import "server-only";
import type { CurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

const COLUMNS = "id, business_id, type, public_key, enabled, config, appearance, created_at, updated_at";

/** The business's web chat channel; created on first use (owners only). */
export async function getOrCreateWebChat({ business, role }: CurrentBusiness) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("business_id", business.id)
    .eq("type", "web_chat")
    .maybeSingle();
  if (error) throw error;
  if (data || role !== "owner") return data;

  // Note: during one page render, Next.js reuses the answer of an identical
  // earlier read, so re-running the query above would still return nothing.
  // Take the new row from the insert itself instead.
  const { data: created, error: insertError } = await supabase
    .from("channels")
    .insert({ business_id: business.id, type: "web_chat" })
    .select(COLUMNS)
    .single();
  if (!insertError) return created;
  // 23505 = another request created it a moment ago; read it (different query, not reused).
  if (insertError.code !== "23505") throw insertError;
  const { data: existing, error: readError } = await supabase
    .from("channels")
    .select(COLUMNS)
    .eq("type", "web_chat")
    .eq("business_id", business.id)
    .single();
  if (readError) throw readError;
  return existing;
}
