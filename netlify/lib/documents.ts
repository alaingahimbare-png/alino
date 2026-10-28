import { computeTotals, type Totals } from "../../shared/totals";
import { HttpError, supabaseAdmin } from "./server";

export interface FullDocument {
  id: string;
  owner_id: string;
  kind: "quote" | "invoice";
  number: string;
  status: "draft" | "sent" | "accepted" | "declined" | "paid" | "void";
  issue_date: string;
  due_date: string | null;
  tax_rate: number;
  notes: string | null;
  public_token: string;
  reminders_paused: boolean;
  paid_at: string | null;
  stripe_checkout_session_id: string | null;
  client: { id: string; name: string; email: string | null; address: string | null; language: "fr" | "en" };
  items: { description: string; quantity: number; unit_price_cents: number; position: number }[];
  business: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    currency: string;
    language: "fr" | "en";
    reminder_days: number[];
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean;
  };
  totals: Totals;
}

const SELECT = `id, owner_id, kind, number, status, issue_date, due_date, tax_rate, notes, public_token,
  reminders_paused, paid_at, stripe_checkout_session_id,
  client:clients!documents_client_id_owner_id_fkey(id, name, email, address, language),
  items:document_items(description, quantity, unit_price_cents, position),
  business:businesses(name, email, phone, address, currency, language, reminder_days, stripe_account_id, stripe_charges_enabled)`;

/** Charge un document complet par id ou par jeton public (service role, donc filtrer soigneusement). */
export async function loadDocument(by: { id: string } | { token: string }): Promise<FullDocument> {
  let q = supabaseAdmin().from("documents").select(SELECT);
  q = "id" in by ? q.eq("id", by.id) : q.eq("public_token", by.token);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "not_found");
  const doc = data as unknown as Omit<FullDocument, "totals">;
  doc.items.sort((a, b) => a.position - b.position);
  return { ...doc, totals: computeTotals(doc.items, doc.tax_rate) };
}
