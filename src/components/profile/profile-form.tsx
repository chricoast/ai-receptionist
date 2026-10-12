"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/submit-button";
import { Alert, buttonClass } from "@/components/ui";
import {
  initialFormState,
  SECTIONS,
  type FormMode,
  type FormState,
  type Section,
} from "@/lib/profile/constants";

export type SaveAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/** A random id for new rows, also on plain-http test setups without crypto.randomUUID. */
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Shared frame for every profile section: title, save button, messages. */
export function ProfileForm({
  section,
  mode,
  action,
  payload,
  readOnly,
  children,
}: {
  section: Section;
  mode: FormMode;
  action: SaveAction;
  payload: unknown;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations();
  const [state, formAction] = useActionState(action, initialFormState);
  const index = SECTIONS.indexOf(section);
  const previous = index > 0 ? SECTIONS[index - 1] : null;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{t(`sections.${section}.title`)}</h1>
        <p className="mt-1 text-stone-600">{t(`sections.${section}.intro`)}</p>
      </div>

      {readOnly ? <Alert tone="info">{t("settings.readOnly")}</Alert> : null}

      <fieldset disabled={readOnly} className="space-y-6">
        {children}
      </fieldset>

      {state.status === "error" ? <Alert>{t(`errors.${state.error}`)}</Alert> : null}

      {readOnly ? null : (
        <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
          {mode === "onboarding" && previous ? (
            <Link href={`/onboarding/${previous}`} className={buttonClass("secondary")}>
              {t("common.back")}
            </Link>
          ) : null}
          <SubmitButton className="flex-1 sm:flex-none">
            {mode === "onboarding" ? t("common.continue") : t("common.save")}
          </SubmitButton>
          {state.status === "saved" ? (
            <span key={state.at} role="status" className="text-sm font-medium text-brand-700">
              ✓ {t("common.saved")}
            </span>
          ) : null}
        </div>
      )}
    </form>
  );
}
