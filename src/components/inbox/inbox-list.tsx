import Link from "next/link";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { cn, Pill } from "@/components/ui";
import { INBOX_FILTERS, type InboxFilter, type InboxItem } from "@/lib/inbox/queries";

export const inboxHref = (path: string, filter: InboxFilter) => (filter === "open" ? path : `${path}?filter=${filter}`);

/** Grey initials (no colours, so the list stays calm). */
export function Initials({ name, className }: { name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn("grid size-10 shrink-0 place-items-center rounded-2xl bg-neutral-100 text-sm font-bold text-neutral-700", className)}
    >
      {letters || (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="10" cy="7" r="3.5" />
          <path d="M3.5 17c1.2-3.2 3.6-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
        </svg>
      )}
    </span>
  );
}

export async function StatusPill({ status }: { status: InboxItem["status"] }) {
  const t = await getTranslations("inbox.status");
  if (status === "needs_human") return <Pill tone="pink">{t("needs_human")}</Pill>;
  if (status === "human_active") return <Pill tone="dark">{t("human_active")}</Pill>;
  if (status === "closed") return <Pill>{t("closed")}</Pill>;
  return <Pill tone="lime">{t("ai_active")}</Pill>;
}

export async function InboxTabs({ filter, waiting, base }: { filter: InboxFilter; waiting: number; base: string }) {
  const t = await getTranslations("inbox.filters");
  const label = (await getTranslations("inbox"))("title");
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {INBOX_FILTERS.map((f) => (
        <Link
          key={f}
          href={inboxHref(base, f)}
          aria-current={f === filter ? "page" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm",
            f === filter ? "bg-ink font-semibold text-white" : "bg-neutral-100 text-ink hover:bg-neutral-200",
          )}
        >
          {t(f)}
          {f === "waiting" && waiting > 0 ? (
            <span className="rounded-full bg-pink px-1.5 text-xs font-bold text-ink">{waiting}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export async function InboxList({
  items,
  filter,
  activeId,
}: {
  items: InboxItem[];
  filter: InboxFilter;
  activeId?: string;
}) {
  const t = await getTranslations("inbox");
  const format = await getFormatter();
  const now = await getNow();
  const day = (d: Date) => format.dateTime(d, { year: "numeric", month: "numeric", day: "numeric" });

  if (!items.length) return <p className="px-2 py-6 text-sm text-neutral-600">{t(`empty.${filter}`)}</p>;

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const when = new Date(item.last_message_at);
        const name = item.contact?.name || t("visitor");
        return (
          <li key={item.id}>
            <Link
              href={inboxHref(`/inbox/${item.id}`, filter)}
              aria-current={item.id === activeId ? "page" : undefined}
              className={cn(
                "flex gap-3 rounded-2xl p-3 transition-colors",
                item.id === activeId ? "bg-neutral-100" : "hover:bg-neutral-50",
              )}
            >
              <Initials name={item.contact?.name ?? ""} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate", item.status === "needs_human" ? "font-bold" : "font-semibold")}>{name}</span>
                  <time dateTime={item.last_message_at} className="shrink-0 text-xs text-neutral-600">
                    {day(when) === day(now) ? format.dateTime(when, { timeStyle: "short" }) : format.dateTime(when, { day: "numeric", month: "numeric" })}
                  </time>
                </span>
                <span className="line-clamp-1 text-sm text-neutral-700">{item.last_message || "…"}</span>
                <span className="flex flex-wrap gap-1">
                  <StatusPill status={item.status} />
                  {item.lead_at ? <Pill tone="blue">{t("lead")}</Pill> : null}
                  {item.is_test ? <Pill>{t("test")}</Pill> : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
