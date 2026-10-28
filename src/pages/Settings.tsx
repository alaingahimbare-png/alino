import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n, type Lang } from "../lib/i18n";
import { useSession } from "../lib/session";
import { api, supabase } from "../lib/supabase";

export default function Settings() {
  const { t } = useI18n();
  const { business, refreshBusiness } = useSession();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(() => ({
    name: business?.name ?? "",
    email: business?.email ?? "",
    phone: business?.phone ?? "",
    address: business?.address ?? "",
    country: business?.country ?? "CA",
    currency: business?.currency ?? "CAD",
    default_tax_rate: String(business?.default_tax_rate ?? 0),
    reminder_days: (business?.reminder_days ?? [3, 7, 14]).join(", "),
    language: (business?.language ?? "fr") as Lang,
  }));
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Retour depuis Stripe : resynchronise l'état du compte
  useEffect(() => {
    if (!params.get("stripe")) return;
    api("/api/stripe-connect", { action: "status" })
      .then(() => refreshBusiness())
      .catch(() => undefined)
      .finally(() => setParams({}, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!business) return null;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [k]: e.target.value });
    setMessage(null);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    const days = [
      ...new Set(
        form.reminder_days
          .split(/[,;\s]+/)
          .map((s) => parseInt(s, 10))
          .filter((n) => n > 0 && n < 366),
      ),
    ]
      .sort((a, b) => a - b)
      .slice(0, 10);
    setBusy(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        country: form.country.trim().toUpperCase(),
        currency: form.currency.trim().toUpperCase(),
        default_tax_rate: Math.min(100, Math.max(0, Number(form.default_tax_rate.replace(",", ".")) || 0)),
        reminder_days: days,
        language: form.language,
      })
      .eq("owner_id", business!.owner_id);
    setBusy(false);
    if (error) return setMessage({ type: "err", text: t("error") });
    await refreshBusiness();
    setForm({ ...form, reminder_days: days.join(", ") });
    setMessage({ type: "ok", text: t("saved") });
  }

  async function connectStripe() {
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>("/api/stripe-connect", { action: "onboard" });
      window.location.href = url;
    } catch {
      setMessage({ type: "err", text: t("error") });
      setBusy(false);
    }
  }

  return (
    <div className="stack-lg">
      <h1>{t("navSettings")}</h1>
      {message && <p className={`notice ${message.type}`}>{message.text}</p>}

      <section className="card stack">
        <h2>{t("payments")}</h2>
        {business.stripe_charges_enabled ? (
          <p className="notice ok">{t("stripeActive")}</p>
        ) : (
          <>
            {business.stripe_account_id && <p className="muted">{t("stripePending")}</p>}
            <div>
              <button className="btn primary" disabled={busy} onClick={connectStripe}>
                {business.stripe_account_id ? t("stripeContinue") : t("stripeConnect")}
              </button>
            </div>
          </>
        )}
      </section>

      <form className="card stack" onSubmit={save}>
        <h2>{t("businessInfo")}</h2>
        <div className="grid2">
          <label>
            {t("businessName")}
            <input maxLength={200} value={form.name} onChange={set("name")} />
          </label>
          <label>
            {t("emailLabel")}
            <input type="email" maxLength={254} value={form.email} onChange={set("email")} />
          </label>
          <label>
            {t("phone")}
            <input maxLength={50} value={form.phone} onChange={set("phone")} />
          </label>
          <label>
            {t("documentLanguage")}
            <select value={form.language} onChange={set("language")}>
              <option value="fr">Français (DEV- / FAC-)</option>
              <option value="en">English (QUO- / INV-)</option>
            </select>
          </label>
          <label>
            {t("country")}
            <input maxLength={2} pattern="[A-Za-z]{2}" value={form.country} onChange={set("country")} disabled={!!business.stripe_account_id} />
          </label>
          <label>
            {t("currency")}
            <input maxLength={3} pattern="[A-Za-z]{3}" value={form.currency} onChange={set("currency")} />
          </label>
          <label>
            {t("defaultTax")}
            <input inputMode="decimal" value={form.default_tax_rate} onChange={set("default_tax_rate")} />
          </label>
          <label>
            {t("reminderDays")}
            <input value={form.reminder_days} onChange={set("reminder_days")} placeholder="3, 7, 14" />
          </label>
        </div>
        <label>
          {t("address")}
          <textarea rows={2} maxLength={500} value={form.address} onChange={set("address")} />
        </label>
        <div>
          <button className="btn primary" disabled={busy}>
            {t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
