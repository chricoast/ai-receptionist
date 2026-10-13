import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConversationView } from "@/components/inbox/conversation-view";
import { inboxHref } from "@/components/inbox/inbox-list";
import { requireBusiness } from "@/lib/business";
import { getConversationDetail, isInboxFilter } from "@/lib/inbox/queries";
import { InboxShell } from "../inbox-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inbox");
  return { title: t("title") };
}

export default async function ConversationPage({ params, searchParams }: PageProps<"/inbox/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { business } = await requireBusiness();
  const { filter: rawFilter } = await searchParams;
  const filter = isInboxFilter(rawFilter) ? rawFilter : "open";

  // Row Level Security only returns conversations of the user's own business.
  const detail = await getConversationDetail(business.id, id);
  if (!detail) notFound();
  const t = await getTranslations("inbox");

  return (
    <InboxShell businessId={business.id} filter={filter} activeId={id}>
      <Link href={inboxHref("/inbox", filter)} className="mb-2 inline-flex min-h-11 items-center text-sm font-semibold lg:hidden">
        ← {t("back")}
      </Link>
      <ConversationView detail={detail} businessName={business.name} />
    </InboxShell>
  );
}
