import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  DEFAULT_WIDGET_THEME,
  parseWidgetTheme,
  readableTextOn,
  widgetThemeSchema,
  widgetThemeStyle,
} from "@/lib/chat/theme";

describe("widget theme", () => {
  it("is neutral by default", () => {
    expect(DEFAULT_WIDGET_THEME).toEqual({
      accent: "#1F1F1F",
      background: "#FFFFFF",
      aiBubble: "#F5F5F4",
      text: "#1F1F1F",
      corners: "round",
      font: "system",
    });
  });

  it("keeps valid fields and replaces broken ones with defaults", () => {
    expect(parseWidgetTheme({ accent: "#1d4ed8", corners: "pointy", font: 42, extra: "x" })).toEqual({
      ...DEFAULT_WIDGET_THEME,
      accent: "#1d4ed8",
    });
    expect(parseWidgetTheme(null)).toEqual(DEFAULT_WIDGET_THEME);
    expect(parseWidgetTheme("red")).toEqual(DEFAULT_WIDGET_THEME);
    expect(parseWidgetTheme([])).toEqual(DEFAULT_WIDGET_THEME);
  });

  it("only accepts 6-digit hex colours", () => {
    expect(widgetThemeSchema.safeParse({ accent: "red" }).success).toBe(false);
    expect(widgetThemeSchema.safeParse({ accent: "#fff" }).success).toBe(false);
    expect(widgetThemeSchema.safeParse({ accent: "#ffffff; background:url(x)" }).success).toBe(false);
    expect(widgetThemeSchema.safeParse({ accent: "#C6F02E" }).success).toBe(true);
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("puts readable text on any accent", () => {
    expect(readableTextOn("#1F1F1F")).toBe("#FFFFFF");
    expect(readableTextOn("#1D4ED8")).toBe("#FFFFFF");
    expect(readableTextOn("#C6F02E")).toBe("#000000");
    expect(readableTextOn("#FFE14D")).toBe("#000000");
  });

  it("never produces unreadable text, whatever the colours", () => {
    const style = widgetThemeStyle({ ...DEFAULT_WIDGET_THEME, background: "#111111", text: "#222222", aiBubble: "#EEEEEE" });
    expect(style["--w-text"]).toBe("#FFFFFF");
    expect(style["--w-on-ai"]).toBe("#000000");
    expect(contrastRatio(style["--w-on-accent"], DEFAULT_WIDGET_THEME.accent)).toBeGreaterThan(4.5);
  });
});

describe("widget theme secondary colours", () => {
  it("keeps secondary text readable on the default and a dark theme", () => {
    const light = widgetThemeStyle(DEFAULT_WIDGET_THEME);
    expect(contrastRatio(light["--w-muted"], DEFAULT_WIDGET_THEME.background)).toBeGreaterThan(4.5);
    const darkTheme = { ...DEFAULT_WIDGET_THEME, background: "#111111", text: "#F5F5F5", aiBubble: "#262626" };
    const dark = widgetThemeStyle(darkTheme);
    expect(contrastRatio(dark["--w-muted"], darkTheme.background)).toBeGreaterThan(4.5);
  });
});
