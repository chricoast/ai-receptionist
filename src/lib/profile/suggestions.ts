import type { BusinessType, CustomerLanguage } from "./constants";

/**
 * Starting points shown during onboarding so owners don't face a blank page.
 * Only names and questions are suggested: prices, durations and answers always
 * come from the owner, so the receptionist never repeats something we made up.
 * Written in the business's main language, since this becomes business content.
 */

type Localized = Record<CustomerLanguage, string[]>;

type Suggestions = {
  services: Localized;
  faqs: Localized;
  neverAnswer: Localized;
};

const commonFaqs: Localized = {
  cs: [
    "Jak u vás můžu platit? Berete karty?",
    "Dá se u vás zaparkovat?",
    "Jak se k vám dostanu MHD?",
    "Mluvíte anglicky?",
  ],
  en: [
    "How can I pay? Do you take cards?",
    "Is there parking nearby?",
    "How do I get to you by public transport?",
    "Do you speak English?",
  ],
};

const commonNeverAnswer: Localized = {
  cs: ["Stížnosti a reklamace", "Vracení peněz", "Individuální slevy a ceny na míru"],
  en: ["Complaints", "Refunds", "Individual discounts and custom pricing"],
};

const byType: Record<BusinessType, Suggestions> = {
  salon: {
    services: {
      cs: ["Dámský střih", "Pánský střih", "Barvení", "Melír", "Foukaná", "Manikúra"],
      en: ["Women's haircut", "Men's haircut", "Colouring", "Highlights", "Blow-dry", "Manicure"],
    },
    faqs: {
      cs: [
        "Jak dlouho dopředu se musím objednat?",
        "Do kdy můžu termín zrušit?",
        "Jakou kosmetiku používáte?",
        "Můžu přijít bez objednání?",
      ],
      en: [
        "How far ahead do I need to book?",
        "How late can I cancel?",
        "Which products do you use?",
        "Can I walk in without an appointment?",
      ],
    },
    neverAnswer: {
      cs: ["Alergické reakce a zdravotní potíže pokožky"],
      en: ["Allergic reactions and skin health issues"],
    },
  },
  barber: {
    services: {
      cs: ["Střih", "Střih a vousy", "Úprava vousů", "Holení břitvou", "Dětský střih"],
      en: ["Haircut", "Haircut and beard", "Beard trim", "Straight razor shave", "Kids' haircut"],
    },
    faqs: {
      cs: ["Můžu přijít bez objednání?", "Do kdy můžu termín zrušit?", "Jak dlouho trvá střih?"],
      en: ["Can I walk in without an appointment?", "How late can I cancel?", "How long does a haircut take?"],
    },
    neverAnswer: { cs: [], en: [] },
  },
  clinic: {
    services: {
      cs: ["Vstupní vyšetření", "Fyzioterapie", "Sportovní masáž", "Relaxační masáž", "Kineziotaping"],
      en: ["Initial assessment", "Physiotherapy", "Sports massage", "Relaxing massage", "Kinesio taping"],
    },
    faqs: {
      cs: [
        "Potřebuji doporučení od lékaře?",
        "Hradí to pojišťovna?",
        "Co si mám vzít s sebou?",
        "Do kdy můžu termín zrušit?",
      ],
      en: [
        "Do I need a referral from a doctor?",
        "Is it covered by health insurance?",
        "What should I bring?",
        "How late can I cancel?",
      ],
    },
    neverAnswer: {
      cs: ["Zdravotní rady, diagnózy a doporučení léčby"],
      en: ["Medical advice, diagnoses and treatment recommendations"],
    },
  },
  tattoo: {
    services: {
      cs: ["Malé tetování", "Tetování na míru", "Konzultace návrhu", "Přetetování (cover-up)", "Piercing"],
      en: ["Small tattoo", "Custom tattoo", "Design consultation", "Cover-up", "Piercing"],
    },
    faqs: {
      cs: [
        "Kolik je záloha a jak ji zaplatím?",
        "Jak dlouho dopředu se musím objednat?",
        "Můžu si přinést vlastní návrh?",
        "Jak se o tetování starat po zákroku?",
        "Od kolika let se u vás můžu nechat tetovat?",
      ],
      en: [
        "How much is the deposit and how do I pay it?",
        "How far ahead do I need to book?",
        "Can I bring my own design?",
        "How do I take care of a new tattoo?",
        "What is the minimum age?",
      ],
    },
    neverAnswer: {
      cs: ["Přesná cena tetování na míru", "Zdravotní otázky (alergie, hojení, léky)"],
      en: ["Exact price of a custom tattoo", "Health questions (allergies, healing, medication)"],
    },
  },
  studio: {
    services: {
      cs: ["Jednorázová lekce", "Permanentka na 10 lekcí", "Měsíční členství", "Úvodní lekce", "Soukromá lekce"],
      en: ["Single class", "10-class pass", "Monthly membership", "Intro class", "Private session"],
    },
    faqs: {
      cs: [
        "Jak se přihlásím na lekci?",
        "Do kdy se můžu z lekce odhlásit?",
        "Je lekce vhodná pro začátečníky?",
        "Co si mám vzít s sebou?",
        "Jak dlouho platí permanentka?",
      ],
      en: [
        "How do I sign up for a class?",
        "How late can I cancel a class?",
        "Is it suitable for beginners?",
        "What should I bring?",
        "How long is a pass valid?",
      ],
    },
    neverAnswer: {
      cs: ["Cvičení při zranění nebo v těhotenství"],
      en: ["Exercising with an injury or during pregnancy"],
    },
  },
  cafe: {
    services: {
      cs: ["Rezervace stolu", "Snídaně", "Dorty na objednávku", "Soukromá akce"],
      en: ["Table reservation", "Breakfast", "Cakes to order", "Private event"],
    },
    faqs: {
      cs: [
        "Berete rezervace?",
        "Máte Wi-Fi?",
        "Můžu přijít se psem?",
        "Máte veganské nebo bezlepkové možnosti?",
        "Máte venkovní posezení?",
      ],
      en: [
        "Do you take reservations?",
        "Do you have Wi-Fi?",
        "Are dogs welcome?",
        "Do you have vegan or gluten-free options?",
        "Do you have outdoor seating?",
      ],
    },
    neverAnswer: {
      cs: ["Alergeny v konkrétních jídlech"],
      en: ["Allergens in specific dishes"],
    },
  },
  restaurant: {
    services: {
      cs: ["Rezervace stolu", "Polední menu", "Degustační menu", "Soukromá akce"],
      en: ["Table reservation", "Lunch menu", "Tasting menu", "Private event"],
    },
    faqs: {
      cs: [
        "Jak si můžu rezervovat stůl?",
        "Máte vegetariánská jídla?",
        "Můžu přijít s dětmi?",
        "Máte salonek pro větší skupiny?",
      ],
      en: [
        "How can I book a table?",
        "Do you have vegetarian dishes?",
        "Are children welcome?",
        "Do you have a private room for groups?",
      ],
    },
    neverAnswer: {
      cs: ["Alergeny v konkrétních jídlech"],
      en: ["Allergens in specific dishes"],
    },
  },
  service_shop: {
    services: {
      cs: ["Základní servis", "Kompletní servis", "Oprava na počkání", "Diagnostika"],
      en: ["Basic service", "Full service", "While-you-wait repair", "Diagnostics"],
    },
    faqs: {
      cs: [
        "Jak dlouho trvá oprava?",
        "Musím se na servis objednat?",
        "Jak můžu zboží vrátit nebo vyměnit?",
        "Jak dlouho trvá doručení objednávky?",
      ],
      en: [
        "How long does a repair take?",
        "Do I need to book a service?",
        "How can I return or exchange an item?",
        "How long does delivery take?",
      ],
    },
    neverAnswer: {
      cs: ["Stav konkrétní objednávky a skladová dostupnost"],
      en: ["Status of a specific order and stock availability"],
    },
  },
  agency: {
    services: {
      cs: ["Správa sociálních sítí", "Reklamní spot", "AI video", "Produkce videa na sociální sítě", "Úvodní konzultace"],
      en: ["Social media management", "Commercial", "AI video", "Social media video production", "Initial consultation"],
    },
    faqs: {
      cs: [
        "Jak probíhá spolupráce?",
        "Jak dlouho trvá výroba videa?",
        "S jakými značkami jste pracovali?",
        "Natáčíte i mimo Prahu?",
      ],
      en: [
        "How does working together work?",
        "How long does video production take?",
        "Which brands have you worked with?",
        "Do you shoot outside Prague?",
      ],
    },
    neverAnswer: {
      cs: ["Přesná cena projektu bez konzultace", "Termíny natáčení"],
      en: ["Exact project price without a consultation", "Shooting dates"],
    },
  },
  other: {
    services: { cs: [], en: [] },
    faqs: { cs: [], en: [] },
    neverAnswer: { cs: [], en: [] },
  },
};

