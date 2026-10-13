import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass, Card } from "@/components/ui";
import { getBusinessProfile, requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import type { Section } from "@/lib/profile/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

export default async function DashboardPage() {
  const { business, role } = await requireBusiness();
  const profile = await getBusinessProfile(business.id);
  const t = await getTranslations("dashboard");
  const chat = await getChatStats(business.id);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{business.name}</h1>
        {business.type ? <p className="text-stone-600">{business.type}</p> : null}
      </div>

      {business.onboarding_completed_at || role !== "owner" ? null : (
        <Card className="border-brand-200 bg-brand-50">
          <h2 className="font-semibold text-brand-900">{t("finishSetupTitle")}</h2>
          <p className="mt-1 text-sm text-brand-900/80">{t("finishSetupBody")}</p>
          <Link href="/onboarding" className={buttonClass("primary", "mt-4")}>
            {t("finishSetupCta")}
          </Link>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">{t("profileTitle")}</h2>
        <ul className="mt-4 divide-y divide-stone-100">
          {items.map((item) => (
            <li key={item.section} className="flex items-center gap-3 py-3">
              <span
                aria-hidden
                className={
                  item.ok
                    ? "grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-sm text-brand-700"
                    : "grid size-6 shrink-0 place-items-center rounded-full bg-amber-100 text-sm text-amber-700"
                }
              >
                {item.ok ? "✓" : "!"}
              </span>
              <div className="flex-1">
                <p className="text-stone-800">{item.label}</p>
                {item.tip ? <p className="text-sm text-stone-500">{item.tip}</p> : null}
              </div>
              <Link
                href={`/settings/${item.section}`}
                className="flex min-h-11 items-center px-2 text-sm font-medium text-brand-700 hover:underline"
              >
                {t("edit")}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">{t("chat.title")}</h2>
        {chat.channel ? (
          <>
            {chat.channel.enabled ? null : <p className="text-sm text-stone-600">{t("chat.off")}</p>}
            <p className="text-stone-800">{t("chat.last7", { count: chat.last7 })}</p>
            <p className={chat.needsHuman ? "font-medium text-amber-700" : "text-stone-600"}>
              {t("chat.needsHuman", { count: chat.needsHuman })}
            </p>
            {chat.needsHuman ? <p className="text-sm text-stone-500">{t("chat.inboxSoon")}</p> : null}
          </>
        ) : null}
        <Link href="/settings/widget" className={buttonClass(chat.channel ? "secondary" : "primary", "mt-2")}>
          {t("chat.setup")}
        </Link>
      </Card>
    </div>
  );
}

/** Website chat numbers for the dashboard (test conversations excluded). */
async function getChatStats(businessId: string) {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const [channel, last7, needsHuman] = await Promise.all([
    supabase.from("channels").select("enabled").eq("business_id", businessId).eq("type", "web_chat").maybeSingle(),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("is_test", false)
      .gte("created_at", weekAgo),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("is_test", false)
      .eq("status", "needs_human"),
  ]);
  return { channel: channel.data, last7: last7.count ?? 0, needsHuman: needsHuman.count ?? 0 };
}
