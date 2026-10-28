// Page vue par le client final (sans compte) : consulter, payer une facture, accepter un devis.
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { formatDate, formatMoney, lineTotalCents, type Totals } from "../../shared/totals";
import { tIn, type Lang, type TKey } from "../lib/i18n";
import type { DocStatus } from "../lib/types";

interface PublicDoc {
  kind: "quote" | "invoice";
  number: string;
  status: DocStatus;
  issue_date: string;
  due_date: string | null;
  tax_rate: number;
  notes: string | null;
  paid_at: string | null;
  items: { description: string; quantity: number; unit_price_cents: number }[];
  totals: Totals;
  currency: string;
  language: Lang;
  client: { name: string; address: string | null };
  business: { name: string; email: string | null; phone: string | null; address: string | null };
  can_pay: boolean;
  can_respond: boolean;
}

export default function PublicDocument() {
  const { token } = useParams();
  const [search] = useSearchParams();
  const [doc, setDoc] = useState<PublicDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const justPaid = search.get("paid") === "1";

  async function load() {
    const res = await fetch(`/api/public/${encodeURIComponent(token ?? "")}`);
    if (res.status === 404 || res.status === 400) return setState("missing");
    if (!res.ok) return setState("error");
    const d = (await res.json()) as PublicDoc;
    setDoc(d);
    document.documentElement.lang = d.language;
    setState("ready");
  }

  useEffect(() => {
    load();
    // Après paiement, le webhook Stripe peut arriver quelques secondes plus tard
    if (!justPaid) return;
    const timer = setInterval(load, 3000);
    const stop = setTimeout(() => clearInterval(timer), 30000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function act(action: "pay" | "accept" | "decline") {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/${encodeURIComponent(token ?? "")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (action === "pay") window.location.href = body.url;
      else setDoc(body as PublicDoc);
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  const fallbackLang: Lang = navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
  if (state === "loading") return <div className="center-page muted">…</div>;
  if (state !== "ready" || !doc) {
    return (
      <div className="center-page">
        <p className="notice err">{tIn(fallbackLang, state === "missing" ? "notFound" : "error")}</p>
      </div>
    );
  }

  const L = doc.language;
  const t = (k: TKey) => tIn(L, k);
  const money = (c: number) => formatMoney(c, doc.currency, L);

  return (
    <div className="public">
      <article className="card paper stack-lg">
        <header className="row spread wrap">
          <div>
            <div className="muted small">{t("from")}</div>
            <strong className="big">{doc.business.name || "—"}</strong>
            <div className="muted small pre">
              {[doc.business.address, doc.business.phone, doc.business.email].filter(Boolean).join("\n")}
            </div>
          </div>
          <div className="right">
            <div className="doc-title">
              {doc.kind === "invoice" ? t("invoice") : t("quote")} {doc.number}
            </div>
            <div className="muted small">
              {t("issueDate")} : {formatDate(doc.issue_date, L)}
              {doc.due_date && (
                <>
                  <br />
                  {t("dueDate")} : {formatDate(doc.due_date, L)}
                </>
              )}
            </div>
            <span className={`badge ${doc.status}`}>{t(`st_${doc.status}` as TKey)}</span>
          </div>
        </header>

        <div>
          <div className="muted small">{t("billedTo")}</div>
          <strong>{doc.client.name}</strong>
          {doc.client.address && <div className="muted small pre">{doc.client.address}</div>}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>{t("description")}</th>
              <th className="num">{t("quantity")}</th>
              <th className="num hide-sm">{t("unitPrice")}</th>
              <th className="num">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td className="num">{Number(it.quantity).toLocaleString(L === "fr" ? "fr-CA" : "en-CA")}</td>
                <td className="num hide-sm">{money(Number(it.unit_price_cents))}</td>
                <td className="num">{money(lineTotalCents(it))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals right-block">
          <div className="row spread">
            <span>{t("subtotal")}</span>
            <span>{money(doc.totals.subtotal_cents)}</span>
          </div>
          {Number(doc.tax_rate) > 0 && (
            <div className="row spread">
              <span>
                {t("tax")} ({Number(doc.tax_rate).toLocaleString(L === "fr" ? "fr-CA" : "en-CA")} %)
              </span>
              <span>{money(doc.totals.tax_cents)}</span>
            </div>
          )}
          <div className="row spread grand">
            <span>{t("total")}</span>
            <span>{money(doc.totals.total_cents)}</span>
          </div>
        </div>

        {doc.notes && <p className="pre muted">{doc.notes}</p>}

        <footer className="stack">
          {doc.status === "paid" && <p className="notice ok">{t("paidThanks")}</p>}
          {justPaid && doc.status !== "paid" && <p className="notice">{t("paymentProcessing")}</p>}
          {doc.status === "accepted" && <p className="notice ok">{t("quoteAccepted")}</p>}
          {doc.status === "declined" && <p className="notice">{t("quoteDeclined")}</p>}
          {doc.can_pay && !justPaid && (
            <button className="btn primary big" disabled={busy} onClick={() => act("pay")}>
              {t("payNow")} · {money(doc.totals.total_cents)}
            </button>
          )}
          {doc.can_respond && (
            <div className="row wrap">
              <button className="btn primary big" disabled={busy} onClick={() => act("accept")}>
                {t("acceptQuote")}
              </button>
              <button className="btn ghost" disabled={busy} onClick={() => act("decline")}>
                {t("declineQuote")}
              </button>
            </div>
          )}
        </footer>
      </article>
      <p className="muted small center">{t("poweredBy")}</p>
    </div>
  );
}
