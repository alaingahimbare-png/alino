// POST /api/stripe-webhook — événements Stripe (signature vérifiée).
// À configurer dans Stripe avec « Écouter les événements des comptes connectés » activé
// pour recevoir account.updated.
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return json({ error: "missing_signature" }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return json({ error: "invalid_signature" }, 400);
  }

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
