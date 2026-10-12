"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Chip, Field, Input, Select, Textarea } from "@/components/ui";
import type { ServiceRow } from "@/lib/database.types";
import { saveServices } from "@/lib/profile/actions";
import { CURRENCIES, type FormMode } from "@/lib/profile/constants";
import { newId, ProfileForm } from "./profile-form";

type Item = {
  id: string;
  name: string;
  description: string;
  price_from: string;
  price_to: string;
  currency: string;
  price_note: string;
  duration_minutes: string;
  active: boolean;
};

const toText = (n: number | null) => (n === null ? "" : String(n));
const toNumber = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

const blank = (name = ""): Item => ({
  id: newId(),
  name,
  description: "",
  price_from: "",
  price_to: "",
  currency: "CZK",
  price_note: "",
  duration_minutes: "",
  active: true,
});

export function ServicesForm({
  services,
  suggestions,
  mode,
  readOnly,
}: {
  services: ServiceRow[];
  suggestions: string[];
  mode: FormMode;
  readOnly?: boolean;
}) {
  const t = useTranslations("sections.services");
  const common = useTranslations("common");
  const [items, setItems] = useState<Item[]>(() =>
    services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price_from: toText(s.price_from),
      price_to: toText(s.price_to),
      currency: s.currency,
      price_note: s.price_note,
      duration_minutes: toText(s.duration_minutes),
      active: s.active,
    })),
  );

  const update = (id: string, patch: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const remove = (id: string) => setItems((list) => list.filter((item) => item.id !== id));
  const add = (name?: string) => setItems((list) => [...list, blank(name)]);

  const payload = {
    services: items.map((item) => ({
      ...item,
      price_from: toNumber(item.price_from),
      price_to: toNumber(item.price_to),
      duration_minutes: toNumber(item.duration_minutes),
    })),
  };

  const used = new Set(items.map((i) => i.name.trim().toLowerCase()));
  const openSuggestions = suggestions.filter((s) => !used.has(s.toLowerCase()));

  return (
    <ProfileForm section="services" mode={mode} action={saveServices} payload={payload} readOnly={readOnly}>
      {!readOnly && openSuggestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">{t("suggestions")}</p>
          <div className="flex flex-wrap gap-2">
            {openSuggestions.map((s) => (
              <Chip key={s} onClick={() => add(s)}>
                + {s}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {items.length === 0 ? <p className="text-stone-500">{t("empty")}</p> : null}

      <div className="space-y-4">
        {items.map((item, index) => (
          <Card key={item.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <Field label={t("name")} htmlFor={`name-${item.id}`} className="flex-1">
                <Input
                  id={`name-${item.id}`}
                  required
                  maxLength={120}
                  value={item.name}
                  onChange={(e) => update(item.id, { name: e.target.value })}
                  autoFocus={index === items.length - 1 && item.name === ""}
                />
              </Field>
              <Button variant="danger" className="mt-6" onClick={() => remove(item.id)}>
                {common("remove")}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label={t("priceFrom")} htmlFor={`pf-${item.id}`}>
                <Input
                  id={`pf-${item.id}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={item.price_from}
                  onChange={(e) => update(item.id, { price_from: e.target.value })}
                />
              </Field>
              <Field label={t("priceTo")} htmlFor={`pt-${item.id}`}>
                <Input
                  id={`pt-${item.id}`}
                  type="number"
                  inputMode="decimal"
                  min={item.price_from || 0}
                  step="any"
                  value={item.price_to}
                  onChange={(e) => update(item.id, { price_to: e.target.value })}
                />
              </Field>
              <Field label={t("currency")} htmlFor={`cur-${item.id}`}>
                <Select
                  id={`cur-${item.id}`}
                  value={item.currency}
                  onChange={(e) => update(item.id, { currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("duration")} htmlFor={`dur-${item.id}`}>
                <Input
                  id={`dur-${item.id}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1440}
                  step={1}
                  value={item.duration_minutes}
                  onChange={(e) => update(item.id, { duration_minutes: e.target.value })}
                />
              </Field>
            </div>
            <p className="-mt-2 text-sm text-stone-500">{t("priceHint")}</p>

            <Field label={t("priceNote")} optional={common("optional")} htmlFor={`pn-${item.id}`}>
              <Input
                id={`pn-${item.id}`}
                maxLength={200}
                placeholder={t("priceNotePlaceholder")}
                value={item.price_note}
                onChange={(e) => update(item.id, { price_note: e.target.value })}
              />
            </Field>
            <Field label={t("description")} optional={common("optional")} htmlFor={`desc-${item.id}`}>
              <Textarea
                id={`desc-${item.id}`}
                rows={2}
                className="min-h-0"
                maxLength={1000}
                value={item.description}
                onChange={(e) => update(item.id, { description: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="size-4 accent-brand-600"
                checked={item.active}
                onChange={(e) => update(item.id, { active: e.target.checked })}
              />
              {t("active")}
            </label>
          </Card>
        ))}
      </div>

      {readOnly ? null : (
        <Button variant="secondary" onClick={() => add()}>
          + {t("addService")}
        </Button>
      )}
    </ProfileForm>
  );
}
