import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LangToggle } from "../App";
import { useI18n } from "../lib/i18n";
import { isNative, publicSiteUrl } from "../lib/platform";
import { supabase } from "../lib/supabase";

// Connexion sans mot de passe : lien magique (web) ou code à 6 chiffres (indispensable
// dans l'app native, où le lien du courriel s'ouvrirait dans le navigateur).
export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "verifying" | "error" | "badcode">("idle");

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: isNative ? publicSiteUrl() : window.location.origin },
    });
    setState(error ? "error" : "sent");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setState("verifying");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) setState("badcode");
    // En cas de succès, la session change et l'app s'affiche toute seule
  }

  const codeStep = state === "sent" || state === "verifying" || state === "badcode";

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
        {codeStep ? (
          <form onSubmit={verify} className="stack">
            <p className="notice ok">{t("codeSent")}</p>
            <label>
              {t("codeLabel")}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <button className="btn primary" disabled={state === "verifying" || code.length < 6}>
              {t("verifyCode")}
            </button>
            {state === "badcode" && <p className="notice err">{t("badCode")}</p>}
            <button type="button" className="btn ghost small" onClick={() => setState("idle")}>
              {t("otherEmail")}
            </button>
          </form>
        ) : (
          <form onSubmit={sendCode} className="stack">
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
        <p className="small center">
          <Link to="/privacy">{t("privacy")}</Link>
        </p>
      </div>
    </div>
  );
}
