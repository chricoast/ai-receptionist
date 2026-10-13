import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { buttonClass, Card } from "@/components/ui";

export default async function AuthErrorPage() {
  const t = await getTranslations("auth");
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Card>
        <h1 className="text-2xl font-semibold">{t("confirmFailedTitle")}</h1>
        <p className="mt-4 text-neutral-700">{t("confirmFailedBody")}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/login" className={buttonClass("primary")}>
            {t("loginLink")}
          </Link>
          <Link href="/forgot-password" className={buttonClass("secondary")}>
            {t("forgotSubmit")}
          </Link>
        </div>
      </Card>
    </main>
  );
}
