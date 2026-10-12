"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field, Input, Select, Textarea } from "@/components/ui";
import type { BusinessRow } from "@/lib/database.types";
import { saveBasics } from "@/lib/profile/actions";
import { BUSINESS_TYPES, CUSTOMER_LANGUAGES, type FormMode } from "@/lib/profile/constants";
import { ProfileForm } from "./profile-form";

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
  const [values, setValues] = useState({
    name: business?.name ?? "",
    type: business?.type ?? "",
    languages: business?.languages ?? ["cs"],
    description: business?.description ?? "",
  });
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));

  // The first language in the list is the main one; new ones go to the end.
  const toggleLanguage = (lang: string, on: boolean) =>
    set({ languages: on ? [...values.languages, lang] : values.languages.filter((l) => l !== lang) });
  const setMainLanguage = (lang: string) =>
    set({ languages: [lang, ...values.languages.filter((l) => l !== lang)] });

  return (
    <ProfileForm section="basics" mode={mode} action={saveBasics} payload={values} readOnly={readOnly}>
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

      <Field label={t("sections.basics.type")} htmlFor="type">
        <Select id="type" required value={values.type} onChange={(e) => set({ type: e.target.value })}>
          <option value="" disabled>
            {t("sections.basics.typePlaceholder")}
          </option>
          {BUSINESS_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`businessTypes.${type}`)}
            </option>
          ))}
        </Select>
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

      <Field
        label={t("sections.basics.description")}
        hint={t("sections.basics.descriptionHint")}
        optional={t("common.optional")}
        htmlFor="description"
      >
        <Textarea
          id="description"
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
