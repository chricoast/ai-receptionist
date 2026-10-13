"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import type { ConversationRow } from "@/lib/database.types";
import { changeConversationStatus } from "@/lib/inbox/actions";

/** Take over / hand back / close buttons for one conversation. */
export function ConversationActions({ id, status }: { id: string; status: ConversationRow["status"] }) {
  const t = useTranslations("inbox.actions");
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const run = (next: "ai_active" | "human_active" | "closed") =>
    startTransition(async () => {
      const result = await changeConversationStatus(id, next);
      setFailed(result.status === "error");
    });

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {status === "closed" ? (
          <Button variant="secondary" disabled={pending} onClick={() => run("ai_active")}>
            {t("reopen")}
          </Button>
        ) : (
          <>
            {status === "human_active" || status === "needs_human" ? (
              <Button variant="secondary" disabled={pending} onClick={() => run("ai_active")}>
                {t("handBack")}
              </Button>
            ) : null}
            {status !== "human_active" ? (
              <Button disabled={pending} onClick={() => run("human_active")}>
                {t("takeOver")}
              </Button>
            ) : null}
            <Button variant="ghost" disabled={pending} onClick={() => run("closed")}>
              {t("close")}
            </Button>
          </>
        )}
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-red-700">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
}
