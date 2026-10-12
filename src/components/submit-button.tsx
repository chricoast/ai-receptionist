"use client";

import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { buttonClass } from "./ui";

export function SubmitButton({
  children,
  className,
  pending: pendingProp,
}: {
  children: ReactNode;
  className?: string;
  /** Pass when the form submits through startTransition instead of `action`. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  const t = useTranslations("common");
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", className)}>
      {pending ? t("saving") : children}
    </button>
  );
}
