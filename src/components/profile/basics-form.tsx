"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { BusinessRow } from "@/lib/database.types";
import { saveBasics } from "@/lib/profile/actions";
import { BUSINESS_TYPES, CUSTOMER_LANGUAGES, type FormMode } from "@/lib/profile/constants";
import { importFromWebsite } from "@/lib/profile/import-actions";
import { ProfileForm } from "./profile-form";

type Found = { address: string; phone: string; email: string; booking_url: string };
type ImportError = "invalid_url" | "fetch_failed" | "nothing_found" | "ai_unavailable";

export function BasicsForm({
  business,
  mode,
  readOnly,
}: {
  business: BusinessRow | null;
  mode: FormMode;
  readOnly?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [values, setValues] = useState({
    name: business?.name ?? "",
    type: business?.type ?? "",
    languages: business?.languages ?? ["cs"],
    description: business?.description ?? "",
    website: business?.website ?? "",
  });
  const [found, setFound] = useState<Found | null>(null);
  const [importState, setImportState] = useState<"idle" | "done" | ImportError>("idle");
  const [importing, startImport] = useTransition();
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  // The first language in the list is the main one; new ones go to the end.
  const toggleLanguage = (lang: string, on: boolean) =>
    set({ languages: on ? [...values.languages, lang] : values.languages.filter((l) => l !== lang) });
  const setMainLanguage = (lang: string) =>
    set({ languages: [lang, ...values.languages.filter((l) => l !== lang)] });

  const runImport = () =>
    startImport(async () => {
      setImportState("idle");
      const result = await importFromWebsite(values.website, locale);
      if (!result.ok) return setImportState(result.error);
      const p = result.profile;
      set({
        type: p.business_type.trim() || values.type,
        description: p.description.trim() || values.description,
      });
      const contacts = { address: p.address, phone: p.phone, email: p.email, booking_url: p.booking_url };
      setFound(Object.values(contacts).some((v) => v.trim()) ? contacts : null);
      setImportState("done");
    });

  return (
    <ProfileForm
      section="basics"
      mode={mode}
      action={saveBasics}
      payload={found ? { ...values, found } : values}
      readOnly={readOnly}
    >
      <div className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <Field label={t("sections.basics.website")} hint={t("sections.basics.websiteHint")} htmlFor="website">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="website"
              inputMode="url"
              autoCapitalize="none"
              maxLength={300}
              placeholder="mujpodnik.cz"
              value={values.website}
              onChange={(e) => set({ website: e.target.value })}
            />
            {readOnly ? null : (
              <Button
                variant="secondary"
                className="shrink-0"
                disabled={importing || !values.website.trim()}
                onClick={runImport}
              >
                {importing ? t("sections.basics.importing") : `✨ ${t("sections.basics.import")}`}
              </Button>
            )}
          </div>
        </Field>
        {importState === "done" ? (
          <Alert tone="success">
            {t("sections.basics.imported")}
            {found ? ` ${t("sections.basics.importedContacts")}` : ""}
          </Alert>
        ) : importState !== "idle" ? (
          <Alert>{t(`sections.basics.importErrors.${importState}`)}</Alert>
        ) : null}
      </div>

      <Field label={t("sections.basics.name")} htmlFor="name">
        <Input
          id="name"
          required
          maxLength={120}
          autoComplete="organization"
          value={values.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>

      <Field label={t("sections.basics.type")} hint={t("sections.basics.typeHint")} htmlFor="type">
        <Input
          id="type"
          required
          maxLength={100}
          list="business-type-ideas"
          placeholder={t("sections.basics.typePlaceholder")}
          value={values.type}
          onChange={(e) => set({ type: e.target.value })}
        />
        <datalist id="business-type-ideas">
          {BUSINESS_TYPES.filter((type) => type !== "other").map((type) => (
            <option key={type} value={t(`businessTypes.${type}`)} />
          ))}
        </datalist>
      </Field>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-stone-800">{t("sections.basics.languages")}</legend>
        <div className="flex flex-wrap gap-3">
          {CUSTOMER_LANGUAGES.map((lang) => {
            const checked = values.languages.includes(lang);
            return (
              <label
                key={lang}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-stone-400 bg-white px-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-brand-600"
                  checked={checked}
                  // At least one language must stay selected.
                  disabled={checked && values.languages.length === 1}
                  onChange={(e) => toggleLanguage(lang, e.target.checked)}
                />
                {t(`common.languageNames.${lang}`)}
              </label>
            );
          })}
        </div>
        <p className="text-sm text-stone-500">{t("sections.basics.languagesHint")}</p>
      </fieldset>

      {values.languages.length > 1 ? (
        <Field
          label={t("sections.basics.mainLanguage")}
          hint={t("sections.basics.mainLanguageHint")}
          htmlFor="main-language"
        >
          <Select id="main-language" value={values.languages[0]} onChange={(e) => setMainLanguage(e.target.value)}>
            {values.languages.map((lang) => (
              <option key={lang} value={lang}>
                {t(`common.languageNames.${lang as "cs"}`)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label={t("sections.basics.description")} hint={t("sections.basics.descriptionHint")} htmlFor="description">
        <Textarea
          id="description"
          required
          rows={4}
          maxLength={2000}
          placeholder={t("sections.basics.descriptionPlaceholder")}
          value={values.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
    </ProfileForm>
  );
}
