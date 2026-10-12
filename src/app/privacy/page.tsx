import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { APP_NAME, OPERATOR } from "@/config/app";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: t("title") };
}

/**
 * Basic privacy policy. DRAFT: have it reviewed before onboarding paying
 * customers, and fill in OPERATOR.contactEmail in src/config/app.ts.
 */
const content = {
  cs: {
    updated: "Poslední aktualizace: 12. října 2026",
    sections: [
      {
        h: "Kdo jsme",
        p: [
          `Službu ${APP_NAME} provozuje ${OPERATOR.name} (${OPERATOR.website}). Pro podniky, které službu používají, zpracováváme osobní údaje jako zpracovatel; o údajích majitelů účtů rozhodujeme jako správce.`,
        ],
      },
      {
        h: "Jaké údaje zpracováváme",
        p: [
          "Účet: e-mail a heslo (heslo ukládáme jen v zašifrované podobě).",
          "Profil podniku: údaje, které zadáte (název, kontakty, služby, ceny, otevírací doba, časté dotazy, pravidla).",
          "Konverzace (od spuštění chatu): zprávy zákazníků podniku a odpovědi na ně.",
        ],
      },
      {
        h: "Proč je zpracováváme",
        p: [
          "Abychom mohli poskytovat službu: přihlášení, uložení profilu podniku a odpovídání zákazníkům jménem podniku. Údaje neprodáváme a nepoužíváme k reklamě.",
        ],
      },
      {
        h: "Kdo nám pomáhá",
        p: [
          "Supabase: databáze a přihlašování, data jsou uložena v EU (Frankfurt).",
          "Vercel: provoz webové aplikace.",
          "Anthropic: umělá inteligence, která píše odpovědi (od spuštění chatu).",
          "Poskytovatel e-mailů pro oznámení (od spuštění oznámení).",
        ],
      },
      {
        h: "Jak dlouho údaje uchováváme",
        p: [
          "Po dobu trvání účtu. Po zrušení účtu údaje smažeme, pokud nám zákon neukládá je uchovat déle.",
        ],
      },
      {
        h: "Vaše práva",
        p: [
          "Podle GDPR máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování, přenositelnost a právo vznést námitku. Stížnost můžete podat u Úřadu pro ochranu osobních údajů (uoou.gov.cz).",
        ],
      },
    ],
    contact: "Kontakt",
  },
  en: {
    updated: "Last updated: 12 October 2026",
    sections: [
      {
        h: "Who we are",
        p: [
          `${APP_NAME} is operated by ${OPERATOR.name} (${OPERATOR.website}). For the businesses using the service we process personal data as a processor; for account owners' data we are the controller.`,
        ],
      },
      {
        h: "What data we process",
        p: [
          "Account: email and password (passwords are only stored in encrypted form).",
          "Business profile: what you enter (name, contact details, services, prices, opening hours, FAQs, rules).",
          "Conversations (once the chat launches): messages from the business's customers and the replies to them.",
        ],
      },
      {
        h: "Why we process it",
        p: [
          "To provide the service: logging in, storing the business profile and answering customers on the business's behalf. We don't sell data or use it for advertising.",
        ],
      },
      {
        h: "Who helps us",
        p: [
          "Supabase: database and login; data is stored in the EU (Frankfurt).",
          "Vercel: hosting of the web app.",
          "Anthropic: the AI that writes replies (once the chat launches).",
          "An email provider for notifications (once notifications launch).",
        ],
      },
      {
        h: "How long we keep data",
        p: ["For as long as the account exists. When an account is closed we delete its data, unless the law requires us to keep it longer."],
      },
      {
        h: "Your rights",
        p: [
          "Under the GDPR you have the right to access, correct and delete your data, to restrict processing, to data portability and to object. You can lodge a complaint with the Czech Office for Personal Data Protection (uoou.gov.cz).",
        ],
      },
    ],
    contact: "Contact",
  },
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = await getTranslations("privacy");
  const c = content[locale];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Logo />
      <article className="mt-10 space-y-8">
        <header>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-sm text-stone-500">{c.updated}</p>
        </header>
        {c.sections.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p.map((p) => (
              <p key={p} className="text-stone-700">
                {p}
              </p>
            ))}
          </section>
        ))}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{c.contact}</h2>
          <p className="text-stone-700">
            {OPERATOR.contactEmail ? (
              <a href={`mailto:${OPERATOR.contactEmail}`} className="text-brand-700 underline">
                {OPERATOR.contactEmail}
              </a>
            ) : (
              <a href={OPERATOR.website} className="text-brand-700 underline">
                {OPERATOR.website}
              </a>
            )}
          </p>
        </section>
      </article>
    </div>
  );
}
