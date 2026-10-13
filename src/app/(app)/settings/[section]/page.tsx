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

export default async function SettingsSectionPage({ params }: PageProps<"/settings/[section]">) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const current = await requireBusiness();
  return <ProfileSection section={section} mode="settings" current={current} />;
}
