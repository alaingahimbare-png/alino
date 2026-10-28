import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";
import { supabase } from "./supabase";
import type { Business } from "./types";

interface SessionState {
  session: Session | null;
  business: Business | null;
  loading: boolean;
  refreshBusiness: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBusiness = useCallback(async () => {
    const { data } = await supabase.from("businesses").select("*").maybeSingle();
    if (data) {
      setBusiness(data as Business);
      return;
    }
    // Première connexion : crée la fiche entreprise
    const { data: created, error } = await supabase
      .from("businesses")
      .insert({ language: lang })
      .select("*")
      .single();
    if (error) {
      const { data: again } = await supabase.from("businesses").select("*").maybeSingle();
      setBusiness((again as Business) ?? null);
    } else {
      setBusiness(created as Business);
    }
  }, [lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setBusiness(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    refreshBusiness().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  return <Ctx.Provider value={{ session, business, loading, refreshBusiness }}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}
