import { NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useI18n } from "./lib/i18n";
import { tap, useOffline } from "./lib/platform";
import { useSession } from "./lib/session";
import { supabase, supabaseConfigured } from "./lib/supabase";
import Clients from "./pages/Clients";
import Dashboard from "./pages/Dashboard";
import DocumentEditor from "./pages/DocumentEditor";
import Documents from "./pages/Documents";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
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

function OfflineBanner() {
  const { t } = useI18n();
  return useOffline() ? (
    <div className="offline-banner" role="status">
      {t("offline")}
    </div>
  ) : null;
}

export default function App() {
  const { pathname } = useLocation();
  // Pages publiques : page client et politique de confidentialité, sans connexion
  if (pathname.startsWith("/p/") || pathname === "/privacy") {
    return (
      <>
        <OfflineBanner />
        <Routes>
          <Route path="/p/:token" element={<PublicDocument />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </>
    );
  }
  return (
    <>
      <OfflineBanner />
      <PrivateApp />
    </>
  );
}

// Icônes de la barre d'onglets (affichée en bas sur téléphone)
const icons = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  invoice: "M6 2h9l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm2 9h8M8 15h8M8 7h4",
  quote: "M4 4h16v12H8l-4 4zM8 9h8M8 12h5",
  clients: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 10a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-3 2-1-2-4-2 .5-1.5-1.5L16 4l-4-2-1 2h-2L8 2 4 4l.5 2L3 7.5 1 7v4l2 1v2l-2 1 2 4 2-.5L6.5 20 6 22l4 2 1-2h2l1 2 4-2-.5-2 1.5-1.5 2 .5 2-4-2-1z",
};

function Tab({ to, label, icon, end }: { to: string; label: string; icon: keyof typeof icons; end?: boolean }) {
  return (
    <NavLink to={to} end={end} onClick={tap}>
      <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden>
        <path d={icons[icon]} />
      </svg>
      <span>{label}</span>
    </NavLink>
  );
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
        <nav className="nav" aria-label="Navigation">
          <Tab to="/" end label={t("navDashboard")} icon="home" />
          <Tab to="/invoices" label={t("navInvoices")} icon="invoice" />
          <Tab to="/quotes" label={t("navQuotes")} icon="quote" />
          <Tab to="/clients" label={t("navClients")} icon="clients" />
          <Tab to="/settings" label={t("navSettings")} icon="settings" />
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
