import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const t = await getTranslations();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <form action={logout}>
              <button type="submit" className={buttonClass("ghost", "min-h-9 px-3")} title={user.email}>
                {t("common.logout")}
              </button>
            </form>
          </div>
          <nav className="-mx-1 flex w-full gap-1 sm:w-auto sm:order-none">
            <Link href="/dashboard" className={buttonClass("ghost", "min-h-9 px-3")}>
              {t("nav.dashboard")}
            </Link>
            <Link href="/settings" className={buttonClass("ghost", "min-h-9 px-3")}>
              {t("nav.settings")}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">{children}</main>
    </div>
  );
}
