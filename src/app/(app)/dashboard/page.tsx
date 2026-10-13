import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { InboxList } from "@/components/inbox/inbox-list";
import { LiveRefresh } from "@/components/inbox/live-refresh";
import { buttonClass, Card, cn, Note } from "@/components/ui";
import { getBusinessProfile, requireBusiness } from "@/lib/business";
import { getInboxStats, listConversations } from "@/lib/inbox/queries";
import type { Section } from "@/lib/profile/constants";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

function greetingKey(timeZone: string): "morning" | "day" | "evening" {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  return hour < 11 ? "morning" : hour < 18 ? "day" : "evening";
}

export default async function DashboardPage() {
  const { business, role } = await requireBusiness();
  const supabase = await createClient();
  const [profile, stats, waiting, leads, channel, t] = await Promise.all([
    getBusinessProfile(business.id),
    getInboxStats(business.id),
    listConversations(business.id, "waiting", 5),
    listConversations(business.id, "leads", 3),
    supabase.from("channels").select("enabled").eq("business_id", business.id).eq("type", "web_chat").maybeSingle(),
    getTranslations("dashboard"),
  ]);

  const openDays = new Set(profile.hours.map((h) => h.weekday)).size;
  const activeServices = profile.services.filter((s) => s.active).length;
  const neverAnswer = profile.rules.filter((r) => r.kind === "never_answer").length;

  const items: Array<{ ok: boolean; label: string; tip?: string; section: Section }> = [
    { ok: activeServices > 0, label: t("checklist.services", { count: activeServices }), section: "services" },
    { ok: openDays > 0, label: t("checklist.hours", { count: openDays }), section: "hours" },
    {
      ok: profile.faqs.length >= 5,
      label: t("checklist.faqs", { count: profile.faqs.length }),
      tip: profile.faqs.length < 5 ? t("checklist.faqsTip") : undefined,
      section: "faqs",
    },
    {
      ok: business.booking_url !== "",
      label: business.booking_url ? t("checklist.booking") : t("checklist.bookingMissing"),
      section: "contact",
    },
    { ok: neverAnswer > 0, label: t("checklist.rules", { count: neverAnswer }), section: "assistant" },
  ];

  const tiles = [
    { value: stats.handled, label: t("tiles.handled"), className: "bg-lime" },
    { value: stats.waiting, label: t("tiles.waiting", { count: stats.waiting }), className: "bg-pink", href: "/inbox?filter=waiting" },
    { value: stats.leads, label: t("tiles.leads", { count: stats.leads }), className: "bg-blue-tint text-blue-ink", href: "/leads" },
    { value: stats.total, label: t("tiles.total", { count: stats.total }), className: "bg-white" },
  ];

  return (
    <div className="space-y-6">
      <LiveRefresh businessId={business.id} />
      <div className="space-y-1">
        <h1 className="text-4xl font-extrabold tracking-tighter">{t(`greeting.${greetingKey(business.timezone || "Europe/Prague")}`)}</h1>
        <Note>{t("handNote", { total: stats.total, handled: stats.handled })}</Note>
      </div>

      {business.onboarding_completed_at || role !== "owner" ? null : (
        <Card className="bg-lime-tint">
          <h2 className="font-bold">{t("finishSetupTitle")}</h2>
          <p className="mt-1 text-sm text-neutral-800">{t("finishSetupBody")}</p>
          <Link href="/onboarding" className={buttonClass("primary", "mt-4")}>
            {t("finishSetupCta")}
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <span className="block text-4xl font-extrabold tracking-tighter">{tile.value}</span>
              <span className="text-sm font-semibold">{tile.label}</span>
            </>
          );
          const className = cn("block rounded-3xl p-4 sm:p-5", tile.className);
          return tile.href ? (
            <Link key={tile.label} href={tile.href} className={cn(className, "transition hover:ring-2 hover:ring-ink")}>
              {body}
            </Link>
          ) : (
            <div key={tile.label} className={className}>
              {body}
            </div>
          );
        })}
      </div>

      {channel.data && channel.data.enabled ? null : (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">{channel.data ? t("chatOff") : t("chatMissing")}</p>
          <Link href="/settings/widget" className={buttonClass("primary")}>
            {t("chatSetup")}
          </Link>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold tracking-tight">{t("waitingTitle")}</h2>
            <Link href="/inbox" className="text-sm font-semibold hover:underline">
              {t("openInbox")} →
            </Link>
          </div>
          {waiting.length ? (
            <InboxList items={waiting} filter="waiting" />
          ) : (
            <p className="py-2 text-sm text-neutral-700">{t("waitingEmpty")}</p>
          )}
        </Card>
        <Card className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold tracking-tight">{t("leadsTitle")}</h2>
            <Link href="/leads" className="text-sm font-semibold hover:underline">
              {t("allLeads")} →
            </Link>
          </div>
          <InboxList items={leads} filter="leads" />
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-extrabold tracking-tight">{t("profileTitle")}</h2>
        <ul className="mt-3 divide-y divide-neutral-100">
          {items.map((item) => (
            <li key={item.section} className="flex items-center gap-3 py-3">
              <span
                aria-hidden
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-xl text-sm font-bold",
                  item.ok ? "bg-lime text-ink" : "bg-pink-tint text-pink-ink",
                )}
              >
                {item.ok ? "✓" : "!"}
              </span>
              <div className="flex-1">
                <p>{item.label}</p>
                {item.tip ? <p className="text-sm text-neutral-600">{item.tip}</p> : null}
              </div>
              <Link href={`/settings/${item.section}`} className="flex min-h-11 items-center px-2 text-sm font-semibold hover:underline">
                {t("edit")}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
