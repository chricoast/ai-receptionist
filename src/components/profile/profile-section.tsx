import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getBusinessProfile, type CurrentBusiness } from "@/lib/business";
import type { FormMode, Section } from "@/lib/profile/constants";
import { getKnowledgeSummary } from "@/lib/profile/knowledge";
import { getSuggestions, suggestedGoal } from "@/lib/profile/suggestions";
import { AssistantForm } from "./assistant-form";
import { BasicsForm } from "./basics-form";
import { ContactForm } from "./contact-form";
import { FaqsForm } from "./faqs-form";
import { HoursForm } from "./hours-form";
import { ServicesForm } from "./services-form";

/** Loads the data for one profile section and renders its form. */
export async function ProfileSection({
  section,
  mode,
  current,
  faqPrefill,
}: {
  section: Section;
  mode: FormMode;
  current: CurrentBusiness | null;
  /** A question to add to the FAQs (from the weekly summary). */
  faqPrefill?: { id: string; question: string };
}) {
  const readOnly = current !== null && current.role !== "owner";

  if (section === "basics") {
    const knowledge = current?.business.website
      ? await getKnowledgeSummary(current.business.id, current.business.use_website_knowledge)
      : null;
    return <BasicsForm business={current?.business ?? null} knowledge={knowledge} mode={mode} readOnly={readOnly} />;
  }
  if (!current) redirect("/onboarding/basics");

  const { business } = current;
  const profile = await getBusinessProfile(business.id);
  // Suggestions in the language the owner is using the app in.
  const suggestions = getSuggestions(business.type, await getLocale());

  switch (section) {
    case "contact":
      return <ContactForm business={business} mode={mode} readOnly={readOnly} />;
    case "services":
      return (
        <ServicesForm services={profile.services} suggestions={suggestions.services} mode={mode} readOnly={readOnly} />
      );
    case "hours":
      return <HoursForm hours={profile.hours} exceptions={profile.exceptions} mode={mode} readOnly={readOnly} />;
    case "faqs":
      return <FaqsForm faqs={profile.faqs} suggestions={suggestions.faqs} mode={mode} readOnly={readOnly} prefill={faqPrefill} />;
    case "assistant":
      return (
        <AssistantForm
          business={business}
          rules={profile.rules}
          suggestions={suggestions.neverAnswer}
          questionSuggestions={suggestions.questions}
          // During onboarding, propose the goal that fits the type of business.
          initialGoal={business.onboarding_completed_at ? business.goal : suggestedGoal(business.type)}
          mode={mode}
          readOnly={readOnly}
        />
      );
  }
}
