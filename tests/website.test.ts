import { describe, expect, it } from "vitest";
import { pageToText } from "@/lib/ai/website";

describe("website import: page to text", () => {
  it("keeps title, meta description, visible text and booking/contact links; drops scripts and styles", () => {
    const html = `<html><head><title>Kavárna U Mostu &amp; pekárna</title>
      <meta name="description" content="Výběrová káva u Karlova mostu">
      <style>.x{color:red}</style><script>alert("x")</script></head>
      <body><h1>Vítejte</h1><p>Otevřeno denně&nbsp;8–20</p>
      <a href="https://reservio.com/kavarna">Rezervace</a><a href="https://instagram.com/x">IG</a>
      <a href="tel:+420777555666">Zavolejte</a></body></html>`;
    const text = pageToText(html);
    expect(text).toContain("Title: Kavárna U Mostu & pekárna");
    expect(text).toContain("Meta description: Výběrová káva u Karlova mostu");
    expect(text).toContain("Otevřeno denně 8–20");
    expect(text).toContain("https://reservio.com/kavarna");
    expect(text).toContain("tel:+420777555666");
    expect(text).not.toContain("instagram");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
  });
});

import { isPrivateAddress } from "@/lib/ai/website";

describe("website import: never fetches internal addresses", () => {
  it("blocks loopback, private, link-local and cloud metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it("allows public addresses", () => {
    for (const ip of ["93.184.216.34", "185.199.108.153", "2606:4700::6810:85e5"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});
