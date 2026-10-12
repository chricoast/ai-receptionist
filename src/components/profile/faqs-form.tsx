"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Chip, Field, Input, Textarea } from "@/components/ui";
import type { FaqRow } from "@/lib/database.types";
import { saveFaqs } from "@/lib/profile/actions";
import type { FormMode } from "@/lib/profile/constants";
import { newId, ProfileForm } from "./profile-form";

type Item = { id: string; question: string; answer: string };

export function FaqsForm({
  faqs,
  suggestions,
  mode,
  readOnly,
}: {
  faqs: FaqRow[];
  suggestions: string[];
  mode: FormMode;
  readOnly?: boolean;
}) {
  const t = useTranslations("sections.faqs");
  const common = useTranslations("common");
  const [items, setItems] = useState<Item[]>(() =>
    faqs.map(({ id, question, answer }) => ({ id, question, answer })),
  );
  const [focusId, setFocusId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const remove = (id: string) => setItems((list) => list.filter((item) => item.id !== id));
  const add = (question = "") => {
    const item = { id: newId(), question, answer: "" };
    setItems((list) => [...list, item]);
    setFocusId(item.id);
  };

  const used = new Set(items.map((i) => i.question.trim().toLowerCase()));
  const openSuggestions = suggestions.filter((s) => !used.has(s.toLowerCase()));

  return (
    <ProfileForm section="faqs" mode={mode} action={saveFaqs} payload={{ faqs: items }} readOnly={readOnly}>
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
        {items.map((item) => (
          <Card key={item.id} className="space-y-4">
            <div className="flex items-start gap-3">
              <Field label={t("question")} htmlFor={`q-${item.id}`} className="flex-1">
                <Input
                  id={`q-${item.id}`}
                  required
                  maxLength={500}
                  value={item.question}
                  autoFocus={focusId === item.id && item.question === ""}
                  onChange={(e) => update(item.id, { question: e.target.value })}
                />
              </Field>
              <Button
                variant="danger"
                className="mt-6"
                aria-label={common("removeItem", { item: item.question || t("question") })}
                onClick={() => remove(item.id)}
              >
                {common("remove")}
              </Button>
            </div>
            <Field label={t("answer")} htmlFor={`a-${item.id}`}>
              <Textarea
                id={`a-${item.id}`}
                required
                rows={3}
                maxLength={2000}
                value={item.answer}
                autoFocus={focusId === item.id && item.question !== ""}
                onChange={(e) => update(item.id, { answer: e.target.value })}
              />
            </Field>
          </Card>
        ))}
      </div>

      {readOnly ? null : (
        <Button variant="secondary" onClick={() => add()}>
          + {t("addFaq")}
        </Button>
      )}
    </ProfileForm>
  );
}
