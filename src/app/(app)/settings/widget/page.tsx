import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/copy-button";
import { Alert, buttonClass, Card } from "@/components/ui";
import { requireBusiness } from "@/lib/business";
import { setWidgetEnabled } from "@/lib/chat/actions";
import { getOrCreateWebChat } from "@/lib/chat/channel";
import { parseWidgetTheme } from "@/lib/chat/theme";
import { AppearanceForm } from "@/components/widget/appearance-form";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.widget");
  return { title: t("tab") };
}

export default async function WidgetSettingsPage() {
  const current = await requireBusiness();
  const channel = await getOrCreateWebChat(current);
  const t = await getTranslations("settings.widget");
  const locale = await getLocale();

  if (!channel) {
    return <Alert tone="info">{t("staffOnly")}</Alert>;
  }

  const snippet = `<script src="${await getSiteUrl()}/widget.js" data-key="${channel.public_key}" async></script>`;
  const isOwner = current.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-neutral-600">{t("intro")}</p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{t("status")}</p>
          <p className={channel.enabled ? "text-sm font-medium text-ink underline-offset-2" : "text-sm text-neutral-600"}>
            {channel.enabled ? `● ${t("on")}` : `○ ${t("off")}`}
          </p>
          {channel.enabled ? null : <p className="mt-1 text-sm text-neutral-500">{t("offHint")}</p>}
        </div>
        {isOwner ? (
          <form action={setWidgetEnabled}>
            <input type="hidden" name="enabled" value={channel.enabled ? "false" : "true"} />
            <button type="submit" className={buttonClass(channel.enabled ? "secondary" : "primary")}>
              {channel.enabled ? t("turnOff") : t("turnOn")}
            </button>
          </form>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{t("snippetTitle")}</h2>
        <pre className="overflow-x-auto rounded-2xl bg-ink p-4 text-sm text-neutral-100">
          <code>{snippet}</code>
        </pre>
        <CopyButton text={snippet} label={t("copy")} copiedLabel={t("copied")} />
        <p className="text-sm text-neutral-600">{t("snippetHint")}</p>
      </Card>

      {isOwner ? (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t("appearanceTitle")}</h2>
            <p className="text-sm text-neutral-600">{t("appearanceIntro")}</p>
          </div>
          <AppearanceForm initial={parseWidgetTheme(channel.appearance)} businessName={current.business.name} />
        </Card>
      ) : null}

      {channel.enabled ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">{t("tryTitle")}</h2>
          <p className="text-sm text-neutral-600">{t("tryHint")}</p>
          <iframe
            key={channel.updated_at}
            title={t("tryTitle")}
            src={`/widget/${channel.public_key}?preview=1&lang=${locale}`}
            className="h-[600px] w-full max-w-md rounded-3xl border border-neutral-200 bg-white"
          />
        </Card>
      ) : null}
    </div>
  );
}
