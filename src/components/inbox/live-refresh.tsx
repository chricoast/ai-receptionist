"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { INBOX } from "@/config/app";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps an inbox page up to date: when a conversation or message of this
 * business changes, the page re-renders with fresh data. Uses Supabase
 * Realtime (Row Level Security still applies), with a slow periodic refresh as
 * a fallback in case live updates are unavailable.
 */
export function LiveRefresh({ businessId }: { businessId: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };

    const supabase = createClient();
    const channel = supabase
      .channel(`inbox:${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter: `business_id=eq.${businessId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `business_id=eq.${businessId}` }, refresh)
      .subscribe();

    const fallback = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, INBOX.fallbackRefreshMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [businessId, router]);

  return null;
}
