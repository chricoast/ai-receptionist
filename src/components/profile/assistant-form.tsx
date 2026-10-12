"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip, Field, Input, Textarea } from "@/components/ui";
import type { BusinessRow, RuleRow } from "@/lib/database.types";
import { saveAssistant } from "@/lib/profile/actions";
import { TONES, type FormMode } from "@/lib/profile/constants";
import { newId, ProfileForm } from "./profile-form";

type Rule = { id: string; kind: "never_answer" | "instruction"; content: string };

export function AssistantForm({
  business,
  rules,
  suggestions,
  mode,
  readOnly,
}: {
  business: BusinessRow;
  rules: RuleRow[];
  suggestions: string[];
  mode: FormMode;
  readOnly?: boolean;
}) {
  const t = useTranslations("sections.assistant");
  const common = useTranslations("common");
  const [tone, setTone] = useState(business.tone);
  const [toneNotes, setToneNotes] = useState(business.tone_notes);
  const [approveReplies, setApproveReplies] = useState(business.approve_replies);
  const [items, setItems] = useState<Rule[]>(() =>
    rules.map((r) => ({ id: r.id, kind: r.kind === "instruction" ? "instruction" : "never_answer", content: r.content })),
  );
  const [focusId, setFocusId] = useState<string | null>(null);

  const add = (kind: Rule["kind"], content = "") => {
    const item = { id: newId(), kind, content };
    setItems((list) => [...list, item]);
    if (!content) setFocusId(item.id);
  };
  const update = (id: string, content: string) =>
    setItems((list) => list.map((r) => (r.id === id ? { ...r, content } : r)));
  const remove = (id: string) => setItems((list) => list.filter((r) => r.id !== id));

  const used = new Set(items.map((r) => r.content.trim().toLowerCase()));
  const openSuggestions = suggestions.filter((s) => !used.has(s.toLowerCase()));

  const payload = { tone, tone_notes: toneNotes, approve_replies: approveReplies, rules: items };

  const ruleList = (kind: Rule["kind"], placeholder: string) => (
    <div className="space-y-2">
      {items
        .filter((r) => r.kind === kind)
        .map((rule) => (
          <div key={rule.id} className="flex items-center gap-2">
            <Input
              required
              maxLength={500}
              placeholder={placeholder}
              value={rule.content}
              autoFocus={focusId === rule.id}
              onChange={(e) => update(rule.id, e.target.value)}
            />
            <Button variant="ghost" aria-label={common("remove")} onClick={() => remove(rule.id)}>
              ✕
            </Button>
          </div>
        ))}
    </div>
  );

  return (
    <ProfileForm section="assistant" mode={mode} action={saveAssistant} payload={payload} readOnly={readOnly}>
      <Field label={t("tone")}>
        <div className="grid gap-3 sm:grid-cols-3">
          {TONES.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer flex-col rounded-xl border border-stone-300 bg-white p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="tone-choice"
                  className="size-4 accent-brand-600"
                  checked={tone === value}
                  onChange={() => setTone(value)}
                />
                {t(`tones.${value}`)}
              </span>
              <span className="mt-1 text-sm text-stone-600">{t(`tones.${value}Hint`)}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label={t("toneNotes")} optional={common("optional")} htmlFor="tone_notes">
        <Textarea
          id="tone_notes"
          rows={3}
          maxLength={1000}
          placeholder={t("toneNotesPlaceholder")}
          value={toneNotes}
          onChange={(e) => setToneNotes(e.target.value)}
        />
      </Field>

      <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <div>
          <h2 className="text-lg font-semibold">{t("neverAnswerTitle")}</h2>
          <p className="text-sm text-stone-700">{t("neverAnswerIntro")}</p>
        </div>
        {!readOnly && openSuggestions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-stone-600">{t("suggestions")}</p>
            <div className="flex flex-wrap gap-2">
              {openSuggestions.map((s) => (
                <Chip key={s} onClick={() => add("never_answer", s)}>
                  + {s}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        {ruleList("never_answer", t("topicPlaceholder"))}
        {readOnly ? null : (
          <Button variant="secondary" onClick={() => add("never_answer")}>
            + {t("addTopic")}
          </Button>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("instructionsTitle")}</h2>
          <p className="text-sm text-stone-600">{t("instructionsIntro")}</p>
        </div>
        {ruleList("instruction", t("instructionPlaceholder"))}
        {readOnly ? null : (
          <Button variant="secondary" onClick={() => add("instruction")}>
            + {t("addInstruction")}
          </Button>
        )}
      </section>

      <label className="flex cursor-pointer gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-brand-600"
          checked={approveReplies}
          onChange={(e) => setApproveReplies(e.target.checked)}
        />
        <span>
          <span className="font-medium">{t("approveReplies")}</span>
          <span className="block text-sm text-stone-600">{t("approveRepliesHint")}</span>
        </span>
      </label>
    </ProfileForm>
  );
}
