import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";

const fr = {
  appName: "RelanceFacile",
  tagline: "Devis, factures et relances de paiement automatiques pour les pros du service à domicile.",
  loginTitle: "Connexion",
  emailLabel: "Courriel",
  sendLink: "Recevoir mon lien de connexion",
  linkSent: "C'est envoyé ! Ouvrez le lien reçu par courriel pour vous connecter.",
  logout: "Déconnexion",
  navDashboard: "Tableau de bord",
  navClients: "Clients",
  navQuotes: "Devis",
  navInvoices: "Factures",
  navSettings: "Paramètres",
  loading: "Chargement…",
  save: "Enregistrer",
  saved: "Enregistré",
  cancel: "Annuler",
  delete: "Supprimer",
  edit: "Modifier",
  add: "Ajouter",
  confirmDelete: "Supprimer définitivement ?",
  error: "Une erreur est survenue.",
  // Tableau de bord
  outstanding: "À encaisser",
  overdue: "En retard",
  paidThisMonth: "Payé ce mois-ci",
  overdueInvoices: "Factures en retard",
  noOverdue: "Aucune facture en retard. 🎉",
  daysLate: "jours de retard",
  setupStripe: "Activez les paiements par carte pour que vos clients puissent payer en ligne.",
  setupBusiness: "Complétez le nom de votre entreprise dans les paramètres.",
  // Clients
  newClient: "Nouveau client",
  name: "Nom",
  phone: "Téléphone",
  address: "Adresse",
  language: "Langue",
  noClients: "Aucun client pour l'instant.",
  clientInUse: "Ce client a des devis ou factures : impossible de le supprimer.",
  // Documents
  newQuote: "Nouveau devis",
  newInvoice: "Nouvelle facture",
  quote: "Devis",
  invoice: "Facture",
  number: "Numéro",
  client: "Client",
  chooseClient: "Choisir un client…",
  issueDate: "Date",
  dueDate: "Échéance",
  status: "Statut",
  total: "Total",
  subtotal: "Sous-total",
  tax: "Taxes",
  taxRate: "Taux de taxes (%)",
  notes: "Notes pour le client",
  items: "Lignes",
  description: "Description",
  quantity: "Qté",
  unitPrice: "Prix unitaire",
  addLine: "+ Ajouter une ligne",
  noDocuments: "Rien ici pour l'instant.",
  needClientFirst: "Ajoutez d'abord un client.",
  sendByEmail: "Envoyer par courriel",
  resend: "Renvoyer par courriel",
  sent: "Envoyé au client.",
  sentSimulated: "Courriel simulé (aucune clé Resend configurée). Lien :",
  copyLink: "Copier le lien client",
  copied: "Lien copié",
  markPaid: "Marquer comme payée",
  markUnpaid: "Annuler le paiement",
  convertToInvoice: "Transformer en facture",
  voidDoc: "Annuler le document",
  pauseReminders: "Suspendre les relances",
  resumeReminders: "Reprendre les relances",
  remindersLog: "Relances envoyées",
  noReminders: "Aucune relance pour l'instant.",
  remindersPausedNote: "Relances suspendues pour cette facture.",
  saveFirst: "Enregistrez avant d'envoyer.",
  clientNoEmail: "Ce client n'a pas d'adresse courriel.",
  emptyDocument: "Ajoutez au moins une ligne.",
  st_draft: "Brouillon",
  st_sent: "Envoyé",
  st_accepted: "Accepté",
  st_declined: "Refusé",
  st_paid: "Payée",
  st_void: "Annulé",
  // Paramètres
  businessInfo: "Votre entreprise",
  businessName: "Nom de l'entreprise",
  country: "Pays (code à 2 lettres, ex. CA, FR)",
  currency: "Devise (ex. CAD, EUR, USD)",
  defaultTax: "Taux de taxes par défaut (%)",
  reminderDays: "Relancer après l'échéance (jours, séparés par des virgules)",
  documentLanguage: "Langue de numérotation",
  payments: "Paiements en ligne",
  stripeConnect: "Activer les paiements par carte avec Stripe",
  stripeContinue: "Terminer l'inscription Stripe",
  stripeActive: "Paiements par carte activés ✓",
  stripePending: "Inscription Stripe commencée — il reste des informations à fournir.",
  // Page publique
  from: "De",
  billedTo: "Pour",
  payNow: "Payer en ligne",
  paidThanks: "Merci ! Votre paiement a bien été reçu.",
  paymentProcessing: "Paiement en cours de confirmation…",
  acceptQuote: "Accepter le devis",
  declineQuote: "Refuser",
  quoteAccepted: "Devis accepté. Merci !",
  quoteDeclined: "Devis refusé.",
  notFound: "Document introuvable.",
  poweredBy: "Propulsé par RelanceFacile",
  // Connexion par code, hors ligne, partage
  codeSent: "C'est envoyé ! Cliquez sur le lien reçu par courriel, ou entrez le code à 6 chiffres ici.",
  codeLabel: "Code reçu par courriel",
  verifyCode: "Me connecter",
  badCode: "Code invalide ou expiré.",
  otherEmail: "Utiliser un autre courriel",
  offline: "Hors ligne — vos modifications ne pourront pas être enregistrées.",
  shareLink: "Partager le lien client",
  shared: "Lien partagé",
  // Confidentialité et compte
  privacy: "Confidentialité",
  account: "Votre compte",
  deleteAccount: "Supprimer mon compte",
  deleteAccountHelp: "Supprime définitivement votre compte, vos clients, devis, factures et relances. Cette action est irréversible.",
  deleteAccountConfirm: "Pour confirmer, tapez SUPPRIMER :",
  deleteAccountWord: "SUPPRIMER",
  accountDeleted: "Votre compte a été supprimé.",
};

