import { z } from "zod";

/*
 * The website chat's look, per business (stored in channels.appearance).
 *
 * The chat is neutral by default so it fits any client's website; only the
 * lime smiley (our mark) is fixed. Everything here can be changed per client,
 * by the owner in Settings → Website chat, or by asking Claude for a theme as
 * JSON that matches `widgetThemeSchema` (e.g. "match the colours of
 * studiolinka.cz") and saving it. New options: add a field with a default
 * here; stored themes without it keep working.
 */

export const WIDGET_CORNERS = ["round", "soft", "square"] as const;
export const WIDGET_FONTS = ["system", "serif", "rounded"] as const;

/** Quick picks offered in settings (any other colour can be chosen too). */
export const ACCENT_PRESETS = ["#1F1F1F", "#2B2620", "#1D4ED8", "#166534", "#9F1239", "#6D28D9"] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex colour like #1F1F1F");

export const widgetThemeSchema = z.object({
  /** Customer's bubbles, buttons and the send button. */
  accent: hex.default("#1F1F1F"),
  /** Chat window background. */
  background: hex.default("#FFFFFF"),
  /** The receptionist's (and the team's) bubbles. */
  aiBubble: hex.default("#F5F5F4"),
  /** Main text colour. */
  text: hex.default("#1F1F1F"),
  corners: z.enum(WIDGET_CORNERS).default("round"),
  font: z.enum(WIDGET_FONTS).default("system"),
});

export type WidgetTheme = z.infer<typeof widgetThemeSchema>;

export const DEFAULT_WIDGET_THEME: WidgetTheme = widgetThemeSchema.parse({});

/** Reads a stored theme. Broken or unknown values fall back to the default, field by field. */
export function parseWidgetTheme(value: unknown): WidgetTheme {
  const input = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const shape = widgetThemeSchema.shape;
  const theme = { ...DEFAULT_WIDGET_THEME };
  for (const key of Object.keys(shape) as Array<keyof WidgetTheme>) {
    const parsed = shape[key].safeParse(input[key]);
    if (parsed.success) (theme as Record<string, unknown>)[key] = parsed.data;
  }
  return theme;
}

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1 to 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white, whichever is easier to read on the given background. */
export function readableTextOn(background: string): "#000000" | "#FFFFFF" {
  return contrastRatio(background, "#FFFFFF") >= contrastRatio(background, "#000000") ? "#FFFFFF" : "#000000";
}

/** Blends two hex colours (weight = share of `a`). */
function mix(a: string, b: string, weight: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return (
    "#" +
    [1, 3, 5]
      .map((i) => Math.round(channel(a, i) * weight + channel(b, i) * (1 - weight)).toString(16).padStart(2, "0"))
      .join("")
  );
}

const RADIUS: Record<WidgetTheme["corners"], string> = { round: "20px", soft: "12px", square: "4px" };
const FONT: Record<WidgetTheme["font"], string> = {
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif',
};

/** CSS variables the chat window uses (see chat-widget.tsx). */
export function widgetThemeStyle(theme: WidgetTheme): Record<`--w-${string}`, string> {
  // Text on the bubbles must stay readable whatever colours were chosen.
  const text = contrastRatio(theme.text, theme.background) >= 4.5 ? theme.text : readableTextOn(theme.background);
  const aiText = contrastRatio(text, theme.aiBubble) >= 4.5 ? text : readableTextOn(theme.aiBubble);
  return {
    "--w-accent": theme.accent,
    "--w-on-accent": readableTextOn(theme.accent),
    "--w-bg": theme.background,
    "--w-text": text,
    "--w-ai": theme.aiBubble,
    "--w-on-ai": aiText,
    // Secondary text and hairlines, derived from the text and background colours.
    "--w-muted": mix(text, theme.background, 0.7),
    "--w-border": mix(text, theme.background, 0.14),
    "--w-radius": RADIUS[theme.corners],
    "--w-font": FONT[theme.font],
  };
}
