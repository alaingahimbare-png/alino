import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { computeTotals, formatDate, formatMoney } from "../../shared/totals";
import { isOverdue } from "../components/StatusBadge";
import { useI18n } from "../lib/i18n";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import type { DocWithRelations } from "../lib/types";

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { business } = useSession();
  const [docs, setDocs] = useState<DocWithRelations[] | null>(null);

  useEffect(() => {
    supabase
      .from("documents")
      .select("*, clients!documents_client_id_owner_id_fkey(name, email), document_items(quantity, unit_price_cents)")
      .eq("kind", "invoice")
      .in("status", ["sent", "paid"])
      .then(({ data }) => setDocs((data as DocWithRelations[]) ?? []));
  }, []);

  if (!business) return null;
  if (!docs) return <p className="muted">{t("loading")}</p>;

  const money = (c: number) => formatMoney(c, business.currency, lang);
  const total = (d: DocWithRelations) => computeTotals(d.document_items, d.tax_rate).total_cents;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const unpaid = docs.filter((d) => d.status === "sent");
  const late = unpaid.filter(isOverdue).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
  const paidMonth = docs.filter((d) => d.status === "paid" && d.paid_at && new Date(d.paid_at) >= monthStart);
  const sum = (list: DocWithRelations[]) => list.reduce((s, d) => s + total(d), 0);
  const today = Date.now();

  return (
    <div className="stack-lg">
      {!business.name && (
        <p className="notice">
          <Link to="/settings">{t("setupBusiness")}</Link>
        </p>
      )}
      {!business.stripe_charges_enabled && (
        <p className="notice">
          <Link to="/settings">{t("setupStripe")}</Link>
        </p>
      )}
      <div className="row wrap">
        <Link to="/new/invoice" className="btn primary">
          {t("newInvoice")}
        </Link>
        <Link to="/new/quote" className="btn">
          {t("newQuote")}
        </Link>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">{t("outstanding")}</div>
          <div className="stat-value">{money(sum(unpaid))}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t("overdue")}</div>
          <div className={`stat-value ${late.length ? "danger" : ""}`}>{money(sum(late))}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t("paidThisMonth")}</div>
          <div className="stat-value ok">{money(sum(paidMonth))}</div>
        </div>
      </div>
      <section className="card">
        <h2>{t("overdueInvoices")}</h2>
        {late.length === 0 ? (
          <p className="muted">{t("noOverdue")}</p>
        ) : (
          <ul className="list">
            {late.map((d) => (
              <li key={d.id}>
                <Link to={`/documents/${d.id}`} className="list-row">
                  <span>
                    <strong>{d.number}</strong> · {d.clients?.name}
                    <br />
                    <span className="muted small">
                      {formatDate(d.due_date, lang)} ·{" "}
                      {Math.floor((today - new Date(`${d.due_date}T00:00:00`).getTime()) / 86_400_000)} {t("daysLate")}
                    </span>
                  </span>
                  <strong>{money(total(d))}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
