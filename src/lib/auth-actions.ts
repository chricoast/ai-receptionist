"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";
import { getSiteUrl } from "@/lib/site-url";

export type AuthErrorKey =
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "weakPassword"
  | "rateLimited"
  | "invalidEmail"
  | "userExists"
  | "generic";

export type AuthState =
  | { status: "idle" }
  | { status: "error"; error: AuthErrorKey }
  | { status: "sent"; email: string };

const email = z.email().max(200);
const password = z.string().min(8).max(200);

function toErrorKey(error: AuthError): AuthErrorKey {
  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "weak_password":
      return "weakPassword";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rateLimited";
    case "email_address_invalid":
      return "invalidEmail";
    case "user_already_exists":
    case "email_exists":
      return "userExists";
    default:
      console.error("Auth error", error.code, error.message);
      return "generic";
  }
}

const fail = (error: AuthErrorKey): AuthState => ({ status: "error", error });

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsedEmail = email.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsedEmail.success) return fail("invalidEmail");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsedEmail.data,
    password: String(formData.get("password") ?? ""),
  });
  if (error) return fail(toErrorKey(error));

  redirect(safeNextPath(formData.get("next")));
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsedEmail = email.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsedEmail.success) return fail("invalidEmail");
  const parsedPassword = password.safeParse(String(formData.get("password") ?? ""));
  if (!parsedPassword.success) return fail("weakPassword");

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsedEmail.data,
    password: parsedPassword.data,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding/basics` },
  });
  if (error) return fail(toErrorKey(error));

  // If email confirmation is turned off in Supabase, the user is logged in right away.
  if (data.session) redirect("/onboarding/basics");
  return { status: "sent", email: parsedEmail.data };
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsedEmail = email.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsedEmail.success) return fail("invalidEmail");

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });
  // Don't reveal whether the account exists; only surface rate limiting.
  if (error && toErrorKey(error) === "rateLimited") return fail("rateLimited");
  return { status: "sent", email: parsedEmail.data };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsedPassword = password.safeParse(String(formData.get("password") ?? ""));
  if (!parsedPassword.success) return fail("weakPassword");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsedPassword.data });
  if (error) return fail(toErrorKey(error));

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
