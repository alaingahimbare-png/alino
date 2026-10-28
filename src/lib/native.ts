// Réglages propres à l'app native : barre d'état, écran de démarrage, bouton retour Android.
import { App as CapApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { isNative } from "./platform";

export function initNative(): void {
  if (!isNative) return;
  document.documentElement.classList.add("native");

  StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  StatusBar.setBackgroundColor({ color: "#1d4ed8" }).catch(() => undefined);

  // Bouton retour Android : revient en arrière dans l'app, ou la ferme depuis l'accueil
  CapApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack && window.location.pathname !== "/") window.history.back();
    else CapApp.exitApp();
  });

  // Cache l'écran de démarrage une fois l'interface affichée
  requestAnimationFrame(() => SplashScreen.hide().catch(() => undefined));
}
