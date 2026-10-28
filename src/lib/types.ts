import type { Lang } from "./i18n";

export interface Business {
  owner_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string;
  currency: string;
  default_tax_rate: number;
  language: Lang;
  reminder_days: number[];
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  language: Lang;
}

export type DocKind = "quote" | "invoice";
export type DocStatus = "draft" | "sent" | "accepted" | "declined" | "paid" | "void";

export interface DocItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  position: number;
}

export interface Doc {
  id: string;
  kind: DocKind;
  number: string;
  status: DocStatus;
  client_id: string;
  issue_date: string;
  due_date: string | null;
  tax_rate: number;
  notes: string | null;
  public_token: string;
  reminders_paused: boolean;
  source_quote_id: string | null;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface DocWithRelations extends Doc {
  clients: { name: string; email: string | null } | null;
  document_items: DocItem[];
}

export interface Reminder {
  id: string;
  step: number;
  status: "sending" | "sent" | "failed" | "skipped";
  created_at: string;
}
