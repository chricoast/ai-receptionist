import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const t = await getTranslations("home");
  const nav = await getTranslations("nav");

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <LanguageSwitcher />
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12">
        <h1 className="text-5xl font-extrabold tracking-tighter text-ink sm:text-6xl">{t("title")}</h1>
        <p className="mt-4 text-lg text-neutral-600">{t("subtitle")}</p>
        <ul className="mt-8 space-y-3">
          {(["instant", "honest", "control"] as const).map((key) => (
            <li key={key} className="flex gap-3 text-neutral-700">
              <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-lg bg-lime text-sm font-bold text-ink">✓</span>
              {t(`points.${key}`)}
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className={buttonClass("primary")}>
            {t("signup")}
          </Link>
          <Link href="/login" className={buttonClass("secondary")}>
            {t("login")}
          </Link>
        </div>
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-neutral-500">
        <Link href="/privacy" className="hover:text-neutral-800">
          {nav("privacy")}
        </Link>
      </footer>
    </div>
  );
}
