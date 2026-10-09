import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

async function bootstrap() {
  try {
    const response = await fetch(new URL("config.json", document.baseURI), { cache: "no-store" });
    if (response.ok) window.CIRCUITO_CONFIG = await response.json();
  } catch {
    window.CIRCUITO_CONFIG = {};
  }
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
}

void bootstrap();
