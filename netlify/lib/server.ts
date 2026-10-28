// Outils communs aux fonctions serveur. Ne jamais importer ce fichier côté navigateur.
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import Stripe from "stripe";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

let admin: SupabaseClient | null = null;
/** Client Supabase avec la clé service role : contourne la RLS, à utiliser avec soin. */
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  stripeClient ??= new Stripe(env("STRIPE_SECRET_KEY"));
  return stripeClient;
}

export function siteUrl(): string {
  return (process.env.SITE_URL || process.env.URL || "http://localhost:8888").replace(/\/$/, "");
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Vérifie le jeton Supabase envoyé par le navigateur et renvoie l'utilisateur. */
export async function requireUser(req: Request): Promise<User> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "unauthorized");
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "unauthorized");
  return data.user;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// L'app native (Capacitor) sert ses pages depuis ces origines locales et appelle l'API du site.
// L'authentification passe par un jeton Bearer (pas de cookie), donc autoriser ces origines
// n'expose rien de plus : chaque requête doit toujours porter un jeton valide.
const NATIVE_ORIGINS = new Set(["capacitor://localhost", "https://localhost", "http://localhost"]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin || !NATIVE_ORIGINS.has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function withHeaders(res: Response, headers: Record<string, string>): Response {
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

/** Enveloppe une fonction : méthode autorisée, CORS pour l'app native, erreurs propres. */
export function handler(method: string, fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== method) return withHeaders(json({ error: "method_not_allowed" }, 405), cors);
    try {
      return withHeaders(await fn(req), cors);
    } catch (err) {
      if (err instanceof HttpError) return withHeaders(json({ error: err.message }, err.status), cors);
      console.error(err);
      return withHeaders(json({ error: "server_error" }, 500), cors);
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertUuid(v: unknown): string {
  if (typeof v !== "string" || !UUID_RE.test(v)) throw new HttpError(400, "invalid_id");
  return v;
}
