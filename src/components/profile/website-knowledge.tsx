"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, Button } from "@/components/ui";
import type { KnowledgeSummary } from "@/lib/profile/knowledge";
import {
  refreshWebsiteKnowledge,
  setWebsiteKnowledge,
  type KnowledgeRefreshResult,
} from "@/lib/profile/knowledge-actions";

/** Optional "use the whole website" switch, with which pages are loaded and a "load again" button. */
export function WebsiteKnowledge({ summary, readOnly }: { summary: KnowledgeSummary; readOnly?: boolean }) {
  const t = useTranslations("sections.basics.knowledge");
  const format = useFormatter();
  const router = useRouter();
  const [enabled, setEnabled] = useState(summary.enabled);
  const [result, setResult] = useState<KnowledgeRefreshResult | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<KnowledgeRefreshResult>) =>
    start(async () => {
      const r = await action();
      setResult(r.ok && r.count === 0 ? null : r);
      if (r.ok) router.refresh();
    });

  const toggle = (on: boolean) => {
    setEnabled(on);
    run(async () => {
      const r = await setWebsiteKnowledge(on);
      if (!r.ok) setEnabled(!on);
      return r;
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
      <p className="font-medium">{t("title")}</p>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-brand-600"
          checked={enabled}
          disabled={readOnly || pending}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span>
          <span className="font-medium">{t("toggle")}</span>
          <span className="block text-sm text-stone-600">{t("toggleHint")}</span>
        </span>
      </label>

      {enabled ? (
        <>
          <p className="text-sm text-stone-700">
            {pending ? t("refreshing") : t("count", { count: summary.count })}
            {!pending && summary.fetchedAt
              ? ` · ${t("updated", { date: format.dateTime(new Date(summary.fetchedAt), { dateStyle: "medium", timeStyle: "short" }) })}`
              : ""}
          </p>
          {summary.count ? (
            <details className="text-sm">
              <summary className="min-h-11 cursor-pointer py-2 text-brand-700">{t("show")}</summary>
              <ul className="space-y-1 text-stone-600">
                {summary.pages.map((p) => (
                  <li key={p.url} className="[overflow-wrap:anywhere]">
                    {p.title || p.url} <span className="text-stone-400">· {p.url}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <p className="text-sm text-stone-500">{t("hint")}</p>
          {readOnly ? null : (
            <Button variant="secondary" disabled={pending} onClick={() => run(refreshWebsiteKnowledge)}>
              {pending ? t("refreshing") : t("refresh")}
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-stone-500">{t("off")}</p>
      )}

      {result ? (
        result.ok ? (
          <Alert tone="success">{t("done", { count: result.count })}</Alert>
        ) : (
          <Alert>{t(`errors.${result.error}`)}</Alert>
        )
      ) : null}
    </div>
  );
}
