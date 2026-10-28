// Calcul des montants, partagé entre le navigateur et le serveur.
// Tous les montants sont en centimes (entiers) pour éviter les erreurs d'arrondi.

export interface LineInput {
  quantity: number | string;
  unit_price_cents: number | string;
}

export interface Totals {
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
}

export function lineTotalCents(item: LineInput): number {
  return Math.round(Number(item.quantity) * Number(item.unit_price_cents));
}

export function computeTotals(items: LineInput[], taxRate: number | string): Totals {
  const subtotal = items.reduce((sum, it) => sum + lineTotalCents(it), 0);
  const tax = Math.round((subtotal * Number(taxRate)) / 100);
  return { subtotal_cents: subtotal, tax_cents: tax, total_cents: subtotal + tax };
}

export function formatMoney(cents: number, currency: string, lang: "fr" | "en"): string {
  const locale = lang === "fr" ? "fr-CA" : "en-CA";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export function formatDate(iso: string | null | undefined, lang: "fr" | "en"): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }).format(d);
}
