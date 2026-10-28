// Envoi de courriels via Resend (https://resend.com). Sans RESEND_API_KEY, l'envoi est simulé.
import { formatDate, formatMoney } from "../../shared/totals";

export type Lang = "fr" | "en";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
}): Promise<{ simulated: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email simulé] à ${opts.to} — ${opts.subject}`);
    return { simulated: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "RelanceFacile <onboarding@resend.dev>",
      to: [opts.to],
      subject: opts.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return { simulated: false };
}

interface DocEmailInput {
  lang: Lang;
  kind: "quote" | "invoice";
  businessName: string;
  clientName: string;
  number: string;
  totalCents: number;
  currency: string;
  dueDate: string | null;
  link: string;
}

function layout(body: string, link: string, cta: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;color:#1c1917;line-height:1.5">
${body}
<p style="margin:28px 0"><a href="${escapeHtml(link)}" style="background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(cta)}</a></p>
<p style="color:#78716c;font-size:13px">${escapeHtml(link)}</p></div>`;
}

export function documentEmail(d: DocEmailInput): { subject: string; html: string } {
  const amount = formatMoney(d.totalCents, d.currency, d.lang);
  const due = formatDate(d.dueDate, d.lang);
  const b = escapeHtml(d.businessName || "—");
  const c = escapeHtml(d.clientName);
  const n = escapeHtml(d.number);
  if (d.lang === "fr") {
    if (d.kind === "quote") {
      return {
        subject: `Devis ${d.number} de ${d.businessName}`,
        html: layout(`<p>Bonjour ${c},</p><p>Voici votre devis <strong>${n}</strong> de ${b}, d'un montant de <strong>${amount}</strong>. Vous pouvez le consulter et l'accepter en ligne.</p>`, d.link, "Voir le devis"),
      };
    }
    return {
      subject: `Facture ${d.number} de ${d.businessName}`,
      html: layout(`<p>Bonjour ${c},</p><p>Voici votre facture <strong>${n}</strong> de ${b}, d'un montant de <strong>${amount}</strong>${d.dueDate ? `, payable avant le ${due}` : ""}. Vous pouvez la régler en ligne par carte.</p>`, d.link, "Voir et payer la facture"),
    };
  }
  if (d.kind === "quote") {
    return {
      subject: `Quote ${d.number} from ${d.businessName}`,
      html: layout(`<p>Hi ${c},</p><p>Here is your quote <strong>${n}</strong> from ${b} for <strong>${amount}</strong>. You can review and accept it online.</p>`, d.link, "View quote"),
    };
  }
  return {
    subject: `Invoice ${d.number} from ${d.businessName}`,
    html: layout(`<p>Hi ${c},</p><p>Here is your invoice <strong>${n}</strong> from ${b} for <strong>${amount}</strong>${d.dueDate ? `, due ${due}` : ""}. You can pay it online by card.</p>`, d.link, "View and pay invoice"),
  };
}

export function reminderEmail(d: DocEmailInput & { daysLate: number }): { subject: string; html: string } {
  const amount = formatMoney(d.totalCents, d.currency, d.lang);
  const due = formatDate(d.dueDate, d.lang);
  const b = escapeHtml(d.businessName || "—");
  const c = escapeHtml(d.clientName);
  const n = escapeHtml(d.number);
  if (d.lang === "fr") {
    return {
      subject: `Rappel : facture ${d.number} en attente de paiement`,
      html: layout(`<p>Bonjour ${c},</p><p>Petit rappel amical : la facture <strong>${n}</strong> de ${b} (<strong>${amount}</strong>) était due le ${due}. Si vous l'avez déjà réglée, merci et ignorez ce message.</p>`, d.link, "Payer maintenant"),
    };
  }
  return {
    subject: `Reminder: invoice ${d.number} is awaiting payment`,
    html: layout(`<p>Hi ${c},</p><p>A friendly reminder: invoice <strong>${n}</strong> from ${b} (<strong>${amount}</strong>) was due on ${due}. If you've already paid, thank you, and please ignore this message.</p>`, d.link, "Pay now"),
  };
}
