"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getSupabaseEnv } from "./env";

/**
 * Supabase in the browser, with the logged-in user's session (from cookies).
 * Only the publishable key is used here; Row Level Security limits what it can see.
 * Used for live updates in the inbox.
 */
export function createClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
