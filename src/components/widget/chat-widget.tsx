"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CHAT_LIMITS } from "@/config/app";
import { cn } from "@/components/ui";

type Message = { id: string; sender: "customer" | "ai" | "human" | "system"; content: string };
type Saved = { conversationId: string; token: string };

const storageKey = (publicKey: string, preview: boolean) => `air:${preview ? "preview:" : ""}${publicKey}`;

function load(key: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: Saved) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode etc.: the chat still works, it just won't be remembered.
  }
}

/** Turns plain URLs in a reply into clickable links. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline [overflow-wrap:anywhere]">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function ChatWidget({
  publicKey,
  businessName,
  language,
  preview = false,
}: {
  publicKey: string;
  businessName: string;
  language: "cs" | "en";
  preview?: boolean;
}) {
  const t = useTranslations("widget");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The box stays disabled until the chat is ready (hydrated), so nothing typed is lost.
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const saved = useRef<Saved | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const key = storageKey(publicKey, preview);

  // Reopen the previous conversation, if this browser has one.
  useEffect(() => {
    const existing = load(key);
    if (!existing) return;
    saved.current = existing;
    const params = new URLSearchParams({ key: publicKey, ...existing });
    fetch(`/api/widget/messages?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages) setMessages(data.messages);
        else saved.current = null;
      })
      .catch(() => undefined);
  }, [key, publicKey]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    setSending(true);
    setText("");
    setMessages((list) => [...list, { id: `local-${Date.now()}`, sender: "customer", content }]);
    try {
      const response = await fetch("/api/widget/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: publicKey, text: content, language, preview, ...saved.current }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.messages) {
        // The visitor's saved conversation no longer works: start fresh next time.
        if (response.status === 403 && data?.error === "forbidden") saved.current = null;
        const reason = data?.error === "rate_limited" || data?.error === "disabled" ? data.error : "generic";
        setError(t(`errors.${reason as "generic" | "rate_limited" | "disabled"}`));
        setText(content);
        setMessages((list) => list.filter((m) => !m.id.startsWith("local-")));
        return;
      }
      if (data.token) {
        saved.current = { conversationId: data.conversationId, token: data.token };
        save(key, saved.current);
      }
      setMessages(data.messages);
    } catch {
      setError(t("errors.generic"));
      setText(content);
      setMessages((list) => list.filter((m) => !m.id.startsWith("local-")));
    } finally {
      setSending(false);
    }
  };

  const close = () => window.parent.postMessage({ type: "air:close" }, "*");

  return (
    <div className="flex h-dvh flex-col bg-white text-stone-900">
      <header className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
        <div aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-semibold">
          AI
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{t("title", { business: businessName })}</p>
          <p className="truncate text-xs text-white/80">{t("subtitle")}</p>
        </div>
        {preview ? null : (
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="grid size-11 place-items-center rounded-full text-xl hover:bg-white/15"
          >
            ×
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        <Bubble sender="ai" label={t("assistant")}>
          {t("greeting", { business: businessName })}
        </Bubble>
        {messages.map((m) => (
          <Bubble
            key={m.id}
            sender={m.sender}
            label={m.sender === "customer" ? t("you") : m.sender === "human" ? t("team") : t("assistant")}
          >
            <Linkified text={m.content} />
          </Bubble>
        ))}
        {sending ? (
          <Bubble sender="ai" label={t("assistant")}>
            <span className="inline-flex gap-1" aria-label={t("typing")}>
              <span className="size-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-stone-400" />
            </span>
          </Bubble>
        ) : null}
        <div ref={bottom} />
      </div>

      {error ? (
        <p role="alert" className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-stone-200 p-3">
        <label htmlFor="air-message" className="sr-only">
          {t("placeholder")}
        </label>
        <textarea
          id="air-message"
          rows={1}
          maxLength={CHAT_LIMITS.maxMessageLength}
          disabled={!ready}
          value={text}
          placeholder={t("placeholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-stone-400 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="submit"
          disabled={!ready || sending || !text.trim()}
          className="min-h-11 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {t("send")}
        </button>
      </form>
      <p className="px-4 pb-3 text-center text-[11px] leading-tight text-stone-500">{t("disclaimer")}</p>
    </div>
  );
}

function Bubble({
  sender,
  label,
  children,
}: {
  sender: Message["sender"];
  label: string;
  children: React.ReactNode;
}) {
  const mine = sender === "customer";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug",
          mine ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-stone-100 text-stone-900",
        )}
      >
        <span className="sr-only">{label}: </span>
        {children}
      </div>
    </div>
  );
}
