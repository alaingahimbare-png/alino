import type { TKey } from "../lib/i18n";
import { useI18n } from "../lib/i18n";
import type { DocStatus } from "../lib/types";

export default function StatusBadge({ status, overdue }: { status: DocStatus; overdue?: boolean }) {
  const { t } = useI18n();
  if (overdue) return <span className="badge late">{t("overdue")}</span>;
  return <span className={`badge ${status}`}>{t(`st_${status}` as TKey)}</span>;
}

export function isOverdue(d: { kind: string; status: string; due_date: string | null }): boolean {
  if (d.kind !== "invoice" || d.status !== "sent" || !d.due_date) return false;
  return d.due_date < new Date().toISOString().slice(0, 10);
}
