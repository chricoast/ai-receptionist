"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-stone-600">{t("body")}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => reset()}>{t("retry")}</Button>
        <Link href="/login" className={buttonClass("secondary")}>
          {t("login")}
        </Link>
      </div>
    </main>
  );
}
