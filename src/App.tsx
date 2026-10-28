import { NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useI18n } from "./lib/i18n";
import { useSession } from "./lib/session";
import { supabase, supabaseConfigured } from "./lib/supabase";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import DocumentEditor from "./pages/DocumentEditor";
import Documents from "./pages/Documents";
import Login from "./pages/Login";
import PublicDocument from "./pages/PublicDocument";
import Settings from "./pages/Settings";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button className="btn ghost small" onClick={() => setLang(lang === "fr" ? "en" : "fr")} aria-label="Language">
      {lang === "fr" ? "EN" : "FR"}
    </button>
  );
}

// Remonte l'éditeur quand on passe de « nouveau devis » à « nouvelle facture »
function NewDocument() {
  const { kind } = useParams();
  return <DocumentEditor key={kind} />;
}

export default function App() {
  const { pathname } = useLocation();
  // La page client publique ne demande pas de connexion
  if (pathname.startsWith("/p/")) {
    return (
      <Routes>
        <Route path="/p/:token" element={<PublicDocument />} />
      </Routes>
    );
  }
  return <PrivateApp />;
}

function PrivateApp() {
  const { t } = useI18n();
  const { session, business, loading } = useSession();

  if (!supabaseConfigured) {
    return (
      <div className="center-page">
        <div className="card narrow">
          <h1>{t("appName")}</h1>
          <p>
            Configuration manquante : ajoutez <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>{" "}
            (voir le README).
          </p>
        </div>
      </div>
    );
  }
  if (loading) return <div className="center-page muted">{t("loading")}</div>;
  if (!session) return <Login />;
  if (!business) return <div className="center-page muted">{t("error")}</div>;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            ✓
          </span>
          {t("appName")}
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            {t("navDashboard")}
          </NavLink>
          <NavLink to="/invoices">{t("navInvoices")}</NavLink>
          <NavLink to="/quotes">{t("navQuotes")}</NavLink>
          <NavLink to="/clients">{t("navClients")}</NavLink>
          <NavLink to="/settings">{t("navSettings")}</NavLink>
        </nav>
        <div className="topbar-actions">
          <LangToggle />
          <button className="btn ghost small" onClick={() => supabase.auth.signOut()}>
            {t("logout")}
          </button>
        </div>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/invoices" element={<Documents kind="invoice" />} />
          <Route path="/quotes" element={<Documents kind="quote" />} />
          <Route path="/new/:kind" element={<NewDocument />} />
          <Route path="/documents/:id" element={<DocumentEditor />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
