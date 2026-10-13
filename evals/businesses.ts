import type { ReceptionistKnowledge } from "@/lib/ai/prompt";

const base = { timezone: "Europe/Prague", email: "", website: "", tone_notes: "" };
const service = (name: string, price_from: number | null, price_to: number | null = null, extra = {}) => ({
  name,
  description: "",
  price_from,
  price_to,
  currency: "CZK",
  price_note: "",
  duration_minutes: null,
  active: true,
  ...extra,
});
const week = (opens: string, closes: string, days = [1, 2, 3, 4, 5]) =>
  days.map((weekday) => ({ weekday, opens_at: opens, closes_at: closes }));

/** Test businesses modelled on the four pilot clients. All facts are made up for testing. */
export const BUSINESSES: Record<string, ReceptionistKnowledge> = {
  tattoo: {
    business: {
      ...base,
      name: "Inkoust Studio",
      type: "Tetovací studio",
      description: "Tetovací studio na Žižkově, specializace fine-line a blackwork.",
      address: "Seifertova 12, Praha 3",
      phone: "+420 777 111 222",
      booking_url: "https://reservio.com/inkoust",
      languages: ["cs", "en"],
      tone: "casual",
    },
    services: [
      service("Malé tetování (do 5 cm)", 1500, null, { duration_minutes: 60 }),
      service("Tetování na míru", 2500, 15000, { price_note: "podle velikosti, nezávazná konzultace zdarma" }),
      service("Konzultace návrhu", 0, null, { duration_minutes: 30 }),
    ],
    hours: week("11:00", "19:00", [2, 3, 4, 5, 6]),
    exceptions: [{ date: "2026-12-24", closed: true, opens_at: null, closes_at: null, note: "Vánoce" }],
    faqs: [
      { question: "Kolik je záloha?", answer: "Záloha je 1 000 Kč, platí se převodem do 48 hodin od rezervace a odečte se z ceny." },
      { question: "Od kolika let tetujete?", answer: "Tetujeme pouze od 18 let, s platným dokladem totožnosti." },
      { question: "Jak se starat o nové tetování?", answer: "První 3 dny fólie a mytí 2× denně, pak mazat hojivou mastí 2 týdny. Detailní návod dostanete po sezení." },
    ],
    rules: [
      { kind: "never_answer", content: "Přesná cena tetování na míru" },
      { kind: "never_answer", content: "Zdravotní otázky (alergie, hojení s komplikacemi, léky)" },
    ],
  },
  pilates: {
    business: {
      ...base,
      name: "Studio Balance",
      type: "Pilates studio",
      description: "Pilates studio na Vinohradech, lekce v malých skupinách do 8 lidí.",
      address: "Mánesova 40, Praha 2",
      phone: "+420 777 333 444",
      booking_url: "https://studio-balance.cz/rozvrh",
      languages: ["cs", "en"],
      tone: "friendly",
    },
    services: [
      service("Jednorázová lekce", 350, null, { duration_minutes: 55 }),
      service("Permanentka 10 lekcí", 3000, null, { price_note: "platnost 3 měsíce" }),
      service("Soukromá lekce", 1200, null, { duration_minutes: 55 }),
    ],
    hours: [...week("07:00", "21:00"), ...week("09:00", "13:00", [6])],
    exceptions: [],
    faqs: [
      { question: "Do kdy se můžu odhlásit z lekce?", answer: "Nejpozději 12 hodin před začátkem, jinak lekce propadá." },
      { question: "Je lekce vhodná pro začátečníky?", answer: "Ano, každou úterní a čtvrteční lekci v 18:00 vedeme pro začátečníky." },
      { question: "Co si mám vzít s sebou?", answer: "Pohodlné oblečení a ponožky. Podložky půjčujeme zdarma." },
    ],
    rules: [{ kind: "never_answer", content: "Cvičení při zranění nebo v těhotenství" }],
  },
  cafe: {
    business: {
      ...base,
      name: "Kavárna U Mostu",
      type: "Kavárna",
      description: "Výběrová kavárna u Karlova mostu, domácí dorty, snídaně do 12:00.",
      address: "Mostecká 5, Praha 1",
      phone: "+420 777 555 666",
      booking_url: "",
      languages: ["cs", "en"],
      tone: "friendly",
    },
    services: [service("Rezervace stolu", null, null, { price_note: "zdarma, pro 2–8 osob" })],
    hours: [...week("08:00", "20:00"), ...week("09:00", "18:00", [6, 7])],
    exceptions: [{ date: "2026-12-25", closed: true, opens_at: null, closes_at: null, note: "Vánoce" }],
    faqs: [
      { question: "Berete rezervace?", answer: "Ano, stůl pro 2–8 osob si můžete zarezervovat telefonicky na +420 777 555 666." },
      { question: "Máte Wi-Fi?", answer: "Ano, Wi-Fi je zdarma, heslo dostanete u baru." },
      { question: "Můžu přijít se psem?", answer: "Pejsci jsou vítáni, dáme jim misku s vodou." },
    ],
    rules: [{ kind: "never_answer", content: "Alergeny v konkrétních jídlech" }],
  },
  bikes: {
    business: {
      ...base,
      name: "Bike Clinic",
      type: "Servis kol a e-shop",
      description: "Servis jízdních kol a e-shop s díly v Holešovicích.",
      address: "Dukelských hrdinů 20, Praha 7",
      phone: "+420 777 777 888",
      booking_url: "https://bikeclinic.cz/servis",
      languages: ["cs", "en"],
      tone: "professional",
    },
    services: [
      service("Základní servis", 890, null, { duration_minutes: 60 }),
      service("Kompletní servis", 1990, null, { description: "včetně čištění a seřízení převodů a brzd" }),
      service("Výměna duše", 250, null, { price_note: "bez ceny duše" }),
    ],
    hours: week("09:00", "18:00"),
    exceptions: [],
    faqs: [
      { question: "Jak dlouho trvá servis?", answer: "Základní servis obvykle do 2 pracovních dnů, kompletní do 4 pracovních dnů." },
      { question: "Jak můžu vrátit zboží z e-shopu?", answer: "Do 14 dnů bez udání důvodu, formulář najdete na bikeclinic.cz/vraceni." },
    ],
    rules: [{ kind: "never_answer", content: "Stav konkrétní objednávky a skladová dostupnost" }],
  },
};
