import { useEffect, useState, type FormEvent } from "react";
import { useI18n, type Lang } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import type { Client } from "../lib/types";

const empty = (lang: Lang): Omit<Client, "id"> => ({ name: "", email: "", phone: "", address: "", language: lang });

export default function Clients() {
  const { t, lang } = useI18n();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [editing, setEditing] = useState<(Omit<Client, "id"> & { id?: string }) | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("name");
    setClients((data as Client[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    const row = {
      name: editing.name.trim(),
      email: editing.email?.trim() || null,
      phone: editing.phone?.trim() || null,
      address: editing.address?.trim() || null,
      language: editing.language,
    };
    const { error } = editing.id
      ? await supabase.from("clients").update(row).eq("id", editing.id)
      : await supabase.from("clients").insert(row);
    if (error) return setError(t("error"));
    setEditing(null);
    load();
  }

  async function remove(c: Client) {
    if (!confirm(`${t("confirmDelete")} — ${c.name}`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) return setError(error.code === "23503" ? t("clientInUse") : t("error"));
    load();
  }

  return (
    <div className="stack-lg">
      <div className="row spread">
        <h1>{t("navClients")}</h1>
        {!editing && (
          <button className="btn primary" onClick={() => setEditing(empty(lang))}>
            {t("newClient")}
          </button>
        )}
      </div>
      {error && <p className="notice err">{error}</p>}

      {editing && (
        <form className="card stack" onSubmit={save}>
          <div className="grid2">
            <label>
              {t("name")}
              <input required maxLength={200} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label>
              {t("emailLabel")}
              <input type="email" maxLength={254} value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </label>
            <label>
              {t("phone")}
              <input maxLength={50} value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </label>
            <label>
              {t("language")}
              <select value={editing.language} onChange={(e) => setEditing({ ...editing, language: e.target.value as Lang })}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
          <label>
            {t("address")}
            <textarea rows={2} maxLength={500} value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
          </label>
          <div className="row">
            <button className="btn primary">{t("save")}</button>
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {!clients ? (
        <p className="muted">{t("loading")}</p>
      ) : clients.length === 0 ? (
        <p className="muted">{t("noClients")}</p>
      ) : (
        <div className="card flush">
          <table className="table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th className="hide-sm">{t("emailLabel")}</th>
                <th className="hide-sm">{t("phone")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong> <span className="muted small">{c.language.toUpperCase()}</span>
                  </td>
                  <td className="hide-sm">{c.email}</td>
                  <td className="hide-sm">{c.phone}</td>
                  <td className="actions">
                    <button className="btn ghost small" onClick={() => setEditing(c)}>
                      {t("edit")}
                    </button>
                    <button className="btn ghost small danger" onClick={() => remove(c)}>
                      {t("delete")}
                    </button>
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
