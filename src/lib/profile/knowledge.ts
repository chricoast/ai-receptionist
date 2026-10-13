import "server-only";
import { crawlWebsite } from "@/lib/ai/website";
import { createClient } from "@/lib/supabase/server";

export type KnowledgeSummary = {
  enabled: boolean;
  count: number;
  fetchedAt: string | null;
  pages: { url: string; title: string }[];
};

/** What the receptionist currently knows from the website (for settings). */
export async function getKnowledgeSummary(businessId: string, enabled: boolean): Promise<KnowledgeSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("knowledge_pages")
    .select("url, title, fetched_at")
    .eq("business_id", businessId)
    .order("url");
  if (error) throw error;
  return {
    enabled,
    count: data.length,
    fetchedAt: data[0]?.fetched_at ?? null,
    pages: data.map(({ url, title }) => ({ url, title })),
  };
}

/**
 * Reads the website and replaces the stored pages. Runs as the logged-in owner,
 * so Row Level Security still decides what may be written.
 */
export async function storeWebsiteKnowledge(businessId: string, website: string): Promise<number> {
  const pages = await crawlWebsite(website);
  if (pages.length === 0) return 0;
  const supabase = await createClient();
  const { error: deleteError } = await supabase.from("knowledge_pages").delete().eq("business_id", businessId);
  if (deleteError) throw deleteError;
  const { error } = await supabase
    .from("knowledge_pages")
    .insert(pages.map((p) => ({ ...p, business_id: businessId })));
  if (error) throw error;
  return pages.length;
}
