"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip, Field, Input, Textarea } from "@/components/ui";
import type { BusinessRow, RuleRow } from "@/lib/database.types";
import { saveAssistant } from "@/lib/profile/actions";
import { TONES, type FormMode } from "@/lib/profile/constants";
import { newId, ProfileForm } from "./profile-form";

type Rule = { id: string; kind: "never_answer" | "instruction" | "question"; content: string };
type Goal = "answer" | "meeting";

export function AssistantForm({
  business,
  rules,
  suggestions,
  questionSuggestions,
  initialGoal,
  mode,
  readOnly,
}: {
  business: BusinessRow;
  rules: RuleRow[];
  suggestions: string[];
  questionSuggestions: string[];
  initialGoal: Goal;
  mode: FormMode;
  readOnly?: boolean;
}) {
  const t = useTranslations("sections.assistant");
  const common = useTranslations("common");
  const [tone, setTone] = useState(business.tone);
  const [toneNotes, setToneNotes] = useState(business.tone_notes);
  const [goal, setGoal] = useState<Goal>(initialGoal);
  const [items, setItems] = useState<Rule[]>(() =>
    rules.map((r) => ({
      id: r.id,
      kind: r.kind === "instruction" || r.kind === "question" ? r.kind : "never_answer",
      content: r.content,
    })),
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
  const openQuestions = questionSuggestions.filter((s) => !used.has(s.toLowerCase()));

  const payload = { tone, tone_notes: toneNotes, goal, rules: items };

  const ruleList = (kind: Rule["kind"], placeholder: string, label: string) => (
    <div className="space-y-2">
      {items
        .filter((r) => r.kind === kind)
        .map((rule) => (
          <div key={rule.id} className="flex items-center gap-2">
            <Input
              required
              maxLength={500}
              aria-label={label}
              placeholder={placeholder}
              value={rule.content}
              autoFocus={focusId === rule.id}
              onChange={(e) => update(rule.id, e.target.value)}
            />
            <Button
              variant="ghost"
              aria-label={common("removeItem", { item: rule.content || label })}
              onClick={() => remove(rule.id)}
            >
              ✕
            </Button>
          </div>
        ))}
    </div>
  );

  return (
    <ProfileForm section="assistant" mode={mode} action={saveAssistant} payload={payload} readOnly={readOnly}>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-stone-800">{t("goal")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["answer", "meeting"] as const).map((value) => (
            <label
              key={value}
              className="flex cursor-pointer flex-col rounded-xl border border-stone-400 bg-white p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="goal-choice"
                  className="size-4 shrink-0 accent-brand-600"
                  checked={goal === value}
                  onChange={() => setGoal(value)}
                />
                {t(`goals.${value}`)}
              </span>
              <span className="mt-1 text-sm text-stone-600">{t(`goals.${value}Hint`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {goal === "meeting" ? (
        <section className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
          <div>
            <h2 className="text-lg font-semibold">{t("questionsTitle")}</h2>
            <p className="text-sm text-stone-700">{t("questionsIntro")}</p>
          </div>
          {!readOnly && openQuestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {openQuestions.map((q) => (
                <Chip key={q} onClick={() => add("question", q)}>
                  + {q}
                </Chip>
              ))}
            </div>
          ) : null}
          {ruleList("question", t("questionPlaceholder"), t("question"))}
          {readOnly ? null : (
            <Button variant="secondary" onClick={() => add("question")}>
              + {t("addQuestion")}
            </Button>
          )}
        </section>
      ) : null}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-stone-800">{t("tone")}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {TONES.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer flex-col rounded-xl border border-stone-400 bg-white p-4 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
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
              <span className="mt-3 rounded-xl rounded-bl-sm bg-stone-100 px-3 py-2 text-sm text-stone-800">
                {t(`tones.${value}Example`)}
              </span>
            </label>
          ))}
        </div>
        <p className="text-sm text-stone-500">{t("toneExampleQuestion")}</p>
        <p className="text-sm text-stone-500">{t("toneChangeLater")}</p>
      </fieldset>

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
        {ruleList("never_answer", t("topicPlaceholder"), t("topic"))}
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
        {ruleList("instruction", t("instructionPlaceholder"), t("instruction"))}
        {readOnly ? null : (
          <Button variant="secondary" onClick={() => add("instruction")}>
            + {t("addInstruction")}
          </Button>
        )}
      </section>

    </ProfileForm>
  );
}
