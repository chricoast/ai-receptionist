import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import cs from "@/messages/cs.json";
import en from "@/messages/en.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});
}

const flatCs = flatten(cs);
const flatEn = flatten(en);

describe("translations", () => {
  it("Czech and English have exactly the same keys", () => {
    expect(Object.keys(flatCs).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("no translation is empty", () => {
    for (const [key, value] of Object.entries({ ...flatCs, ...flatEn })) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("every message is valid ICU syntax", () => {
    for (const [locale, messages] of [["cs", flatCs], ["en", flatEn]] as const) {
      for (const [key, value] of Object.entries(messages)) {
        expect(() => new IntlMessageFormat(value, locale), `${locale}:${key}`).not.toThrow();
      }
    }
  });

  it("uses correct Czech plural forms", () => {
    const format = (count: number) =>
      new IntlMessageFormat(flatCs["dashboard.checklist.services"], "cs").format({ count });
    expect(format(0)).toBe("Zatím žádné služby");
    expect(format(1)).toBe("1 služba");
    expect(format(3)).toBe("3 služby");
    expect(format(5)).toBe("5 služeb");
  });
});
