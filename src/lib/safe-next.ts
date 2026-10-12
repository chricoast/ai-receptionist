/**
 * Only allow redirects to our own pages (never to another website).
 * Parses the value the same way a browser would (which, for example, silently
 * drops tabs and newlines: "/\t/evil.com" becomes "//evil.com") and accepts it
 * only if it stays on our own origin.
 */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  const base = "http://app.invalid";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return fallback;
  }
  if (url.origin !== base) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
