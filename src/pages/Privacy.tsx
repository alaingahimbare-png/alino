// Politique de confidentialité, exigée par l'App Store et Google Play.
// Modèle à faire relire : adaptez-le à votre entreprise avant la publication.
import { Link } from "react-router-dom";
import { LangToggle } from "../App";
import { useI18n } from "../lib/i18n";

const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || "";
const UPDATED = "2026-10-28";

export default function Privacy() {
  const { lang, t } = useI18n();
  const contact = CONTACT ? <a href={`mailto:${CONTACT}`}>{CONTACT}</a> : null;

  return (
    <div className="public">
      <div className="row spread">
        <Link to="/" className="btn ghost small">
          ← {t("appName")}
        </Link>
        <LangToggle />
      </div>
      <article className="card paper prose">
        {lang === "fr" ? (
          <>
            <h1>Politique de confidentialité</h1>
            <p className="muted small">Dernière mise à jour : {UPDATED}</p>
            <h2>Qui sommes-nous</h2>
            <p>RelanceFacile (PayNudge en anglais) aide les professionnels du service à domicile à envoyer des devis et des factures, à se faire payer en ligne et à relancer automatiquement les paiements en retard.</p>
            <h2>Données que nous recueillons</h2>
            <ul>
              <li><strong>Votre compte</strong> : votre adresse courriel, utilisée pour vous connecter.</li>
              <li><strong>Votre entreprise</strong> : nom, coordonnées, devise, taux de taxes et préférences de relance que vous saisissez.</li>
              <li><strong>Vos clients et documents</strong> : noms, courriels, téléphones et adresses de vos clients, ainsi que le contenu de vos devis et factures.</li>
              <li><strong>Paiements</strong> : traités par Stripe. Nous ne voyons ni ne stockons jamais les numéros de carte.</li>
            </ul>
            <h2>Pourquoi nous les utilisons</h2>
            <p>Uniquement pour faire fonctionner le service : afficher vos documents, les envoyer à vos clients, encaisser les paiements et envoyer les relances que vous avez programmées. Nous ne vendons pas vos données et ne faisons pas de publicité ciblée.</p>
            <h2>Prestataires</h2>
            <p>Supabase (base de données, hébergée au Canada), Netlify (hébergement du site), Stripe (paiements) et Resend (envoi des courriels). Chacun ne reçoit que ce qui est nécessaire à sa tâche.</p>
            <h2>Conservation et suppression</h2>
            <p>Vos données sont conservées tant que votre compte existe. Vous pouvez supprimer votre compte et toutes ses données à tout moment depuis <strong>Paramètres → Supprimer mon compte</strong>{contact && <>, ou en écrivant à {contact}</>}. Stripe peut conserver certains enregistrements de paiement pour respecter ses obligations légales.</p>
            <h2>Sécurité</h2>
            <p>Les échanges sont chiffrés (HTTPS) et chaque professionnel ne peut accéder qu'à ses propres données.</p>
            {contact && (
              <>
                <h2>Contact</h2>
                <p>Pour toute question : {contact}</p>
              </>
            )}
          </>
        ) : (
          <>
            <h1>Privacy policy</h1>
            <p className="muted small">Last updated: {UPDATED}</p>
            <h2>Who we are</h2>
            <p>PayNudge (RelanceFacile in French) helps home-service professionals send quotes and invoices, get paid online, and automatically follow up on late payments.</p>
            <h2>Data we collect</h2>
            <ul>
              <li><strong>Your account</strong>: your email address, used to sign in.</li>
              <li><strong>Your business</strong>: the name, contact details, currency, tax rate and reminder preferences you enter.</li>
              <li><strong>Your clients and documents</strong>: your clients' names, emails, phone numbers and addresses, and the content of your quotes and invoices.</li>
              <li><strong>Payments</strong>: processed by Stripe. We never see or store card numbers.</li>
            </ul>
            <h2>Why we use it</h2>
            <p>Only to run the service: showing your documents, sending them to your clients, collecting payments, and sending the reminders you scheduled. We don't sell your data or use it for targeted advertising.</p>
            <h2>Service providers</h2>
            <p>Supabase (database, hosted in Canada), Netlify (website hosting), Stripe (payments) and Resend (email delivery). Each receives only what its task requires.</p>
            <h2>Retention and deletion</h2>
            <p>Your data is kept while your account exists. You can delete your account and all its data at any time from <strong>Settings → Delete my account</strong>{contact && <>, or by writing to {contact}</>}. Stripe may keep some payment records to meet its legal obligations.</p>
            <h2>Security</h2>
            <p>Traffic is encrypted (HTTPS), and each professional can only access their own data.</p>
            {contact && (
              <>
                <h2>Contact</h2>
                <p>Questions: {contact}</p>
              </>
            )}
          </>
        )}
      </article>
    </div>
  );
}
