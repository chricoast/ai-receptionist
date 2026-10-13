"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { SECTIONS } from "@/lib/profile/constants";
import { cn } from "./ui";

export function SettingsTabs() {
  const pathname = usePathname();
  const t = useTranslations("onboarding.steps");
  const tw = useTranslations("settings.widget");
  const tabs = [
    ...SECTIONS.map((section) => ({ href: `/settings/${section}`, label: t(section) })),
    { href: "/settings/widget", label: tw("tab") },
  ];
  return (
    <nav className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1.5">
        {tabs.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center rounded-xl px-3.5 text-sm",
                  active ? "bg-ink font-semibold text-white" : "bg-white text-ink hover:bg-neutral-200",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
