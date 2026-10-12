import { SettingsTabs } from "@/components/settings-tabs";
import { requireBusiness } from "@/lib/business";

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  await requireBusiness();
  return (
    <div className="space-y-6">
      <SettingsTabs />
      {children}
    </div>
  );
}
