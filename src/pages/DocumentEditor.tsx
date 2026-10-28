import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { computeTotals, formatDate, formatMoney, lineTotalCents } from "../../shared/totals";
import StatusBadge, { isOverdue } from "../components/StatusBadge";
import { useI18n } from "../lib/i18n";
import { isNative, publicSiteUrl, shareLink, tap } from "../lib/platform";
import { useSession } from "../lib/session";
import { api, supabase } from "../lib/supabase";
import type { Client, Doc, DocKind, DocStatus, Reminder } from "../lib/types";

interface LineDraft {
  description: string;
  quantity: string;
  price: string; // saisi en unités monétaires, ex. « 125,50 »
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const toCents = (s: string) => {
  const n = parseFloat(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};
const toQty = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const centsToInput = (c: number, lang: string) => {
  const s = (c / 100).toFixed(2);
  return lang === "fr" ? s.replace(".", ",") : s;
};

export default function DocumentEditor() {
  const { t, lang } = useI18n();
  const { business } = useSession();
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;

  const [clients, setClients] = useState<Client[] | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [kind, setKind] = useState<DocKind>(params.kind === "quote" ? "quote" : "invoice");
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(plusDays(todayIso(), 14));
  const [taxRate, setTaxRate] = useState(String(business?.default_tax_rate ?? 0));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ description: "", quantity: "1", price: "" }]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dirty, setDirty] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const { data: cl } = await supabase.from("clients").select("*").order("name");
    setClients((cl as Client[]) ?? []);
    if (!id) return;
    const { data } = await supabase
      .from("documents")
      .select("*, document_items(description, quantity, unit_price_cents, position)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return navigate("/", { replace: true });
    const d = data as Doc & { document_items: { description: string; quantity: number; unit_price_cents: number; position: number }[] };
    setDoc(d);
    setKind(d.kind);
    setClientId(d.client_id);
    setIssueDate(d.issue_date);
    setDueDate(d.due_date ?? "");
    setTaxRate(String(d.tax_rate));
    setNotes(d.notes ?? "");
    const items = [...d.document_items].sort((a, b) => a.position - b.position);
    setLines(
      items.length
        ? items.map((it) => ({
            description: it.description,
            quantity: String(it.quantity),
            price: centsToInput(Number(it.unit_price_cents), lang),
          }))
        : [{ description: "", quantity: "1", price: "" }],
    );
    if (d.kind === "invoice") {
      const { data: r } = await supabase
        .from("reminders")
        .select("id, step, status, created_at")
        .eq("document_id", d.id)
        .order("created_at");
      setReminders((r as Reminder[]) ?? []);
    }
    setDirty(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const parsedItems = useMemo(
    () =>
      lines
        .filter((l) => l.description.trim())
        .map((l, i) => ({
          description: l.description.trim().slice(0, 500),
          quantity: toQty(l.quantity),
          unit_price_cents: toCents(l.price),
          position: i,
        })),
    [lines],
  );
  const totals = computeTotals(parsedItems, Number(taxRate.replace(",", ".")) || 0);

  if (!business) return null;
  if (!clients) return <p className="muted">{t("loading")}</p>;

  const money = (c: number) => formatMoney(c, business.currency, lang);
  const status: DocStatus = doc?.status ?? "draft";
  const editable = status === "draft" || status === "sent";
  const update = (fn: () => void) => {
    fn();
    setDirty(true);
    setMessage(null);
  };
  const fail = (err: unknown) => {
    const code = err instanceof Error ? err.message : "";
    const text =
      code === "client_has_no_email" ? t("clientNoEmail") : code === "document_is_empty" ? t("emptyDocument") : t("error");
    setMessage({ type: "err", text });
  };

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!clientId) return;
    if (parsedItems.length === 0 || parsedItems.some((it) => it.quantity <= 0)) {
      return setMessage({ type: "err", text: t("emptyDocument") });
    }
    setBusy(true);
    try {
      const fields = {
        client_id: clientId,
        issue_date: issueDate,
        due_date: kind === "invoice" ? dueDate || null : null,
        tax_rate: Math.min(100, Math.max(0, Number(taxRate.replace(",", ".")) || 0)),
        notes: notes.trim() || null,
      };
      let docId = doc?.id;
      if (docId) {
        const { error } = await supabase.from("documents").update(fields).eq("id", docId);
        if (error) throw error;
        const { error: delErr } = await supabase.from("document_items").delete().eq("document_id", docId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase
          .from("documents")
          .insert({ ...fields, kind })
          .select("id")
          .single();
        if (error) throw error;
        docId = data.id as string;
      }
      const { error: itemsErr } = await supabase
        .from("document_items")
        .insert(parsedItems.map((it) => ({ ...it, document_id: docId })));
      if (itemsErr) throw itemsErr;
      setMessage({ type: "ok", text: t("saved") });
      if (!doc) navigate(`/documents/${docId}`, { replace: true });
      else await load();
    } catch (err) {
      console.error(err);
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!doc) return;
    setBusy(true);
    try {
      const r = await api<{ simulated: boolean; link: string }>("/api/send-document", { id: doc.id });
      setMessage({ type: "ok", text: r.simulated ? `${t("sentSimulated")} ${r.link}` : t("sent") });
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(s: DocStatus) {
    if (!doc) return;
    setBusy(true);
    const { error } = await supabase.from("documents").update({ status: s }).eq("id", doc.id);
    setBusy(false);
    if (error) return fail(error);
    load();
  }

  async function toggleReminders() {
    if (!doc) return;
    const { error } = await supabase.from("documents").update({ reminders_paused: !doc.reminders_paused }).eq("id", doc.id);
    if (error) return fail(error);
    load();
  }

  async function convertToInvoice() {
    if (!doc) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .insert({
          kind: "invoice",
          client_id: doc.client_id,
          issue_date: todayIso(),
          due_date: plusDays(todayIso(), 14),
          tax_rate: doc.tax_rate,
          notes: doc.notes,
          source_quote_id: doc.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: itemsErr } = await supabase
        .from("document_items")
        .insert(parsedItems.map((it) => ({ ...it, document_id: data.id })));
      if (itemsErr) throw itemsErr;
      navigate(`/documents/${data.id}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!doc || !confirm(t("confirmDelete"))) return;
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) return fail(error);
    navigate(kind === "invoice" ? "/invoices" : "/quotes");
  }

  async function copyLink() {
    if (!doc) return;
    tap();
    const label = `${kind === "invoice" ? t("invoice") : t("quote")} ${doc.number}`;
    const how = await shareLink(`${publicSiteUrl()}/p/${doc.public_token}`, label);
    setMessage({ type: "ok", text: how === "shared" ? t("shared") : t("copied") });
  }

  if (clients.length === 0) {
    return (
      <p className="notice">
        <Link to="/clients">{t("needClientFirst")}</Link>
      </p>
    );
  }

  const title = doc ? `${kind === "invoice" ? t("invoice") : t("quote")} ${doc.number}` : kind === "invoice" ? t("newInvoice") : t("newQuote");

  return (
    <div className="stack-lg">
      <div className="row spread wrap">
        <h1>
          {title} {doc && <StatusBadge status={doc.status} overdue={isOverdue(doc)} />}
        </h1>
        <Link to={kind === "invoice" ? "/invoices" : "/quotes"} className="btn ghost small">
          ← {kind === "invoice" ? t("navInvoices") : t("navQuotes")}
        </Link>
      </div>

      {message && <p className={`notice ${message.type}`}>{message.text}</p>}

      <form className="card stack" onSubmit={save}>
        <fieldset disabled={!editable || busy} className="stack">
          <div className="grid3">
            <label>
              {t("client")}
              <select required value={clientId} onChange={(e) => update(() => setClientId(e.target.value))}>
                <option value="">{t("chooseClient")}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("issueDate")}
              <input type="date" required value={issueDate} onChange={(e) => update(() => setIssueDate(e.target.value))} />
            </label>
            {kind === "invoice" && (
              <label>
                {t("dueDate")}
                <input type="date" value={dueDate} onChange={(e) => update(() => setDueDate(e.target.value))} />
              </label>
            )}
          </div>

          <div className="lines">
            <div className="line head">
              <span>{t("description")}</span>
              <span>{t("quantity")}</span>
              <span>{t("unitPrice")}</span>
              <span className="num">{t("total")}</span>
              <span></span>
            </div>
            {lines.map((l, i) => (
              <div className="line" key={i}>
                <input
                  aria-label={t("description")}
                  maxLength={500}
                  value={l.description}
                  onChange={(e) => update(() => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x))))}
                />
                <input
                  aria-label={t("quantity")}
                  inputMode="decimal"
                  value={l.quantity}
                  onChange={(e) => update(() => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x))))}
                />
                <input
                  aria-label={t("unitPrice")}
                  inputMode="decimal"
                  placeholder="0,00"
                  value={l.price}
                  onChange={(e) => update(() => setLines(lines.map((x, j) => (j === i ? { ...x, price: e.target.value } : x))))}
                />
                <span className="num">{money(lineTotalCents({ quantity: toQty(l.quantity), unit_price_cents: toCents(l.price) }))}</span>
                <button
                  type="button"
                  className="btn ghost small"
                  aria-label={t("delete")}
                  onClick={() => update(() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn ghost small"
              onClick={() => update(() => setLines([...lines, { description: "", quantity: "1", price: "" }]))}
            >
              {t("addLine")}
            </button>
          </div>

          <div className="grid2">
            <label>
              {t("notes")}
              <textarea rows={3} maxLength={5000} value={notes} onChange={(e) => update(() => setNotes(e.target.value))} />
            </label>
            <div className="totals">
              <label className="inline">
                {t("taxRate")}
                <input inputMode="decimal" value={taxRate} onChange={(e) => update(() => setTaxRate(e.target.value))} />
              </label>
              <div className="row spread">
                <span>{t("subtotal")}</span>
                <span>{money(totals.subtotal_cents)}</span>
              </div>
              <div className="row spread">
                <span>{t("tax")}</span>
                <span>{money(totals.tax_cents)}</span>
              </div>
              <div className="row spread grand">
                <span>{t("total")}</span>
                <span>{money(totals.total_cents)}</span>
              </div>
            </div>
          </div>
        </fieldset>
        {editable && (
          <div className="row">
            <button className="btn primary" disabled={busy || !dirty}>
              {t("save")}
            </button>
          </div>
        )}
      </form>

      {doc && (
        <div className="card stack">
          {dirty && <p className="muted small">{t("saveFirst")}</p>}
          <div className="row wrap">
            {editable && (
              <button className="btn primary" disabled={busy || dirty} onClick={send}>
                {status === "draft" ? t("sendByEmail") : t("resend")}
              </button>
            )}
            {status !== "draft" && (
              <button className="btn" onClick={copyLink}>
                {isNative ? t("shareLink") : t("copyLink")}
              </button>
            )}
            {kind === "invoice" && status === "sent" && (
              <button className="btn" disabled={busy} onClick={() => setStatus("paid")}>
                {t("markPaid")}
              </button>
            )}
            {kind === "invoice" && status === "paid" && (
              <button className="btn ghost" disabled={busy} onClick={() => setStatus("sent")}>
                {t("markUnpaid")}
              </button>
            )}
            {kind === "invoice" && status === "sent" && (
              <button className="btn ghost" onClick={toggleReminders}>
                {doc.reminders_paused ? t("resumeReminders") : t("pauseReminders")}
              </button>
            )}
            {kind === "quote" && (status === "accepted" || status === "sent") && (
              <button className="btn" disabled={busy || dirty} onClick={convertToInvoice}>
                {t("convertToInvoice")}
              </button>
            )}
            {status !== "draft" && status !== "void" && status !== "paid" && (
              <button className="btn ghost danger" disabled={busy} onClick={() => setStatus("void")}>
                {t("voidDoc")}
              </button>
            )}
            {status === "draft" && (
              <button className="btn ghost danger" disabled={busy} onClick={remove}>
                {t("delete")}
              </button>
            )}
          </div>

          {kind === "invoice" && status !== "draft" && (
            <div>
              <h3>{t("remindersLog")}</h3>
              {doc.reminders_paused && <p className="muted small">{t("remindersPausedNote")}</p>}
              {reminders.length === 0 ? (
                <p className="muted small">{t("noReminders")}</p>
              ) : (
                <ul className="plain small">
                  {reminders.map((r) => (
                    <li key={r.id}>
                      {formatDate(r.created_at, lang)} — J+{r.step} — {r.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
