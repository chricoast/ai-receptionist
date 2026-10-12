"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field, Input } from "@/components/ui";
import type { BusinessRow } from "@/lib/database.types";
import { saveContact } from "@/lib/profile/actions";
import type { FormMode } from "@/lib/profile/constants";
import { ProfileForm } from "./profile-form";

export function ContactForm({
  business,
  mode,
  readOnly,
}: {
  business: BusinessRow;
  mode: FormMode;
  readOnly?: boolean;
}) {
  const t = useTranslations();
  const [values, setValues] = useState({
    address: business.address,
    phone: business.phone,
    email: business.email,
    website: business.website,
    booking_url: business.booking_url,
  });
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));
  const optional = t("common.optional");

  return (
    <ProfileForm section="contact" mode={mode} action={saveContact} payload={values} readOnly={readOnly}>
      <Field label={t("sections.contact.bookingUrl")} hint={t("sections.contact.bookingUrlHint")} optional={optional} htmlFor="booking_url">
        <Input
          id="booking_url"
          inputMode="url"
          autoCapitalize="none"
          maxLength={500}
          placeholder="https://"
          value={values.booking_url}
          onChange={(e) => set({ booking_url: e.target.value })}
        />
      </Field>
      <Field label={t("sections.contact.address")} optional={optional} htmlFor="address">
        <Input
          id="address"
          maxLength={300}
          autoComplete="street-address"
          value={values.address}
          onChange={(e) => set({ address: e.target.value })}
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t("sections.contact.phone")} optional={optional} htmlFor="phone">
          <Input
            id="phone"
            type="tel"
            maxLength={50}
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
        <Field label={t("sections.contact.email")} optional={optional} htmlFor="email">
          <Input
            id="email"
            type="email"
            maxLength={200}
            value={values.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t("sections.contact.website")} optional={optional} htmlFor="website">
        <Input
          id="website"
          inputMode="url"
          autoCapitalize="none"
          maxLength={300}
          placeholder="https://"
          value={values.website}
          onChange={(e) => set({ website: e.target.value })}
        />
      </Field>
    </ProfileForm>
  );
}
