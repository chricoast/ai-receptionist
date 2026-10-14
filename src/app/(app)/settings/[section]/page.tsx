import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileSection } from "@/components/profile/profile-section";
import { requireBusiness } from "@/lib/business";
import { isSection } from "@/lib/profile/constants";

// Saving the basics can read the whole website in the background.
export const maxDuration = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsSectionPage({ params, searchParams }: PageProps<"/settings/[section]">) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const current = await requireBusiness();
  // "Add to FAQs" from the weekly summary: open the FAQs with that question ready to answer.
  const { add } = await searchParams;
  const question = typeof add === "string" ? add.trim().slice(0, 300) : "";
  const faqPrefill = section === "faqs" && question ? { id: randomUUID(), question } : undefined;
  return <ProfileSection section={section} mode="settings" current={current} faqPrefill={faqPrefill} />;
}
