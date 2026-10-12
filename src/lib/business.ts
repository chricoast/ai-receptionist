import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { BusinessRow } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type CurrentBusiness = { business: BusinessRow; role: "owner" | "staff" };

/**
 * The business the logged-in user works on. The database supports several
 * businesses per user; for now the UI uses the first one they joined.
 */
export const getCurrentBusiness = cache(async (): Promise<CurrentBusiness | null> => {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership, error } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!membership) return null;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", membership.business_id)
    .single();
  if (businessError) throw businessError;

  return { business, role: membership.role === "owner" ? "owner" : "staff" };
});

export async function requireBusiness(): Promise<CurrentBusiness> {
  const current = await getCurrentBusiness();
  if (!current) redirect("/onboarding/basics");
  return current;
}

/** Loads everything the profile forms need, in parallel. */
export async function getBusinessProfile(businessId: string) {
  const supabase = await createClient();
  const [services, hours, exceptions, faqs, rules] = await Promise.all([
    supabase.from("services").select("*").eq("business_id", businessId).order("position"),
    supabase.from("opening_hours").select("*").eq("business_id", businessId).order("weekday").order("opens_at"),
    supabase.from("opening_hour_exceptions").select("*").eq("business_id", businessId).order("date"),
    supabase.from("faqs").select("*").eq("business_id", businessId).order("position"),
    supabase.from("rules").select("*").eq("business_id", businessId).order("position"),
  ]);
  for (const result of [services, hours, exceptions, faqs, rules]) {
    if (result.error) throw result.error;
  }
  return {
    services: services.data ?? [],
    hours: hours.data ?? [],
    exceptions: exceptions.data ?? [],
    faqs: faqs.data ?? [],
    rules: rules.data ?? [],
  };
}

export type BusinessProfile = Awaited<ReturnType<typeof getBusinessProfile>>;
