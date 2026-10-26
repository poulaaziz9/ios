import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next internals, the service worker route, and static files.
    "/((?!_next/static|_next/image|serwist/|manifest.webmanifest|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|txt|wasm|csv)$).*)",
  ],
};
