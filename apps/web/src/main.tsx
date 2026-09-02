import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root tidak ditemukan di index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA (M5): service worker offline shell — hanya produksi, hindari ganggu HMR dev
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
