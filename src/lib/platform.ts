// Différences entre le site web et l'app native (Android / iOS via Capacitor).
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Network } from "@capacitor/network";
import { Share } from "@capacitor/share";
import { useEffect, useState } from "react";

export const isNative = Capacitor.isNativePlatform();

// Dans l'app native, les pages sont servies localement : les fonctions serveur
// et les liens envoyés aux clients doivent viser le site en ligne.
const SITE = ((import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "").replace(/\/$/, "");

/** Adresse publique du site (liens clients, retours Stripe). */
export function publicSiteUrl(): string {
  return isNative && SITE ? SITE : window.location.origin;
}

/** Adresse d'une fonction serveur, ex. apiUrl("/api/send-document"). */
export function apiUrl(path: string): string {
  return isNative && SITE ? `${SITE}${path}` : path;
}

/** Ouvre une page externe (Stripe…) : navigateur intégré dans l'app, même onglet sur le web. */
export async function openExternal(url: string): Promise<void> {
  if (isNative) await Browser.open({ url });
  else window.location.href = url;
}

/** Partage natif (SMS, WhatsApp, courriel…) si possible, sinon copie dans le presse-papiers. */
export async function shareLink(url: string, title: string): Promise<"shared" | "copied"> {
  if (isNative || ("share" in navigator && matchMedia("(pointer: coarse)").matches)) {
    try {
      if (isNative) await Share.share({ title, text: title, url, dialogTitle: title });
      else await navigator.share({ title, url });
      return "shared";
    } catch {
      /* partage annulé ou indisponible : on copie */
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

export function tap(): void {
  if (isNative) Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

/** true quand l'appareil n'a plus de connexion. */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    if (isNative) {
      Network.getStatus().then((s) => setOffline(!s.connected));
      const sub = Network.addListener("networkStatusChange", (s) => setOffline(!s.connected));
      return () => {
        sub.then((h) => h.remove());
      };
    }
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return offline;
}

/** Enregistre le service worker (site web uniquement). */
export function registerServiceWorker(): void {
  if (isNative || !("serviceWorker" in navigator) || import.meta.env.DEV) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
