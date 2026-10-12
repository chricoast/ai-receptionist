import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/business";
import { isSection } from "@/lib/profile/constants";

/** Sends the owner back to the step where they left off. */
export default async function OnboardingIndex() {
  const current = await getCurrentBusiness();
  const step = current?.business.onboarding_step;
  if (step === "done") redirect("/onboarding/done");
  redirect(`/onboarding/${current && isSection(step) ? step : "basics"}`);
}
