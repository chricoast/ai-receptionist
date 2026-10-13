import { getFormatter, getTranslations } from "next-intl/server";
import { Card, cn, Note, Pill } from "@/components/ui";
import type { ConversationDetail } from "@/lib/inbox/queries";
import { ConversationActions } from "./conversation-actions";
import { Initials, StatusPill } from "./inbox-list";
import { ReplyForm } from "./reply-form";
import { ScrollOnNew } from "./scroll-on-new";

/** One conversation: who, what they want, the transcript, and the reply box. */
export async function ConversationView({ detail, businessName }: { detail: ConversationDetail; businessName: string }) {
  const { conversation, contact, messages } = detail;
  const t = await getTranslations("inbox");
  const format = await getFormatter();
  const name = contact?.name || t("visitor");

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Initials name={contact?.name ?? ""} className="size-12" />
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-xl font-extrabold tracking-tight">{name}</h1>
            <p className="text-sm text-neutral-700">
              {t("channel")} · {t("started", { date: format.dateTime(new Date(conversation.created_at), { dateStyle: "medium", timeStyle: "short" }) })}
            </p>
            <div className="flex flex-wrap gap-1">
              <StatusPill status={conversation.status} />
              {conversation.lead_at ? <Pill tone="blue">{t("lead")}</Pill> : null}
              {conversation.is_test ? <Pill>{t("testNote")}</Pill> : null}
            </div>
          </div>
        </div>
        <ConversationActions id={conversation.id} status={conversation.status} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-1">
          <h2 className="font-bold">{t("contact")}</h2>
          {contact?.phone || contact?.email ? (
            <>
              {contact.phone ? (
                <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="block font-medium underline-offset-2 hover:underline">
                  {contact.phone}
                </a>
              ) : null}
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className="block font-medium underline-offset-2 hover:underline [overflow-wrap:anywhere]">
                  {contact.email}
                </a>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-neutral-600">{t("noContact")}</p>
          )}
        </Card>
        {conversation.summary ? (
          <Card className="space-y-1 bg-blue-tint">
            <h2 className="font-bold text-blue-ink">{t("summary")}</h2>
            <p className="whitespace-pre-wrap text-sm text-ink">{conversation.summary}</p>
          </Card>
        ) : null}
      </div>

      <Card className="space-y-3">
        <ol className="space-y-3" aria-label={t("transcript")}>
          {messages.map((m) => {
            const meta = (m.metadata ?? {}) as { decision?: string; handoff_reason?: string };
            const fromCustomer = m.sender === "customer";
            return (
              <li key={m.id} className={cn("flex flex-col", fromCustomer ? "items-start" : "items-end")}>
                <span className="text-xs text-neutral-600">
                  {fromCustomer ? t("customer") : m.sender === "human" ? t("team") : t("assistant")} ·{" "}
                  {format.dateTime(new Date(m.created_at), { timeStyle: "short" })}
                </span>
                <p
                  className={cn(
                    "mt-1 max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-[15px] leading-snug [overflow-wrap:anywhere]",
                    fromCustomer && "rounded-bl-md bg-neutral-100",
                    m.sender === "ai" && "rounded-br-md bg-lime-tint",
                    m.sender === "human" && "rounded-br-md bg-ink text-white",
                  )}
                >
                  {m.content}
                </p>
                {meta.decision === "handoff" && meta.handoff_reason ? (
                  <span className="mt-1 max-w-[85%] text-right text-xs text-pink-ink">
                    {t("handedOver", { reason: meta.handoff_reason })}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
        <ScrollOnNew count={messages.length} />
        {conversation.status === "needs_human" ? (
          <Note className="mx-auto w-fit rounded-full bg-neutral-100 px-4 py-1.5 text-center">{t("notes.needs_human")}</Note>
        ) : conversation.status !== "ai_active" ? (
          <p className="rounded-2xl bg-neutral-100 px-4 py-2.5 text-center text-sm text-neutral-700">
            {t(`notes.${conversation.status}`)}
          </p>
        ) : null}
      </Card>

      <Card className="sticky bottom-24 z-30 shadow-[0_-6px_24px_rgba(0,0,0,0.07)] lg:bottom-4">
        <ReplyForm id={conversation.id} businessName={businessName} />
      </Card>
    </div>
  );
}
