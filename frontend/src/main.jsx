import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./styles/base.css";
import "./styles/landing.css";
import "./styles/workspace.css";
import "./styles/responsive.css";
import App from "./App";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(console.error),
  );
