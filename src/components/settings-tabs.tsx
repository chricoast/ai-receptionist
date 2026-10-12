"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { SECTIONS } from "@/lib/profile/constants";
import { cn } from "./ui";

export function SettingsTabs() {
  const pathname = usePathname();
  const t = useTranslations("onboarding.steps");
  return (
    <nav className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-stone-200">
        {SECTIONS.map((section) => {
          const href = `/settings/${section}`;
          const active = pathname === href;
          return (
            <li key={section}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 px-3 py-2.5 text-sm font-medium",
                  active ? "border-brand-600 text-brand-700" : "border-transparent text-stone-600 hover:text-stone-900",
                )}
              >
                {t(section)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
