import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Inter, Shantell_Sans } from "next/font/google";
import { APP_NAME } from "@/config/app";
import "./globals.css";

// Self-hosted at build time: visitors' browsers never contact Google.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const hand = Shantell_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
  variable: "--font-hand-family",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f5",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`h-full ${inter.variable} ${hand.variable}`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
