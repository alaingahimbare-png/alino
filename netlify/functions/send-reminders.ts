// Fonction planifiée (chaque jour) : relance les factures envoyées et non payées
// selon le calendrier du pro (par défaut 3, 7 et 14 jours après l'échéance).
// Idempotente : la contrainte unique (document_id, step) empêche tout doublon.
import type { Config } from "@netlify/functions";
import { reminderEmail, sendEmail } from "../lib/email";
import { loadDocument } from "../lib/documents";
import { siteUrl, supabaseAdmin } from "../lib/server";

const DAY_MS = 86_400_000;

function daysLate(dueDate: string, today: Date): number {
  const due = Date.UTC(+dueDate.slice(0, 4), +dueDate.slice(5, 7) - 1, +dueDate.slice(8, 10));
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((now - due) / DAY_MS);
}

export default async (): Promise<void> => {
  const db = supabaseAdmin();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const { data: candidates, error } = await db
    .from("documents")
    .select("id")
    .eq("kind", "invoice")
    .eq("status", "sent")
    .eq("reminders_paused", false)
    .lt("due_date", todayIso)
    .limit(1000);
  if (error) throw error;

  let sent = 0;
  for (const { id } of candidates ?? []) {
    try {
      const doc = await loadDocument({ id });
      if (!doc.client.email || !doc.due_date || doc.totals.total_cents <= 0) continue;
      const late = daysLate(doc.due_date, today);
      // Étape la plus haute atteinte ; si elle est déjà faite, on attend la suivante.
      const step = [...doc.business.reminder_days].sort((a, b) => b - a).find((d) => late >= d);
      if (step === undefined) continue;

      // Réserve l'étape : si la ligne existe déjà, une autre exécution s'en est chargée.
      const { data: claimed, error: claimErr } = await db
        .from("reminders")
        .upsert(
          { owner_id: doc.owner_id, document_id: doc.id, step, status: "sending" },
          { onConflict: "document_id,step", ignoreDuplicates: true },
        )
        .select("id");
      if (claimErr) throw claimErr;
      if (!claimed?.length) continue;

      try {
        const { subject, html } = reminderEmail({
          lang: doc.client.language,
          kind: "invoice",
          businessName: doc.business.name,
          clientName: doc.client.name,
          number: doc.number,
          totalCents: doc.totals.total_cents,
          currency: doc.business.currency,
          dueDate: doc.due_date,
          link: `${siteUrl()}/p/${doc.public_token}`,
          daysLate: late,
        });
        await sendEmail({ to: doc.client.email, subject, html, replyTo: doc.business.email });
        await db.from("reminders").update({ status: "sent" }).eq("id", claimed[0].id);
        sent++;
      } catch (err) {
        await db
          .from("reminders")
          .update({ status: "failed", error: String(err).slice(0, 500) })
          .eq("id", claimed[0].id);
        console.error(`reminder failed for ${id}`, err);
      }
    } catch (err) {
      console.error(`reminder check failed for ${id}`, err);
    }
  }
  console.log(`send-reminders: ${candidates?.length ?? 0} candidates, ${sent} sent`);
};

// 13 h UTC ≈ 9 h à Montréal / 14 h à Paris
export const config: Config = { schedule: "0 13 * * *" };
