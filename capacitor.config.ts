import type { CapacitorConfig } from "@capacitor/cli";

// Identifiant unique de l'app dans les magasins. Il ne peut plus changer
// après la première publication : modifiez-le maintenant si besoin.
const config: CapacitorConfig = {
  appId: "com.bleucupplus.relancefacile",
  appName: "RelanceFacile",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#1d4ed8",
      showSpinner: false,
    },
  },
  ios: {
    contentInset: "never",
  },
};

export default config;
