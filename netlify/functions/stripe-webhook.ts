// POST /api/stripe-webhook — événements Stripe (signature vérifiée).
// Deux destinations Stripe pointent ici :
//   - « Your account » : checkout.session.*      → STRIPE_WEBHOOK_SECRET
//   - « Connected accounts » : account.updated   → STRIPE_CONNECT_WEBHOOK_SECRET
import type { Config } from "@netlify/functions";
import type Stripe from "stripe";
import { handler, json, stripe, supabaseAdmin } from "../lib/server";

async function markPaid(session: Stripe.Checkout.Session) {
  const documentId = session.metadata?.document_id;
  if (!documentId || session.payment_status !== "paid") return;
  const { error } = await supabaseAdmin()
    .from("documents")
    .update({ status: "paid", stripe_checkout_session_id: session.id })
    .eq("id", documentId)
    .eq("kind", "invoice")
    .neq("status", "paid");
  if (error) throw error;
}

export default handler("POST", async (req) => {
  // Stripe envoie les événements de la plateforme et ceux des comptes connectés
  // via deux destinations distinctes, chacune avec son propre secret.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => !!s,
  );
  const signature = req.headers.get("stripe-signature");
  if (secrets.length === 0 || !signature) return json({ error: "missing_signature" }, 400);

  const body = await req.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = await stripe().webhooks.constructEventAsync(body, signature, secret);
      break;
    } catch {
      /* essaie le secret suivant */
    }
  }
  if (!event) return json({ error: "invalid_signature" }, 400);

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await markPaid(event.data.object);
      break;
    case "account.updated": {
      const acct = event.data.object;
      const { error } = await supabaseAdmin()
        .from("businesses")
        .update({ stripe_charges_enabled: acct.charges_enabled })
        .eq("stripe_account_id", acct.id);
      if (error) throw error;
      break;
    }
    default:
      break;
  }
  return json({ received: true });
});

export const config: Config = { path: "/api/stripe-webhook" };
