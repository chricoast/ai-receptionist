import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { getSupabaseEnv } from "./env";

/** Pages that require being logged in. */
const PROTECTED_PREFIXES = ["/dashboard", "/inbox", "/leads", "/summary", "/conversations", "/onboarding", "/settings", "/reset-password"];
/** Pages that make no sense once logged in. */
const AUTH_PAGES = ["/login", "/signup"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Runs before every page: keeps the login session fresh (Supabase sessions
 * expire and are renewed through cookies) and redirects based on login state.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not put code between createServerClient and getClaims: it validates the
  // session and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = "";
    if (path === "/login") target.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "cache-control") redirect.headers.set(key, value);
    });
    return redirect;
  };

  // Only redirect page loads. Form saves (Server Actions) are POST requests to
  // the same URL; redirecting those would break them. They check the login
  // themselves and send the user to /login properly.
  const isPageLoad = request.method === "GET" || request.method === "HEAD";
  if (isPageLoad && !isLoggedIn && matches(pathname, PROTECTED_PREFIXES)) return redirectTo("/login");
  if (isPageLoad && isLoggedIn && matches(pathname, AUTH_PAGES)) return redirectTo("/dashboard");

  return response;
}
