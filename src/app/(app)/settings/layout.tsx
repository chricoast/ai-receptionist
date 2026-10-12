import { getTranslations } from "next-intl/server";
import { SettingsTabs } from "@/components/settings-tabs";
import { requireBusiness } from "@/lib/business";

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  await requireBusiness();
  const t = await getTranslations("settings");
  return (
    <div className="space-y-6">
      <h1 className="sr-only">{t("title")}</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
