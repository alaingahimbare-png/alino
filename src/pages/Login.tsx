import { useState, type FormEvent } from "react";
import { LangToggle } from "../App";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <div className="center-page">
      <div className="card narrow">
        <div className="row spread">
          <div className="brand">
            <span className="logo" aria-hidden>
              ✓
            </span>
            {t("appName")}
          </div>
          <LangToggle />
        </div>
        <p className="muted">{t("tagline")}</p>
        <h1>{t("loginTitle")}</h1>
        {state === "sent" ? (
          <p className="notice ok">{t("linkSent")}</p>
        ) : (
          <form onSubmit={submit} className="stack">
            <label>
              {t("emailLabel")}
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button className="btn primary" disabled={state === "sending"}>
              {t("sendLink")}
            </button>
            {state === "error" && <p className="notice err">{t("error")}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
