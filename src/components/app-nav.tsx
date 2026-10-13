"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "./ui";

const LINKS = [
  { href: "/dashboard", key: "dashboard", icon: "M3 9l7-6 7 6v8H3z" },
  { href: "/inbox", key: "inbox", icon: "M3 5h14v10H3zM3 5l7 6 7-6" },
  { href: "/leads", key: "leads", icon: "M4 4h12v12H4zM7 8h6M7 11h4" },
  { href: "/settings", key: "settings", icon: "M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18" },
] as const;

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/**
 * Main menu: a side menu on computers, a tab bar at the bottom on phones.
 * `waiting` = conversations that need the team (shown as a pink badge).
 */
export function AppNav({ variant, waiting }: { variant: "side" | "bottom"; waiting: number }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "side") {
    return (
      <nav aria-label={t("main")} className="flex flex-col gap-1">
        {LINKS.map(({ href, key, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-[15px] transition-colors",
                active ? "bg-white font-bold text-ink" : "text-neutral-800 hover:bg-white/60",
              )}
            >
              <Icon d={icon} />
              <span className="flex-1">{t(key)}</span>
              {key === "inbox" && waiting > 0 ? (
                <span className="rounded-full bg-pink px-2 text-[13px] font-bold text-ink">{waiting}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label={t("main")}
      className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-3xl bg-ink p-1.5 shadow-lg lg:hidden"
    >
      {LINKS.map(({ href, key, icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px]",
              active ? "bg-lime font-bold text-ink" : "text-white",
            )}
          >
            <Icon d={icon} />
            {t(key)}
            {key === "inbox" && waiting > 0 ? (
              <span className="absolute right-2 top-1 rounded-full bg-pink px-1.5 text-[11px] font-bold leading-4 text-ink">
                {waiting}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
