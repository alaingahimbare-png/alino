import type Stripe from "stripe";
import { stripe, supabaseAdmin } from "./server";

/** Marque la facture comme payée si la session Stripe Checkout est réglée. Idempotent. */
export async function markPaid(session: Stripe.Checkout.Session): Promise<boolean> {
  const documentId = session.metadata?.document_id;
  if (!documentId || session.payment_status !== "paid") return false;
  const { error } = await supabaseAdmin()
    .from("documents")
    .update({ status: "paid", stripe_checkout_session_id: session.id })
    .eq("id", documentId)
    .eq("kind", "invoice")
    .neq("status", "paid");
  if (error) throw error;
  return true;
}

/**
 * Vérifie directement auprès de Stripe si la dernière session de paiement d'une facture est réglée.
 * Permet de fonctionner même sans webhook (le webhook reste un filet de sécurité).
 */
export async function syncCheckoutSession(sessionId: string | null, documentId: string): Promise<boolean> {
  if (!sessionId) return false;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.document_id !== documentId) return false;
    return await markPaid(session);
  } catch (err) {
    console.error("syncCheckoutSession", err);
    return false;
  }
}
