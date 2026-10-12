import { redirect } from "next/navigation";
import { getBusinessProfile, type CurrentBusiness } from "@/lib/business";
import type { FormMode, Section } from "@/lib/profile/constants";
import { getSuggestions } from "@/lib/profile/suggestions";
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
}: {
  section: Section;
  mode: FormMode;
  current: CurrentBusiness | null;
}) {
  const readOnly = current !== null && current.role !== "owner";

  if (section === "basics") {
    return <BasicsForm business={current?.business ?? null} mode={mode} readOnly={readOnly} />;
  }
  if (!current) redirect("/onboarding/basics");

  const { business } = current;
  const profile = await getBusinessProfile(business.id);
  const suggestions = getSuggestions(business.type, business.languages[0]);

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
      return <FaqsForm faqs={profile.faqs} suggestions={suggestions.faqs} mode={mode} readOnly={readOnly} />;
    case "assistant":
      return (
        <AssistantForm
          business={business}
          rules={profile.rules}
          suggestions={suggestions.neverAnswer}
          mode={mode}
          readOnly={readOnly}
        />
      );
  }
}
