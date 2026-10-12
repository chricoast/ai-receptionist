import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";

/**
 * Landing point for links in Supabase emails (confirm sign-up, reset password).
 * Supports both link styles:
 *  - ?token_hash=…&type=… (works on any device; needs the custom email template)
 *  - ?code=…               (Supabase's default; works in the same browser only)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  const target = request.nextUrl.clone();
  target.search = "";

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    target.pathname = error ? "/auth/error" : next;
    return NextResponse.redirect(target);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      target.pathname = next;
    } else if (next === "/reset-password") {
      target.pathname = "/auth/error";
    } else {
      // A ?code= link means Supabase already confirmed the email; only the
      // automatic login failed (link opened in another browser). Ask to log in.
      target.pathname = "/login";
      target.searchParams.set("confirmed", "1");
    }
    return NextResponse.redirect(target);
  }

  target.pathname = "/auth/error";
  return NextResponse.redirect(target);
}
