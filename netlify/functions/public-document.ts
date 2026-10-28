// GET  /api/public/:token            → affiche un devis/une facture au client (sans connexion)
// POST /api/public/:token  { action: "accept" | "decline" | "pay" }
//   accept/decline : réponse du client à un devis
//   pay            : crée une session Stripe Checkout pour une facture
import type { Config, Context } from "@netlify/functions";
import { loadDocument, type FullDocument } from "../lib/documents";
import { syncCheckoutSession } from "../lib/payments";
import { assertUuid, HttpError, json, readJson, siteUrl, stripe, supabaseAdmin } from "../lib/server";

function canPay(d: FullDocument): boolean {
  return (
    d.kind === "invoice" &&
    d.status === "sent" &&
    d.totals.total_cents > 0 &&
    !!d.business.stripe_account_id &&
    d.business.stripe_charges_enabled
  );
}

// Uniquement ce que le client a besoin de voir — pas d'identifiants internes ni de données Stripe.
function publicView(d: FullDocument) {
  return {
    kind: d.kind,
    number: d.number,
    status: d.status,
    issue_date: d.issue_date,
    due_date: d.due_date,
    tax_rate: d.tax_rate,
    notes: d.notes,
    paid_at: d.paid_at,
    items: d.items.map(({ description, quantity, unit_price_cents }) => ({ description, quantity, unit_price_cents })),
    totals: d.totals,
    currency: d.business.currency,
    language: d.client.language,
    client: { name: d.client.name, address: d.client.address },
    business: { name: d.business.name, email: d.business.email, phone: d.business.phone, address: d.business.address },
    can_pay: canPay(d),
    can_respond: d.kind === "quote" && d.status === "sent",
  };
}

async function load(token: string): Promise<FullDocument> {
  const doc = await loadDocument({ token: assertUuid(token) });
  if (doc.status === "draft") throw new HttpError(404, "not_found"); // brouillon : pas encore partagé
  // Facture en attente avec un paiement Stripe commencé : on vérifie directement auprès de Stripe
  // (fonctionne sans webhook, par exemple au retour du client après le paiement).
  if (doc.kind === "invoice" && doc.status === "sent" && doc.stripe_checkout_session_id) {
    if (await syncCheckoutSession(doc.stripe_checkout_session_id, doc.id)) {
      return loadDocument({ token: doc.public_token });
    }
  }
  return doc;
}

async function feeFor(totalCents: number): Promise<number | undefined> {
  const bps = Number(process.env.PLATFORM_FEE_BPS || 0);
  if (!Number.isFinite(bps) || bps <= 0) return undefined;
  return Math.floor((totalCents * Math.min(bps, 2000)) / 10000);
}

export default async (req: Request, context: Context): Promise<Response> => {
  try {
    const token = context.params.token ?? "";

    if (req.method === "GET") return json(publicView(await load(token)));
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const { action } = await readJson<{ action?: string }>(req);
    const doc = await load(token);
    const db = supabaseAdmin();

    if (action === "accept" || action === "decline") {
      if (doc.kind !== "quote" || doc.status !== "sent") throw new HttpError(409, "cannot_respond");
      const { error } = await db
        .from("documents")
        .update({ status: action === "accept" ? "accepted" : "declined" })
        .eq("id", doc.id)
        .eq("status", "sent");
      if (error) throw error;
      return json(publicView(await load(token)));
    }

    if (action === "pay") {
      if (!canPay(doc)) throw new HttpError(409, "cannot_pay");
      const lang = doc.client.language;
      const session = await stripe().checkout.sessions.create({
        mode: "payment",
        locale: lang,
        customer_email: doc.client.email ?? undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: doc.business.currency.toLowerCase(),
              unit_amount: doc.totals.total_cents,
              product_data: {
                name: `${lang === "fr" ? "Facture" : "Invoice"} ${doc.number}${doc.business.name ? ` — ${doc.business.name}` : ""}`,
              },
            },
          },
        ],
        payment_intent_data: {
          transfer_data: { destination: doc.business.stripe_account_id! },
          application_fee_amount: await feeFor(doc.totals.total_cents),
          metadata: { document_id: doc.id },
        },
        metadata: { document_id: doc.id },
        success_url: `${siteUrl()}/p/${doc.public_token}?paid=1`,
        cancel_url: `${siteUrl()}/p/${doc.public_token}`,
      });
      await db.from("documents").update({ stripe_checkout_session_id: session.id }).eq("id", doc.id);
      return json({ url: session.url });
    }

    throw new HttpError(400, "invalid_action");
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "server_error" }, 500);
  }
};

export const config: Config = { path: "/api/public/:token" };
