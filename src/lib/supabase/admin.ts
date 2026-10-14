import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client with the SECRET key. It skips Row Level Security, so:
 *  - use it only on the server, only in src/lib/chat (the public chat widget,
 *    whose visitors are not logged in);
 *  - always filter by the business the request was checked against.
 */
export function createAdminClient() {
  // Keys never contain spaces: drop any space or line break pasted along with it.
  const secret = process.env.SUPABASE_SECRET_KEY?.replace(/\s+/g, "");
  if (!secret) throw new Error("Missing SUPABASE_SECRET_KEY (server-only environment variable).");
  return createClient<Database>(getSupabaseEnv().url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
