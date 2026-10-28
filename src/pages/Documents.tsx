import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { computeTotals, formatDate, formatMoney } from "../../shared/totals";
import StatusBadge, { isOverdue } from "../components/StatusBadge";
import { useI18n } from "../lib/i18n";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";
import type { DocKind, DocWithRelations } from "../lib/types";

export default function Documents({ kind }: { kind: DocKind }) {
  const { t, lang } = useI18n();
  const { business } = useSession();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocWithRelations[] | null>(null);

  useEffect(() => {
    setDocs(null);
    supabase
      .from("documents")
      .select("*, clients!documents_client_id_owner_id_fkey(name, email), document_items(quantity, unit_price_cents)")
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setDocs((data as DocWithRelations[]) ?? []));
  }, [kind]);

  if (!business) return null;

  return (
    <div className="stack-lg">
      <div className="row spread">
        <h1>{kind === "invoice" ? t("navInvoices") : t("navQuotes")}</h1>
        <Link to={`/new/${kind}`} className="btn primary">
          {kind === "invoice" ? t("newInvoice") : t("newQuote")}
        </Link>
      </div>
      {!docs ? (
        <p className="muted">{t("loading")}</p>
      ) : docs.length === 0 ? (
        <p className="muted">{t("noDocuments")}</p>
      ) : (
        <div className="card flush">
          <table className="table clickable">
            <thead>
              <tr>
                <th>{t("number")}</th>
                <th>{t("client")}</th>
                <th className="hide-sm">{kind === "invoice" ? t("dueDate") : t("issueDate")}</th>
                <th className="num">{t("total")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
                  <td>
                    <Link to={`/documents/${d.id}`}>{d.number}</Link>
                  </td>
                  <td>{d.clients?.name}</td>
                  <td className="hide-sm">{formatDate(kind === "invoice" ? d.due_date : d.issue_date, lang)}</td>
                  <td className="num">
                    {formatMoney(computeTotals(d.document_items, d.tax_rate).total_cents, business.currency, lang)}
                  </td>
                  <td>
                    <StatusBadge status={d.status} overdue={isOverdue(d)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
