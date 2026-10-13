import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card, Pill } from "@/components/ui";
import { StatusPill } from "@/components/inbox/inbox-list";
import { LiveRefresh } from "@/components/inbox/live-refresh";
import { requireBusiness } from "@/lib/business";
import { listConversations } from "@/lib/inbox/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leads");
  return { title: t("title") };
}

/** Enquiries: conversations where the receptionist wrote a summary for the owner. */
export default async function LeadsPage() {
  const { business } = await requireBusiness();
  const [leads, t, ti, format] = await Promise.all([
    listConversations(business.id, "leads", 50),
    getTranslations("leads"),
    getTranslations("inbox"),
    getFormatter(),
  ]);

  return (
    <div className="space-y-5">
      <LiveRefresh businessId={business.id} />
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-neutral-700">{t("intro")}</p>
      </div>
      {leads.length === 0 ? <Card><p className="text-neutral-700">{t("empty")}</p></Card> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link href={`/inbox/${lead.id}?filter=leads`} className="flex h-full flex-col gap-2 rounded-3xl bg-white p-5 transition hover:ring-2 hover:ring-ink">
              <span className="flex items-start justify-between gap-2">
                <span className="font-bold">{lead.contact?.name || t("noName")}</span>
                <time dateTime={lead.lead_at ?? undefined} className="shrink-0 text-xs text-neutral-600">
                  {lead.lead_at ? format.dateTime(new Date(lead.lead_at), { dateStyle: "medium" }) : null}
                </time>
              </span>
              <span className="text-sm text-neutral-700">
                {[lead.contact?.phone, lead.contact?.email].filter(Boolean).join(" · ")}
              </span>
              <span className="line-clamp-4 whitespace-pre-wrap text-sm">{lead.summary}</span>
              <span className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                <StatusPill status={lead.status} />
                {lead.is_test ? <Pill>{ti("test")}</Pill> : null}
                <span className="ml-auto text-sm font-semibold">{t("open")} →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