type Dict = typeof fr;
export type TKey = keyof Dict;

const en: Dict = {
  appName: "PayNudge",
  tagline: "Quotes, invoices and automatic payment reminders for home-service pros.",
  loginTitle: "Sign in",
  emailLabel: "Email",
  sendLink: "Email me a sign-in link",
  linkSent: "Sent! Open the link in your email to sign in.",
  logout: "Sign out",
  navDashboard: "Dashboard",
  navClients: "Clients",
  navQuotes: "Quotes",
  navInvoices: "Invoices",
  navSettings: "Settings",
  loading: "Loading…",
  save: "Save",
  saved: "Saved",
  cancel: "Cancel",
  delete: "Delete",
  edit: "Edit",
  add: "Add",
  confirmDelete: "Delete permanently?",
  error: "Something went wrong.",
  outstanding: "Outstanding",
  overdue: "Overdue",
  paidThisMonth: "Paid this month",
  overdueInvoices: "Overdue invoices",
  noOverdue: "No overdue invoices. 🎉",
  daysLate: "days late",
  setupStripe: "Turn on card payments so your clients can pay online.",
  setupBusiness: "Add your business name in Settings.",
  newClient: "New client",
  name: "Name",
  phone: "Phone",
  address: "Address",
  language: "Language",
  noClients: "No clients yet.",
  clientInUse: "This client has quotes or invoices and can't be deleted.",
  newQuote: "New quote",
  newInvoice: "New invoice",
  quote: "Quote",
  invoice: "Invoice",
  number: "Number",
  client: "Client",
  chooseClient: "Choose a client…",
  issueDate: "Date",
  dueDate: "Due",
  status: "Status",
  total: "Total",
  subtotal: "Subtotal",
  tax: "Tax",
  taxRate: "Tax rate (%)",
  notes: "Notes for the client",
  items: "Line items",
  description: "Description",
  quantity: "Qty",
  unitPrice: "Unit price",
  addLine: "+ Add line",
  noDocuments: "Nothing here yet.",
  needClientFirst: "Add a client first.",
  sendByEmail: "Send by email",
  resend: "Resend by email",
  sent: "Sent to the client.",
  sentSimulated: "Email simulated (no Resend key configured). Link:",
  copyLink: "Copy client link",
  copied: "Link copied",
  markPaid: "Mark as paid",
  markUnpaid: "Undo payment",
  convertToInvoice: "Turn into invoice",
  voidDoc: "Void document",
  pauseReminders: "Pause reminders",
  resumeReminders: "Resume reminders",
  remindersLog: "Reminders sent",
  noReminders: "No reminders yet.",
  remindersPausedNote: "Reminders are paused for this invoice.",
  saveFirst: "Save before sending.",
  clientNoEmail: "This client has no email address.",
  emptyDocument: "Add at least one line.",
  st_draft: "Draft",
  st_sent: "Sent",
  st_accepted: "Accepted",
  st_declined: "Declined",
  st_paid: "Paid",
  st_void: "Void",
  businessInfo: "Your business",
  businessName: "Business name",
  country: "Country (2-letter code, e.g. CA, US)",
  currency: "Currency (e.g. CAD, USD, EUR)",
  defaultTax: "Default tax rate (%)",
  reminderDays: "Remind after the due date (days, comma-separated)",
  documentLanguage: "Numbering language",
  payments: "Online payments",
  stripeConnect: "Turn on card payments with Stripe",
  stripeContinue: "Finish Stripe setup",
  stripeActive: "Card payments are on ✓",
  stripePending: "Stripe setup started — some details are still needed.",
  from: "From",
  billedTo: "To",
  payNow: "Pay online",
  paidThanks: "Thank you! Your payment was received.",
  paymentProcessing: "Confirming your payment…",
  acceptQuote: "Accept quote",
  declineQuote: "Decline",
  quoteAccepted: "Quote accepted. Thank you!",
  quoteDeclined: "Quote declined.",
  notFound: "Document not found.",
  poweredBy: "Powered by PayNudge",
  codeSent: "Sent! Click the link in your email, or enter the 6-digit code here.",
  codeLabel: "Code from your email",
  verifyCode: "Sign in",
  badCode: "Invalid or expired code.",
  otherEmail: "Use another email",
  offline: "Offline — your changes can't be saved right now.",
  shareLink: "Share client link",
  shared: "Link shared",
  privacy: "Privacy",
  account: "Your account",
  deleteAccount: "Delete my account",
  deleteAccountHelp: "Permanently deletes your account, clients, quotes, invoices and reminders. This cannot be undone.",
  deleteAccountConfirm: "To confirm, type DELETE:",
  deleteAccountWord: "DELETE",
  accountDeleted: "Your account has been deleted.",
};

const dicts: Record<Lang, Dict> = { fr, en };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    /* stockage indisponible */
  }
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: TKey) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = (l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem("lang", l);
    } catch {
      /* ignore */
    }
  };
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dicts[lang][k] }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside I18nProvider");
  return v;
}

/** Traduction ponctuelle dans une langue donnée (page publique, langue du client). */
export function tIn(lang: Lang, k: TKey): string {
  return dicts[lang][k];
}
