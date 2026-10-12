import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";
import { cn } from "./ui";

/** Works without JavaScript: each language is a tiny form. */
export async function LanguageSwitcher() {
  const current = await getLocale();
  const t = await getTranslations("common");
  return (
    <div role="group" className="flex items-center gap-1" aria-label={t("language")}>
      {locales.map((locale) => (
        <form key={locale} action={setLocale}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            lang={locale}
            aria-pressed={locale === current}
            title={t(`languageNames.${locale}`)}
            className={cn(
              "min-h-11 min-w-11 rounded-md px-2 text-sm font-medium uppercase",
              locale === current ? "bg-stone-200 text-stone-900" : "text-stone-500 hover:text-stone-900",
            )}
          >
            {locale}
          </button>
        </form>
      ))}
    </div>
  );
}
