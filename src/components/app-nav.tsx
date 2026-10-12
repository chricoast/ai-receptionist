"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { buttonClass, cn } from "./ui";

const LINKS = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/settings", key: "settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("main")} className="-mx-1 flex w-full gap-1 sm:w-auto">
      {LINKS.map(({ href, key }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(buttonClass("ghost", "px-3"), active && "bg-stone-100 text-stone-900")}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
