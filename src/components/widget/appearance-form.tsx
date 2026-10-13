"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, cn } from "@/components/ui";
import { Smiley } from "@/components/smiley";
import { saveWidgetAppearance, type AppearanceState } from "@/lib/chat/actions";
import {
  ACCENT_PRESETS,
  DEFAULT_WIDGET_THEME,
  WIDGET_CORNERS,
  WIDGET_FONTS,
  widgetThemeStyle,
  type WidgetTheme,
} from "@/lib/chat/theme";

/** Owner picks the website chat's colour, corners and font, with a live preview. */
export function AppearanceForm({ initial, businessName }: { initial: WidgetTheme; businessName: string }) {
  const t = useTranslations("settings.widget");
  const tw = useTranslations("widget");
  const [theme, setTheme] = useState<WidgetTheme>(initial);
  const [state, setState] = useState<AppearanceState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<WidgetTheme>) => setTheme((current) => ({ ...current, ...patch }));

  const save = () => startTransition(async () => setState(await saveWidgetAppearance(theme)));

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t("accent")}</legend>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((color) => (
              <label
                key={color}
                className={cn(
                  "grid size-11 cursor-pointer place-items-center rounded-2xl ring-offset-2 has-[:checked]:ring-2 has-[:checked]:ring-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink",
                )}
                style={{ background: color }}
              >
                <input
                  type="radio"
                  name="accent"
                  className="sr-only"
                  checked={theme.accent.toLowerCase() === color.toLowerCase()}
                  onChange={() => set({ accent: color })}
                />
                <span className="sr-only">{color}</span>
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-3 text-sm">
              <input
                type="color"
                value={theme.accent}
                onChange={(e) => set({ accent: e.target.value.toUpperCase() })}
                className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              {t("customColor")}
            </label>
          </div>
          <p className="text-sm text-neutral-600">{t("accentHint")}</p>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t("corners")}</legend>
          <div className="flex flex-wrap gap-2">
            {WIDGET_CORNERS.map((value) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-3 text-sm has-[:checked]:border-ink">
                <input type="radio" name="corners" className="accent-ink" checked={theme.corners === value} onChange={() => set({ corners: value })} />
                {t(`cornerOptions.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">{t("font")}</legend>
          <div className="flex flex-wrap gap-2">
            {WIDGET_FONTS.map((value) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border-2 border-neutral-200 bg-white px-3 text-sm has-[:checked]:border-ink">
                <input type="radio" name="font" className="accent-ink" checked={theme.font === value} onChange={() => set({ font: value })} />
                {t(`fontOptions.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={pending}>
            {t("saveAppearance")}
          </Button>
          <Button variant="ghost" onClick={() => setTheme(DEFAULT_WIDGET_THEME)} disabled={pending}>
            {t("reset")}
          </Button>
        </div>
        {state.status === "saved" ? <Alert tone="success">{t("appearanceSaved")}</Alert> : null}
        {state.status === "error" ? <Alert>{t("appearanceFailed")}</Alert> : null}
      </div>

      {/* Live preview of the chosen look (before saving). */}
      <div
        aria-hidden
        className="overflow-hidden rounded-3xl border border-(--w-border) bg-(--w-bg) font-(family-name:--w-font) text-(--w-text)"
        style={widgetThemeStyle(theme) as CSSProperties}
      >
        <div className="flex items-center gap-2.5 border-b border-(--w-border) px-3 py-2.5">
          <Smiley size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{businessName}</p>
            <p className="truncate text-[11px] text-(--w-muted)">{tw("subtitle")}</p>
          </div>
        </div>
        <div className="space-y-2 p-3 text-sm">
          <p className="w-fit max-w-[85%] rounded-(--w-radius) rounded-bl-md bg-(--w-ai) px-3 py-2 text-(--w-on-ai)">
            {tw("greeting", { business: businessName })}
          </p>
          <p className="ml-auto w-fit max-w-[85%] rounded-(--w-radius) rounded-br-md bg-(--w-accent) px-3 py-2 text-(--w-on-accent)">…?</p>
          <div className="flex gap-2 pt-2">
            <span className="h-9 flex-1 rounded-[calc(var(--w-radius)*0.7)] border border-(--w-border)" />
            <span className="size-9 rounded-[calc(var(--w-radius)*0.7)] bg-(--w-accent)" />
          </div>
        </div>
      </div>
    </div>
  );
}
