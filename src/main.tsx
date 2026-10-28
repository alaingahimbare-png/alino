import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./lib/i18n";
import { initNative } from "./lib/native";
import { registerServiceWorker } from "./lib/platform";
import { SessionProvider } from "./lib/session";
import "./styles.css";

registerServiceWorker();
initNative();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
