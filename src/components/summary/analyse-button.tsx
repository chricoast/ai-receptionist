"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Alert, Button } from "@/components/ui";
import { analyseWeekAction, type AnalyseState } from "@/lib/insights/actions";

/** Runs the AI analysis of one week (owner only). */
export function AnalyseButton({ weekStart, again }: { weekStart: string; again: boolean }) {
  const t = useTranslations("summary");
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<AnalyseState>({ status: "idle" });

  return (
    <div className="space-y-2">
      <Button
        variant={again ? "secondary" : "primary"}
        disabled={pending}
        onClick={() => startTransition(async () => setState(await analyseWeekAction(weekStart)))}
      >
        {pending ? t("analysing") : again ? t("reanalyse") : t("analyse")}
      </Button>
      {state.status === "error" && state.error ? <Alert>{t(`errors.${state.error}`)}</Alert> : null}
    </div>
  );
}
