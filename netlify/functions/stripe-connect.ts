// POST /api/stripe-connect  { action: "onboard" | "status" }
// Crée (si besoin) le compte Stripe Express du pro et renvoie le lien d'inscription,
// ou resynchronise l'état « paiements activés ».
import type { Config } from "@netlify/functions";
import { handler, HttpError, json, readJson, requireUser, siteUrl, stripe, supabaseAdmin } from "../lib/server";

export default handler("POST", async (req) => {
  const user = await requireUser(req);
  const { action } = await readJson<{ action?: string }>(req);
  if (action !== "onboard" && action !== "status") throw new HttpError(400, "invalid_action");

  const db = supabaseAdmin();
  const { data: biz, error } = await db
    .from("businesses")
    .select("owner_id, name, email, country, stripe_account_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!biz) throw new HttpError(404, "business_not_found");

  let accountId: string | null = biz.stripe_account_id;

  if (action === "status") {
    if (!accountId) return json({ connected: false, charges_enabled: false });
    const acct = await stripe().accounts.retrieve(accountId);
    await db.from("businesses").update({ stripe_charges_enabled: acct.charges_enabled }).eq("owner_id", user.id);
    return json({ connected: true, charges_enabled: acct.charges_enabled, details_submitted: acct.details_submitted });
  }

  if (!accountId) {
    const acct = await stripe().accounts.create(
      {
        type: "express",
        country: biz.country,
        email: biz.email || user.email || undefined,
        business_profile: biz.name ? { name: biz.name } : undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { owner_id: user.id },
      },
      { idempotencyKey: `connect-account-${user.id}` },
    );
    // N'écrit que si aucun compte n'a été enregistré entre-temps
    const { data: saved } = await db
      .from("businesses")
      .update({ stripe_account_id: acct.id })
      .eq("owner_id", user.id)
      .is("stripe_account_id", null)
      .select("stripe_account_id");
    accountId = saved?.[0]?.stripe_account_id ?? acct.id;
  }

  const link = await stripe().accountLinks.create({
    account: accountId!,
    type: "account_onboarding",
    refresh_url: `${siteUrl()}/settings?stripe=refresh`,
    return_url: `${siteUrl()}/settings?stripe=return`,
  });
  return json({ url: link.url });
});

export const config: Config = { path: "/api/stripe-connect" };
