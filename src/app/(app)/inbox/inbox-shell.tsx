import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { InboxList, InboxTabs } from "@/components/inbox/inbox-list";
import { LiveRefresh } from "@/components/inbox/live-refresh";
import { cn } from "@/components/ui";
import { countWaiting, listConversations, type InboxFilter } from "@/lib/inbox/queries";

/**
 * Two panes on computers (list + conversation); on phones either the list or
 * the open conversation.
 */
export async function InboxShell({
  businessId,
  filter,
  activeId,
  children,
}: {
  businessId: string;
  filter: InboxFilter;
  activeId?: string;
  children: ReactNode;
}) {
  const t = await getTranslations("inbox");
  const [items, waiting] = await Promise.all([listConversations(businessId, filter), countWaiting(businessId)]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:items-start">
      <LiveRefresh businessId={businessId} />
      <section className={cn("space-y-3 rounded-3xl bg-white p-3 sm:p-4", activeId && "hidden lg:block")}>
        <h1 className="px-1 text-2xl font-extrabold tracking-tight">{t("title")}</h1>
        <InboxTabs filter={filter} waiting={waiting} base="/inbox" />
        <InboxList items={items} filter={filter} activeId={activeId} />
      </section>
      <div className={cn("min-w-0", !activeId && "hidden lg:block")}>{children}</div>
    </div>
  );
}
