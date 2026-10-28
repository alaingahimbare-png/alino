// POST /api/delete-account — supprime définitivement le compte de l'utilisateur connecté.
// Exigé par l'App Store et Google Play. La suppression de l'utilisateur Supabase
// efface en cascade l'entreprise, les clients, les documents, les lignes et les relances.
import type { Config } from "@netlify/functions";
import { handler, json, requireUser, supabaseAdmin } from "../lib/server";

export default handler("POST", async (req) => {
  const user = await requireUser(req);
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ ok: true });
});

export const config: Config = { path: "/api/delete-account" };
