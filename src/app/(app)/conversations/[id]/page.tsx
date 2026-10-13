import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, cn } from "@/components/ui";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("conversation");
  return { title: t("title") };
}

/** Read-only view of one website chat (the full inbox comes in Milestone 3). */
export default async function ConversationPage({ params }: PageProps<"/conversations/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { business } = await requireBusiness();
  const supabase = await createClient();

  // Row Level Security only returns conversations of the user's own business.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!conversation) notFound();
  const [{ data: contact }, { data: messages }] = await Promise.all([
    supabase.from("contacts").select("name, phone, email").eq("id", conversation.contact_id).maybeSingle(),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at"),
  ]);

  const t = await getTranslations("conversation");
  const format = await getFormatter();
  const contactLines = [contact?.name, contact?.phone, contact?.email].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-brand-700 hover:underline">
        ← {t("back")}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{contact?.name || t("title")}</h1>
        <p className="text-sm text-stone-600">
          {t(`status.${conversation.status}`)} · {format.dateTime(new Date(conversation.created_at), { dateStyle: "medium", timeStyle: "short" })}
          {conversation.is_test ? ` · ${t("test")}` : ""}
        </p>
      </div>

      <Card className="space-y-2">
        <h2 className="font-semibold">{t("summary")}</h2>
        <p className="whitespace-pre-wrap text-stone-800">{conversation.summary || t("noSummary")}</p>
      </Card>

      <Card className="space-y-1">
        <h2 className="font-semibold">{t("contact")}</h2>
        {contactLines.length ? (
          contactLines.map((line) => (
            <p key={line} className="text-stone-800">
              {line}
            </p>
          ))
        ) : (
          <p className="text-stone-500">{t("noContact")}</p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("transcript")}</h2>
        {(messages ?? [])
          .filter((m) => m.sender !== "system")
          .map((m) => {
            const meta = (m.metadata ?? {}) as { decision?: string; handoff_reason?: string };
            const mine = m.sender === "customer";
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-start" : "items-end")}>
                <span className="text-xs text-stone-500">
                  {m.sender === "customer" ? t("customer") : m.sender === "human" ? t("team") : t("assistant")} ·{" "}
                  {format.dateTime(new Date(m.created_at), { timeStyle: "short" })}
                </span>
                <p
                  className={cn(
                    "mt-1 max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[15px] [overflow-wrap:anywhere]",
                    mine ? "rounded-bl-sm bg-stone-100" : "rounded-br-sm bg-brand-50 text-stone-900",
                  )}
                >
                  {m.content}
                </p>
                {meta.decision === "handoff" && meta.handoff_reason ? (
                  <span className="mt-1 max-w-[85%] text-xs text-amber-700">
                    {t("handedOver", { reason: meta.handoff_reason })}
                  </span>
                ) : null}
              </div>
            );
          })}
        <p className="pt-2 text-sm text-stone-500">{t("replySoon")}</p>
      </Card>
    </div>
  );
}
