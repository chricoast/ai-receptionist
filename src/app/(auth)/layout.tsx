import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <LanguageSwitcher />
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-6 sm:pt-12">{children}</main>
    </div>
  );
}
