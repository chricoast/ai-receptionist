"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { buttonClass } from "./ui";

export function SubmitButton({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("common");
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", className)}>
      {pending ? t("saving") : children}
    </button>
  );
}
