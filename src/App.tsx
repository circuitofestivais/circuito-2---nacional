import { useCallback, useEffect, useState } from "react";
import { AdminPage } from "./pages/AdminPage";
import { PublicPage } from "./pages/PublicPage";
import { fetchSnapshot, loadPublicData } from "./lib/catalog";
import type { CatalogPayload, PublicDataState } from "./types";

export default function App() {
  const [route, setRoute] = useState(window.location.hash === "#admin" ? "admin" : "public");
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [dataState, setDataState] = useState<PublicDataState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash === "#admin" ? "admin" : "public");
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const nextCatalog = catalog ?? (await fetchSnapshot());
      setCatalog(nextCatalog);
      setDataState(await loadPublicData(nextCatalog));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os dados.");
    }
  }, [catalog]);

  useEffect(() => { void load(); }, []);

  if (error) {
    return <main className="fatal-state"><p className="section-kicker">Falha ao carregar</p><h1>A base de festivais não está disponível.</h1><p>{error}</p><button className="button" type="button" onClick={() => void load()}>Tentar novamente</button></main>;
  }
  if (!catalog || !dataState) {
    return <main className="loading-state loading-state--page" role="status"><span className="spinner" />Carregando os 633 festivais…</main>;
  }
  return route === "admin" ? <AdminPage catalog={catalog} /> : <PublicPage catalog={catalog} dataState={dataState} onRetry={() => void load()} />;
}
