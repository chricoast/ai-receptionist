import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static files, images and the public chat widget
    // (its visitors are never logged in).
    "/((?!_next/static|_next/image|favicon.ico|widget|api/widget|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js)$).*)",
  ],
};
