// POST /api/send-document  { id }
// Envoie le devis ou la facture au client par courriel et le passe au statut « envoyé ».
import type { Config } from "@netlify/functions";
import { documentEmail, sendEmail } from "../lib/email";
import { loadDocument } from "../lib/documents";
import { assertUuid, handler, HttpError, json, readJson, requireUser, siteUrl, supabaseAdmin } from "../lib/server";

export default handler("POST", async (req) => {
  const user = await requireUser(req);
  const { id } = await readJson<{ id?: string }>(req);
  const doc = await loadDocument({ id: assertUuid(id) });
  // Même réponse que « introuvable » pour ne pas révéler les documents des autres
  if (doc.owner_id !== user.id) throw new HttpError(404, "not_found");
  if (!doc.client.email) throw new HttpError(400, "client_has_no_email");
  if (doc.items.length === 0) throw new HttpError(400, "document_is_empty");
  if (["paid", "void", "declined"].includes(doc.status)) throw new HttpError(400, "document_closed");

  const lang = doc.client.language;
  const link = `${siteUrl()}/p/${doc.public_token}`;
  const { subject, html } = documentEmail({
    lang,
    kind: doc.kind,
    businessName: doc.business.name,
    clientName: doc.client.name,
    number: doc.number,
    totalCents: doc.totals.total_cents,
    currency: doc.business.currency,
    dueDate: doc.due_date,
    link,
  });
  const result = await sendEmail({ to: doc.client.email, subject, html, replyTo: doc.business.email });

  if (doc.status === "draft") {
    const { error } = await supabaseAdmin().from("documents").update({ status: "sent" }).eq("id", doc.id);
    if (error) throw error;
  }
  return json({ ok: true, simulated: result.simulated, link });
});

export const config: Config = { path: "/api/send-document" };
