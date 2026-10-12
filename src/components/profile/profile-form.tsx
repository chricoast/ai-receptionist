"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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

/** Database/validation field names → translation keys of their labels. */
const FIELD_LABELS: Record<string, string> = {
  name: "name",
  type: "type",
  languages: "languages",
  description: "description",
  address: "address",
  phone: "phone",
  email: "email",
  website: "website",
  booking_url: "bookingUrl",
  price_from: "priceFrom",
  price_to: "priceTo",
  price_note: "priceNote",
  currency: "currency",
  duration_minutes: "duration",
  question: "question",
  answer: "answer",
  opens_at: "from",
  closes_at: "to",
  date: "date",
  note: "note",
  content: "topic",
  tone: "tone",
  tone_notes: "toneNotes",
};

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
  const [state, formAction, isPending] = useActionState(action, initialFormState);
  const index = SECTIONS.indexOf(section);
  const previous = index > 0 ? SECTIONS[index - 1] : null;

  const json = JSON.stringify(payload);
  // What's in the database right now: the initial values, then each successful save.
  const [savedJson, setSavedJson] = useState(json);
  const submittedJson = useRef(json);
  useEffect(() => {
    if (state.status === "saved") setSavedJson(submittedJson.current);
  }, [state]);
  const dirty = json !== savedJson;

  // Warn before closing or reloading the tab with unsaved edits.
  useEffect(() => {
    if (!dirty || readOnly) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, readOnly]);

  // Submit without React's automatic form reset, which would snap checkboxes
  // and dropdowns back to their initial values after saving.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submittedJson.current = json;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  const describeError = () => {
    if (state.status !== "error") return null;
    if (state.error !== "invalid" || !state.field) return t(`errors.${state.error}`);
    const parts = state.field.split(".");
    const key = parts[parts.length - 1];
    if (section === "hours" && key === "opens_at" && parts[0] === "hours") {
      return t("sections.hours.overlap");
    }
    const labelKey = FIELD_LABELS[key];
    const scoped = `sections.${section}.${labelKey}`;
    const label = labelKey && t.has(scoped as never) ? t(scoped as never) : null;
    if (!label) return t("errors.invalid");
    const row = parts.find((p) => /^\d+$/.test(p));
    const field = row === undefined ? label : t("errors.item", { field: label, n: Number(row) + 1 });
    return t("errors.invalidField", { field });
  };
  const errorText = describeError();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="payload" value={json} />

      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{t(`sections.${section}.title`)}</h1>
        <p className="mt-1 text-stone-600">{t(`sections.${section}.intro`)}</p>
      </div>

      {readOnly ? <Alert tone="info">{t("settings.readOnly")}</Alert> : null}

      <fieldset disabled={readOnly} className="space-y-6">
        {children}
      </fieldset>

      {errorText ? <Alert>{errorText}</Alert> : null}

      {readOnly ? (
        mode === "onboarding" ? <OnboardingNav section={section} /> : null
      ) : (
        <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-stone-200 bg-stone-50/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0">
          {mode === "onboarding" && previous ? (
            <Link href={`/onboarding/${previous}`} className={buttonClass("secondary")}>
              {t("common.back")}
            </Link>
          ) : null}
          <SubmitButton className="flex-1 sm:flex-none" pending={isPending}>
            {mode === "onboarding" ? t("common.continue") : t("common.save")}
          </SubmitButton>
          {mode === "settings" && dirty ? (
            <span role="status" className="text-sm text-stone-600">
              {t("common.unsaved")}
            </span>
          ) : null}
          {mode === "settings" && !dirty && state.status === "saved" ? (
            <span role="status" className="text-sm font-medium text-brand-700">
              ✓ {t("common.saved")}
            </span>
          ) : null}
        </div>
      )}
    </form>
  );
}

/** Staff can look through onboarding but not save, so give them plain links. */
function OnboardingNav({ section }: { section: Section }) {
  const t = useTranslations("common");
  const index = SECTIONS.indexOf(section);
  const previous = index > 0 ? SECTIONS[index - 1] : null;
  const next = SECTIONS[index + 1] ?? "done";
  return (
    <div className="flex gap-3">
      {previous ? (
        <Link href={`/onboarding/${previous}`} className={buttonClass("secondary")}>
          {t("back")}
        </Link>
      ) : null}
      <Link href={`/onboarding/${next}`} className={buttonClass("primary")}>
        {t("continue")}
      </Link>
    </div>
  );
}
