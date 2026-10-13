import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Note } from "@/components/ui";
import { requireBusiness } from "@/lib/business";
import { isInboxFilter } from "@/lib/inbox/queries";
import { InboxShell } from "./inbox-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inbox");
  return { title: t("title") };
}

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const { business } = await requireBusiness();
  const { filter } = await searchParams;
  const t = await getTranslations("inbox");
  return (
    <InboxShell businessId={business.id} filter={isInboxFilter(filter) ? filter : "open"}>
      <div className="grid min-h-80 place-items-center rounded-3xl border-2 border-dashed border-neutral-300 p-8">
        <Note>{t("pick")}</Note>
      </div>
    </InboxShell>
  );
}
