import "server-only";
import type { ContactRow, ConversationRow } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type Lead = Pick<ConversationRow, "id" | "summary" | "lead_at" | "status" | "is_test"> & {
  contact: Pick<ContactRow, "name" | "phone" | "email"> | null;
};

/** Latest enquiries (conversations with a summary), newest first. */
export async function getLeads(businessId: string, limit = 10): Promise<Lead[]> {
  const supabase = await createClient();
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, summary, lead_at, status, is_test, contact_id")
    .eq("business_id", businessId)
    .not("lead_at", "is", null)
    .order("lead_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!conversations.length) return [];
  const { data: contacts, error: cError } = await supabase
    .from("contacts")
    .select("id, name, phone, email")
    .in("id", conversations.map((c) => c.contact_id));
  if (cError) throw cError;
  return conversations.map(({ contact_id, ...c }) => ({
    ...c,
    contact: contacts.find((x) => x.id === contact_id) ?? null,
  }));
}
