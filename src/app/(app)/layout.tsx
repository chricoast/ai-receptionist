import { getTranslations } from "next-intl/server";
import { AppNav } from "@/components/app-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { buttonClass, cn } from "@/components/ui";
import { AI_TEAM } from "@/config/app";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";
import { getCurrentBusiness } from "@/lib/business";
import { countWaiting } from "@/lib/inbox/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const current = await getCurrentBusiness();
  const waiting = current ? await countWaiting(current.business.id) : 0;
  const t = await getTranslations();

  const account = (
    <div className="flex shrink-0 items-center gap-1">
      <LanguageSwitcher />
      <form action={logout}>
        <button type="submit" className={buttonClass("ghost", "whitespace-nowrap px-3")} title={user.email}>
          {t("common.logout")}
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex flex-1">
      {/* Computers: side menu */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-7 overflow-y-auto px-4 py-6 lg:flex">
        <div className="px-1.5">
          <Logo href="/dashboard" subtitle={current?.business.name} />
        </div>
        <AppNav variant="side" waiting={waiting} />
        <div className="space-y-2 px-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">{t("team.title")}</p>
          <ul className="space-y-1.5">
            {AI_TEAM.map((member) => (
              <li
                key={member.key}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm",
                  member.active ? "bg-ink font-bold text-white" : "bg-white text-neutral-700",
                )}
              >
                {t(`team.${member.key}`)}
                <span className={cn("block text-xs font-normal", member.active ? "text-lime" : "text-neutral-600")}>
                  {member.active ? t("team.working") : t("team.soon")}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto">{account}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phones: top bar */}
        <header className="flex items-center justify-between gap-2 px-4 py-3 lg:hidden">
          <Logo href="/dashboard" title={current?.business.name || undefined} />
          {account}
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-2 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <AppNav variant="bottom" waiting={waiting} />
    </div>
  );
}
