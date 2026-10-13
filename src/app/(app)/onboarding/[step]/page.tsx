import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileSection } from "@/components/profile/profile-section";
import { buttonClass, Card, cn } from "@/components/ui";
import { getCurrentBusiness } from "@/lib/business";
import { isSection, SECTIONS } from "@/lib/profile/constants";

// Saving the basics can read the whole website in the background.
export const maxDuration = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default async function OnboardingStepPage({ params }: PageProps<"/onboarding/[step]">) {
  const { step } = await params;
  if (step !== "done" && !isSection(step)) notFound();

  const current = await getCurrentBusiness();
  if (!current && step !== "basics") redirect("/onboarding/basics");
  const t = await getTranslations("onboarding");

  if (step === "done") {
    return (
      <Card className="space-y-4 text-center">
        <div aria-hidden className="text-4xl">🎉</div>
        <h1 className="text-2xl font-semibold">{t("doneTitle")}</h1>
        <p className="text-neutral-600">{t("doneBody")}</p>
        <Link href="/dashboard" className={buttonClass("primary")}>
          {t("doneCta")}
        </Link>
      </Card>
    );
  }

  const index = SECTIONS.indexOf(step);
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium text-ink underline-offset-2">
          {t("stepOf", { current: index + 1, total: SECTIONS.length })} · {t(`steps.${step}`)}
        </p>
        <ol className="flex gap-1.5" aria-hidden>
          {SECTIONS.map((s, i) => (
            <li key={s} className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-ink" : "bg-neutral-200")} />
          ))}
        </ol>
        <p className="text-sm text-neutral-500">{t("changeLater")}</p>
      </div>
      <ProfileSection section={step} mode="onboarding" current={current} />
    </div>
  );
}
