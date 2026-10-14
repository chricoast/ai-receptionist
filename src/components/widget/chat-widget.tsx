"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CHAT_LIMITS, INBOX } from "@/config/app";
import { Smiley } from "@/components/smiley";
import { cn } from "@/components/ui";
import { widgetThemeStyle, type WidgetTheme } from "@/lib/chat/theme";
import { ReadySignal } from "./ready-signal";

type Message = { id: string; sender: "customer" | "ai" | "human" | "system"; content: string };
type Status = "ai_active" | "needs_human" | "human_active" | "closed";
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

const sameMessages = (a: Message[], b: Message[]) => a.length === b.length && a.every((m, i) => m.id === b[i].id);

/**
 * The chat window inside the website's iframe. Deliberately neutral, coloured
 * by the business's theme (src/lib/chat/theme.ts); only the lime smiley is ours.
 */
export function ChatWidget({
  publicKey,
  businessName,
  language,
  theme,
  preview = false,
}: {
  publicKey: string;
  businessName: string;
  language: "cs" | "en";
  theme: WidgetTheme;
  preview?: boolean;
}) {
  const t = useTranslations("widget");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>("ai_active");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the chat window is open on the website (the bubble tells us).
  const [visible, setVisible] = useState(true);
  // The box stays disabled until the chat is ready (hydrated), so nothing typed is lost.
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const saved = useRef<Saved | null>(null);
  const sendingRef = useRef(false);
  const [hasConversation, setHasConversation] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const key = storageKey(publicKey, preview);

  /** Fetches the conversation so far (new replies from the team included). */
  const fetchHistory = useCallback(async () => {
    const current = saved.current;
    if (!current) return;
    const params = new URLSearchParams({ key: publicKey, ...current });
    const data = await fetch(`/api/widget/messages?${params}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (sendingRef.current) return;
    if (data?.messages) {
      setMessages((list) => (sameMessages(list, data.messages) ? list : data.messages));
      setStatus(data.status);
    }
  }, [publicKey]);

  // Reopen the previous conversation, if this browser has one.
  useEffect(() => {
    const existing = load(key);
    if (!existing) return;
    saved.current = existing;
    const params = new URLSearchParams({ key: publicKey, ...existing });
    fetch(`/api/widget/messages?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.messages) {
          setMessages(data.messages);
          setStatus(data.status);
          setHasConversation(true);
        } else saved.current = null;
      })
      .catch(() => undefined);
  }, [key, publicKey]);

  // The bubble script tells us when the chat is opened or closed.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source === window.parent && event.data?.type === "air:visibility") setVisible(Boolean(event.data.open));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Check for replies from the team while the chat is open: often while a
  // person is involved, rarely otherwise.
  useEffect(() => {
    if (!hasConversation || !visible || status === "closed") return;
    const every = status === "ai_active" ? INBOX.widgetPollIdleMs : INBOX.widgetPollWaitingMs;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void fetchHistory();
    }, every);
    return () => clearInterval(timer);
  }, [hasConversation, visible, status, fetchHistory]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    setSending(true);
    sendingRef.current = true;
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
      setStatus(data.status);
      setHasConversation(true);
    } catch {
      setError(t("errors.generic"));
      setText(content);
      setMessages((list) => list.filter((m) => !m.id.startsWith("local-")));
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  const close = () => window.parent.postMessage({ type: "air:close" }, "*");

  return (
    <div
      className="flex h-dvh flex-col bg-(--w-bg) font-(family-name:--w-font) text-(--w-text)"
      style={widgetThemeStyle(theme) as CSSProperties}
    >
      <ReadySignal />
      <header className="flex items-center gap-3 border-b border-(--w-border) px-4 py-3">
        <Smiley size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{t("title", { business: businessName })}</p>
          <p className="truncate text-xs text-(--w-muted)">{t("subtitle")}</p>
        </div>
        {preview ? null : (
          <button
            type="button"
            onClick={close}
            aria-label={t("minimize")}
            className="grid size-11 place-items-center rounded-full text-(--w-muted) hover:bg-(--w-ai)"
          >
            <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6l5 5 5-5" />
            </svg>
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        <Bubble sender="ai" label={businessName}>
          {t("greeting", { business: businessName })}
        </Bubble>
        {messages.map((m) => (
          <Bubble
            key={m.id}
            sender={m.sender}
            label={m.sender === "customer" ? t("you") : m.sender === "human" ? t("teamLabel", { business: businessName }) : businessName}
            showLabel={m.sender === "human"}
          >
            <Linkified text={m.content} />
          </Bubble>
        ))}
        {sending ? (
          <Bubble sender="ai" label={businessName}>
            <span className="inline-flex gap-1" aria-label={t("typing")}>
              <span className="size-2 animate-bounce rounded-full bg-(--w-muted) [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-(--w-muted) [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-(--w-muted)" />
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

      <form onSubmit={send} className="flex items-end gap-2 px-3 pb-2 pt-1">
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
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[calc(var(--w-radius)*0.7)] border border-(--w-border) bg-(--w-bg) px-3.5 py-2.5 text-(--w-text) placeholder:text-(--w-muted) focus:border-(--w-accent) focus:outline-none focus:ring-2 focus:ring-(--w-accent)/25"
        />
        <button
          type="submit"
          aria-label={t("send")}
          disabled={!ready || sending || !text.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-[calc(var(--w-radius)*0.7)] bg-(--w-accent) text-(--w-on-accent) hover:opacity-90 disabled:opacity-40"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 16V4M4.5 9.5L10 4l5.5 5.5" />
          </svg>
        </button>
      </form>
      <p className="px-4 pb-3 text-center text-[11px] leading-tight text-(--w-muted)">{t("disclaimer", { business: businessName })}</p>
    </div>
  );
}

function Bubble({
  sender,
  label,
  showLabel = false,
  children,
}: {
  sender: Message["sender"];
  label: string;
  showLabel?: boolean;
  children: React.ReactNode;
}) {
  const mine = sender === "customer";
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {showLabel ? <span className="mb-1 px-1 text-xs font-semibold text-(--w-muted)">{label}</span> : null}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-(--w-radius) px-3.5 py-2.5 text-[15px] leading-snug",
          mine ? "rounded-br-md bg-(--w-accent) text-(--w-on-accent)" : "rounded-bl-md bg-(--w-ai) text-(--w-on-ai)",
        )}
      >
        {showLabel ? null : <span className="sr-only">{label}: </span>}
        {children}
      </div>
    </div>
  );
}
