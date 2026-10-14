import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AnalyseButton } from "@/components/summary/analyse-button";
import { buttonClass, Card, cn, Note } from "@/components/ui";
import { requireBusiness } from "@/lib/business";
import { getWeekInsights, loadWeek } from "@/lib/insights/queries";
import { addDays, isWeekStart, weekStartOf, type WeekStats } from "@/lib/insights/week";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("summary");
  return { title: t("title") };
}

/** Weekly summary: numbers vs the week before, when customers write, and the AI analysis. */
export default async function SummaryPage({ searchParams }: PageProps<"/summary">) {
  const { business, role } = await requireBusiness();
  const timeZone = business.timezone || "Europe/Prague";
  const thisWeek = weekStartOf(new Date(), timeZone);
  const { week: requested } = await searchParams;
  const week = isWeekStart(requested) && requested <= thisWeek ? requested : thisWeek;

  const [current, previous, saved, t, format] = await Promise.all([
    loadWeek(business.id, week, timeZone),
    loadWeek(business.id, addDays(week, -7), timeZone),
    getWeekInsights(business.id, week),
    getTranslations("summary"),
    getFormatter(),
  ]);
  const s = current.stats;
  const p = previous.stats;
  type DayFormat = { day?: "numeric"; month?: "numeric"; year?: "numeric"; weekday?: "short" };
  const day = (d: string, opts: DayFormat) => format.dateTime(new Date(`${d}T12:00:00Z`), { ...opts, timeZone: "UTC" });
  const label = week === thisWeek ? t("thisWeek") : week === addDays(thisWeek, -7) ? t("lastWeek") : null;

  const delta = (now: number, before: number) =>
    now > before ? t("delta.up", { count: now - before }) : now < before ? t("delta.down", { count: before - now }) : t("delta.same");
  const replyTime = (seconds: number | null) =>
    seconds === null ? "–" : seconds < 120 ? t("seconds", { count: seconds }) : t("minutes", { count: Math.round(seconds / 60) });
  const share = (n: number) => (s.conversations ? t("share", { percent: Math.round((n / s.conversations) * 100) }) : "");

  const tiles: Array<{ value: string; label: string; note: string; className: string }> = [
    { value: String(s.conversations), label: t("tiles.conversations", { count: s.conversations }), note: delta(s.conversations, p.conversations), className: "bg-white" },
    { value: String(s.handledByAi), label: t("tiles.handled"), note: share(s.handledByAi), className: "bg-lime" },
    { value: String(s.handedOver), label: t("tiles.handedOver"), note: share(s.handedOver), className: "bg-pink" },
    { value: String(s.leads), label: t("tiles.leads", { count: s.leads }), note: delta(s.leads, p.leads), className: "bg-blue-tint text-blue-ink" },
    { value: replyTime(s.medianReplySeconds), label: t("tiles.reply"), note: "", className: "bg-white" },
  ];
  const maxDay = Math.max(1, ...s.byWeekday);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <Note>{t("intro")}</Note>
        </div>
        <nav aria-label={t("title")} className="flex items-center gap-2">
          <Link href={`/summary?week=${addDays(week, -7)}`} className={buttonClass("secondary", "px-3")} aria-label={t("prev")}>
            ←
          </Link>
          <span className="min-w-44 text-center text-sm font-semibold">
            {label ? <span className="block">{label}</span> : null}
            <span className={label ? "text-neutral-600" : undefined}>
              {t("range", { from: day(week, { day: "numeric", month: "numeric" }), to: day(addDays(week, 6), { day: "numeric", month: "numeric", year: "numeric" }) })}
            </span>
          </span>
          {week < thisWeek ? (
            <Link href={`/summary?week=${addDays(week, 7)}`} className={buttonClass("secondary", "px-3")} aria-label={t("next")}>
              →
            </Link>
          ) : (
            <span className="w-11" aria-hidden />
          )}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className={cn("rounded-3xl p-4 sm:p-5", tile.className)}>
            <span className="block text-3xl font-extrabold tracking-tighter sm:text-4xl">{tile.value}</span>
            <span className="block text-sm font-semibold">{tile.label}</span>
            {tile.note ? <span className="mt-1 block text-xs opacity-80">{tile.note}</span> : null}
          </div>
        ))}
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight">{t("daysTitle")}</h2>
        <WeekBars stats={s} labels={Array.from({ length: 7 }, (_, i) => day(addDays(week, i), { weekday: "short" }))} max={maxDay} />
        <p className="text-sm text-neutral-700">
          {s.busiestHour === null ? t("noMessages") : t("busiest", { from: s.busiestHour, to: (s.busiestHour + 1) % 24 })}
        </p>
      </Card>

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl space-y-1">
            <h2 className="text-lg font-extrabold tracking-tight">{t("insightsTitle")}</h2>
            {saved ? (
              <p className="text-sm text-neutral-600">
                {t("analysedAt", { date: format.dateTime(new Date(saved.updatedAt), { dateStyle: "medium", timeStyle: "short" }), count: saved.messageCount })}
              </p>
            ) : (
              <p className="text-sm text-neutral-700">{t("insightsIntro")}</p>
            )}
          </div>
          {role === "owner" ? (
            s.customerMessages > 0 ? <AnalyseButton weekStart={week} again={Boolean(saved)} /> : null
          ) : saved ? null : (
            <p className="text-sm text-neutral-600">{t("ownerOnly")}</p>
          )}
        </div>

        {saved ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="space-y-2">
              <h3 className="font-bold">{t("topics")}</h3>
              <ol className="space-y-2">
                {saved.insights.topics.map((topic) => (
                  <li key={topic.topic} className="rounded-2xl bg-neutral-100 p-3">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{topic.topic}</span>
                      <span className="shrink-0 text-xs text-neutral-600">{t("inConversations", { count: topic.conversations })}</span>
                    </span>
                    {topic.example ? <span className="mt-1 block text-sm text-neutral-700">„{topic.example}“</span> : null}
                  </li>
                ))}
              </ol>
            </section>
            <section className="space-y-2">
              <h3 className="font-bold">{t("unanswered")}</h3>
              {saved.insights.unanswered.length ? (
                <ol className="space-y-2">
                  {saved.insights.unanswered.map((q) => (
                    <li key={q.question} className="rounded-2xl bg-pink-tint p-3">
                      <span className="block font-semibold text-pink-ink">{q.question}</span>
                      <span className="text-xs text-pink-ink/80">{t("inConversations", { count: q.conversations })}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-neutral-700">{t("unansweredEmpty")}</p>
              )}
            </section>
            <section className="space-y-2">
              <h3 className="font-bold">{t("suggested")}</h3>
              {saved.insights.suggested_faqs.length ? (
                <>
                  <p className="text-xs text-neutral-600">{t("suggestedHint")}</p>
                  <ol className="space-y-2">
                    {saved.insights.suggested_faqs.map((faq) => (
                      <li key={faq.question} className="space-y-2 rounded-2xl bg-lime-tint p-3">
                        <span className="block font-semibold">{faq.question}</span>
                        <span className="block text-xs text-neutral-700">{faq.reason}</span>
                        {role === "owner" ? (
                          <Link href={`/settings/faqs?add=${encodeURIComponent(faq.question)}`} className={buttonClass("secondary", "min-h-9 px-3 text-xs")}>
                            + {t("addFaq")}
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="text-sm text-neutral-700">{t("suggestedEmpty")}</p>
              )}
            </section>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/** Conversations per day as simple bars (Monday first). */
function WeekBars({ stats, labels, max }: { stats: WeekStats; labels: string[]; max: number }) {
  return (
    <div className="grid h-40 grid-cols-7 items-end gap-2 sm:gap-3">
      {stats.byWeekday.map((count, i) => (
        <div key={labels[i]} className="flex h-full flex-col items-center justify-end gap-1">
          <span className="text-xs font-semibold">{count}</span>
          <div className="w-full rounded-xl bg-ink" style={{ height: `${Math.max(4, (count / max) * 100)}%`, opacity: count ? 1 : 0.15 }} />
          <span className="text-xs text-neutral-700">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
