import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ChatWidget } from "@/components/widget/chat-widget";
import { isLocale, type Locale } from "@/i18n/config";
import { findWidgetChannel } from "@/lib/chat/service";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

/**
 * The chat window shown inside the website's iframe (see public/widget.js).
 * Public: no login. The page only reveals the business name.
 */
export default async function WidgetPage({ params, searchParams }: PageProps<"/widget/[key]">) {
  const { key } = await params;
  const { lang, preview } = await searchParams;
  const locale: Locale = isLocale(lang) ? lang : await getLocale();

  const channel = await findWidgetChannel(key).catch(() => null);
  const messages = (await import(`../../../messages/${locale}.json`)).default;

  if (!channel || !channel.enabled) {
    return (
      <main className="grid h-dvh place-items-center bg-white p-6 text-center text-neutral-600">
        <p>{messages.widget.unavailable}</p>
      </main>
    );
  }

  // Only the widget texts are sent to the browser, in the visitor's language.
  return (
    <NextIntlClientProvider locale={locale} messages={{ widget: messages.widget }}>
      <ChatWidget
        publicKey={key}
        businessName={channel.businessName}
        language={locale}
        theme={channel.theme}
        preview={preview === "1"}
      />
    </NextIntlClientProvider>
  );
}
