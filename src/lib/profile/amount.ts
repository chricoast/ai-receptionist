/**
 * Reads numbers the way people type them in Czech: "1 250,50", "1250.5", "450".
 * Returns null for an empty field, and the raw text if it isn't a number, so the
 * server rejects it with a clear message instead of silently dropping the price.
 */
export function parseAmount(raw: string): number | null | string {
  const cleaned = raw.trim().replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  return /^\d+(\.\d{1,2})?$/.test(cleaned) ? Number(cleaned) : raw;
}
