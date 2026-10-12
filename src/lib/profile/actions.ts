"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { CUSTOMER_LANGUAGES, nextStep, type FormMode, type FormState, type Section } from "./constants";
import {
  assistantSchema,
  basicsSchema,
  contactSchema,
  faqsSchema,
  hoursSchema,
  servicesSchema,
} from "./schemas";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ListTable = "services" | "opening_hours" | "opening_hour_exceptions" | "faqs" | "rules";

function getMode(formData: FormData): FormMode {
  return formData.get("mode") === "onboarding" ? "onboarding" : "settings";
}

/**
 * Every form sends its data as one JSON field called "payload". The forms keep
 * their values in React state, so nothing typed is lost if a save fails.
 */
function getPayload(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return undefined;
  }
}

function invalid(error: ZodError): FormState {
  return { status: "error", error: "invalid", field: error.issues[0]?.path.join(".") };
}

/** The current business, if the logged-in user is allowed to edit it. */
async function getEditableBusiness() {
  const current = await getCurrentBusiness();
  if (!current || current.role !== "owner") return null;
  return current.business;
}

/**
 * Saves a list (services, FAQs, …) so the database ends up matching exactly
 * what the owner submitted: add/update the submitted rows, then delete the rest.
 * Row Level Security makes sure only this business's rows can be touched.
 */
async function replaceList(
  supabase: Supabase,
  table: ListTable,
  businessId: string,
  rows: Array<{ id: string } & Record<string, unknown>>,
) {
  if (rows.length > 0) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.map((row) => ({ ...row, business_id: businessId })) as never);
    if (error) throw error;
  }
  let remove = supabase.from(table).delete().eq("business_id", businessId);
  if (rows.length > 0) remove = remove.not("id", "in", `(${rows.map((r) => r.id).join(",")})`);
  const { error } = await remove;
  if (error) throw error;
}

/** After a successful save: move to the next onboarding step, or confirm. */
async function finish(mode: FormMode, section: Section, businessId: string): Promise<FormState> {
  revalidatePath("/", "layout");
  if (mode === "onboarding") {
    const next = nextStep(section);
    const supabase = await createClient();
    await supabase
      .from("businesses")
      .update(
        next === "done"
          ? { onboarding_step: "done", onboarding_completed_at: new Date().toISOString() }
          : { onboarding_step: next },
      )
      .eq("id", businessId);
    redirect(`/onboarding/${next}`);
  }
  return { status: "saved", at: Date.now() };
}

export async function saveBasics(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = basicsSchema.safeParse(getPayload(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  // Keep a stable order: the first language is the main one.
  const languages = CUSTOMER_LANGUAGES.filter((l) => input.languages.includes(l));

  const current = await getCurrentBusiness();
  if (current && current.role !== "owner") return { status: "error", error: "notOwner" };

  const supabase = await createClient();
  let businessId = current?.business.id ?? "";
  try {
    if (!businessId) {
      const { data, error } = await supabase.rpc("create_business", {
        p_name: input.name,
        p_type: input.type,
        p_languages: languages,
      });
      if (error) {
        if (error.code === "54000") return { status: "error", error: "tooManyBusinesses" };
        throw error;
      }
      businessId = data;
    }
    const { error } = await supabase
      .from("businesses")
      .update({ name: input.name, type: input.type, languages, description: input.description })
      .eq("id", businessId);
    if (error) throw error;
  } catch (error) {
    console.error("saveBasics failed", error);
    return { status: "error", error: "saveFailed" };
  }
  return finish(getMode(formData), "basics", businessId);
}

export async function saveContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(getPayload(formData));
  if (!parsed.success) return invalid(parsed.error);

  const business = await getEditableBusiness();
  if (!business) return { status: "error", error: "notOwner" };

  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update(parsed.data).eq("id", business.id);
  if (error) {
    console.error("saveContact failed", error);
    return { status: "error", error: "saveFailed" };
  }
  return finish(getMode(formData), "contact", business.id);
}

export async function saveServices(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = servicesSchema.safeParse(getPayload(formData));
  if (!parsed.success) return invalid(parsed.error);

  const business = await getEditableBusiness();
  if (!business) return { status: "error", error: "notOwner" };

  const supabase = await createClient();
  try {
    await replaceList(
      supabase,
      "services",
      business.id,
      parsed.data.services.map((s, position) => ({ ...s, position })),
    );
  } catch (error) {
    console.error("saveServices failed", error);
    return { status: "error", error: "saveFailed" };
  }
  return finish(getMode(formData), "services", business.id);
}

export async function saveHours(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = hoursSchema.safeParse(getPayload(formData));
  if (!parsed.success) return invalid(parsed.error);

  const business = await getEditableBusiness();
  if (!business) return { status: "error", error: "notOwner" };

  const supabase = await createClient();
  try {
    await replaceList(supabase, "opening_hours", business.id, parsed.data.hours);
    await replaceList(
      supabase,
      "opening_hour_exceptions",
      business.id,
      parsed.data.exceptions.map((e) =>
        e.closed ? { ...e, opens_at: null, closes_at: null } : e,
      ),
    );
  } catch (error) {
    console.error("saveHours failed", error);
    return { status: "error", error: "saveFailed" };
  }
  return finish(getMode(formData), "hours", business.id);
}

export async function saveFaqs(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = faqsSchema.safeParse(getPayload(formData));
  if (!parsed.success) return invalid(parsed.error);

  const business = await getEditableBusiness();
  if (!business) return { status: "error", error: "notOwner" };

  const supabase = await createClient();
  try {
    await replaceList(
      supabase,
      "faqs",
      business.id,
      parsed.data.faqs.map((f, position) => ({ ...f, position })),
    );
  } catch (error) {
    console.error("saveFaqs failed", error);
    return { status: "error", error: "saveFailed" };
  }
  return finish(getMode(formData), "faqs", business.id);
}

export async function saveAssistant(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = assistantSchema.safeParse(getPayload(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { rules, ...settings } = parsed.data;

  const business = await getEditableBusiness();
  if (!business) return { status: "error", error: "notOwner" };

  const supabase = await createClient();
  try {
    const { error } = await supabase.from("businesses").update(settings).eq("id", business.id);
    if (error) throw error;
    await replaceList(
      supabase,
      "rules",
      business.id,
      rules.map((r, position) => ({ ...r, position })),
    );
  } catch (error) {
    console.error("saveAssistant failed", error);
    return { status: "error", error: "saveFailed" };
  }
  return finish(getMode(formData), "assistant", business.id);
}