const commonQuestions: Localized = {
  cs: [
    "Co přesně potřebujete?",
    "Pro jakou firmu nebo projekt to je?",
    "Do kdy to potřebujete?",
    "Jakou máte představu o rozpočtu?",
    "Kdy by se vám hodila krátká schůzka nebo hovor?",
  ],
  en: [
    "What exactly do you need?",
    "Which company or project is it for?",
    "When do you need it by?",
    "Do you have a budget in mind?",
    "When would suit you for a short meeting or call?",
  ],
};

/**
 * Guesses the closest category from what the owner wrote as their type of
 * business (Czech or English), so we can offer fitting suggestions.
 */
export function categorize(typeText: string): BusinessType {
  const t = typeText.toLowerCase();
  const rules: Array<[BusinessType, RegExp]> = [
    ["tattoo", /tetov|tattoo|piercing/],
    ["barber", /barber|holič/],
    ["salon", /kadeř|kosmet|salon|nehty|manikúr|beauty|hair|nail|lash|řas|vizáž/],
    ["clinic", /fyzio|masáž|masaz|klinik|ordinac|terap|zdrav|physio|massage|clinic|therap|osteo|dent|zub/],
    ["studio", /pilates|jóg|jog|yoga|fitness|posilov|cvič|studio|gym|tanec|dance|crossfit/],
    ["cafe", /kavár|kavar|café|cafe|coffee|bistro|cukrár|pekár|bakery/],
    ["restaurant", /restaur|hosp|bar\b|pizz|jídeln|food/],
    ["agency", /agentur|agency|marketing|produkc|production|reklam|social|sociáln|médi|media|video|design|grafi|brand/],
    ["service_shop", /servis|e-shop|eshop|obchod|shop|store|oprav|repair|kol[ao]|bike|cykl/],
  ];
  return (BUSINESS_TYPES_ORDER.includes(t as BusinessType) ? (t as BusinessType) : undefined) ??
    rules.find(([, re]) => re.test(t))?.[0] ??
    "other";
}

const BUSINESS_TYPES_ORDER = Object.keys(byType) as BusinessType[];

/** Suggestions for a type of business, in the language the owner is using. */
export function getSuggestions(type: string, language: string) {
  const t = byType[categorize(type)];
  const lang: CustomerLanguage = language === "en" ? "en" : "cs";
  return {
    services: t.services[lang],
    faqs: [...t.faqs[lang], ...commonFaqs[lang]],
    neverAnswer: [...t.neverAnswer[lang], ...commonNeverAnswer[lang]],
    questions: commonQuestions[lang],
  };
}

/** Service businesses usually want enquiries turned into meetings. */
export function suggestedGoal(type: string): "answer" | "meeting" {
  return categorize(type) === "agency" ? "meeting" : "answer";
}
