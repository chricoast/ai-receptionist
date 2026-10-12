import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { AppNav } from "@/components/app-nav";
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
              <button type="submit" className={buttonClass("ghost", "px-3")} title={user.email}>
                {t("common.logout")}
              </button>
            </form>
          </div>
          <AppNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">{children}</main>
    </div>
  );
}
