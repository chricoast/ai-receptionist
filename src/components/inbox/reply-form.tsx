"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { INBOX } from "@/config/app";
import { sendReply } from "@/lib/inbox/actions";

/** The owner's reply box under a conversation. */
export function ReplyForm({ id, businessName }: { id: string; businessName: string }) {
  const t = useTranslations("inbox.reply");
  const [text, setText] = useState("");
  const [error, setError] = useState<"invalid" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || pending) return;
    startTransition(async () => {
      const result = await sendReply(id, content);
      if (result.status === "ok") {
        setText("");
        setError(null);
      } else {
        setError(result.error ?? "failed");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="reply" className="sr-only">
        {t("label")}
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="reply"
          rows={2}
          maxLength={INBOX.maxReplyLength}
          value={text}
          placeholder={t("placeholder", { business: businessName })}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-48 min-h-12 flex-1 resize-y rounded-2xl border-2 border-neutral-200 bg-white px-3.5 py-2.5 text-ink placeholder:text-neutral-500 focus:border-ink focus:outline-none focus:ring-4 focus:ring-lime/50"
        />
        <Button type="submit" variant="dark" className="min-h-12" disabled={pending || !text.trim()}>
          {pending ? t("sending") : t("send")}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {t(`errors.${error}`)}
        </p>
      ) : null}
      <p className="text-xs text-neutral-600">{t("hint")}</p>
    </form>
  );
}
