import { useEffect, useMemo, useState } from "react";
import { DataNotice } from "../components/DataNotice";
import { DetailDialog } from "../components/DetailDialog";
import { FestivalCard } from "../components/FestivalCard";
import { FilterPanel } from "../components/FilterPanel";
import { Header } from "../components/Header";
import {
  FILTER_FIELDS,
  activeFilterCount,
  filterRecords,
  type Filters,
  type SortKey,
} from "../lib/search";
import type { CatalogPayload, FestivalRecord, PublicDataState } from "../types";

const PAGE_SIZE = 36;
const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "source", label: "Ordem da planilha" },
  { value: "name-asc", label: "Nome — A a Z" },
  { value: "name-desc", label: "Nome — Z a A" },
  { value: "edition-desc", label: "Edição — maior primeiro" },
  { value: "state", label: "UF" },
  { value: "municipality", label: "Município" },
];

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const filters: Filters = {};
  for (const field of FILTER_FIELDS) {
    const values = params.getAll(`f.${field}`).filter(Boolean);
    if (values.length) filters[field] = values;
  }
  const rawSort = params.get("ordem") as SortKey | null;
  return {
    query: params.get("busca") ?? "",
    sort: SORT_OPTIONS.some((option) => option.value === rawSort) ? rawSort! : "source",
    filters,
    festivalId: params.get("festival"),
  };
}

function updateUrl(query: string, sort: SortKey, filters: Filters, festivalId?: string | null) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("busca", query);
  if (sort !== "source") params.set("ordem", sort);
  for (const field of FILTER_FIELDS) {
    for (const value of filters[field] ?? []) params.append(`f.${field}`, value);
  }
  if (festivalId) params.set("festival", festivalId);
  const suffix = params.toString();
  const next = `${window.location.pathname}${suffix ? `?${suffix}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}

export function PublicPage({
  catalog,
  dataState,
  onRetry,
}: {
  catalog: CatalogPayload;
  dataState: PublicDataState;
  onRetry: () => void;
}) {
  const initial = useMemo(readUrlState, []);
  const [query, setQuery] = useState(initial.query);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [selected, setSelected] = useState<FestivalRecord | null>(() =>
    dataState.records.find((record) => record.id === initial.festivalId) ?? null,
  );

  const results = useMemo(
    () => filterRecords(dataState.records, query, filters, sort),
    [dataState.records, query, filters, sort],
  );
  const visible = results.slice(0, visibleCount);
  const filterCount = activeFilterCount(filters);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    updateUrl(query, sort, filters, selected?.id);
  }, [query, sort, filters, selected?.id]);

  useEffect(() => {
    if (selected) {
      const fresh = dataState.records.find((record) => record.id === selected.id);
      setSelected(fresh ?? null);
    }
  }, [dataState.records]);

  function clearAll() {
    setQuery("");
    setFilters({});
    setSort("source");
  }

  return (
    <>
      <a className="skip-link" href="#resultados">Pular para os resultados</a>
      <Header count={dataState.records.length} />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__index" aria-hidden="true">01—633</div>
          <div className="hero__copy">
            <p className="section-kicker">Pesquisa nacional · cinema e audiovisual</p>
            <h1 id="hero-title">Um mapa para fazer filmes circularem.</h1>
            <p>
              Consulte festivais brasileiros, compare perfis e encontre informações de inscrição
              preservadas da planilha-fonte.
            </p>
          </div>
          <div className="hero__facts" aria-label="Resumo da base">
            <div><strong>{dataState.records.length}</strong><span>festivais</span></div>
            <div><strong>{catalog.meta.columnCount}</strong><span>campos da fonte</span></div>
            <div><strong>{catalog.meta.recordsWithNotes}</strong><span>com notas</span></div>
          </div>
        </section>

        <DataNotice state={dataState} onRetry={onRetry} />

        <section className="catalog-shell" aria-label="Catálogo de festivais">
          <FilterPanel
            records={dataState.records}
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters({})}
            mobileOpen={mobileFilters}
            onMobileClose={() => setMobileFilters(false)}
          />
          <div className="results-column" id="resultados">
            <div className="search-toolbar">
              <label className="search-field">
                <span className="sr-only">Buscar em todos os campos e notas</span>
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar festival, cidade, perfil, inscrição…"
                  autoComplete="off"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca">×</button>
                )}
              </label>
              <button className="button button--quiet mobile-filter-button" type="button" onClick={() => setMobileFilters(true)}>
                Filtros{filterCount ? ` · ${filterCount}` : ""}
              </button>
              <label className="sort-field">
                <span>Ordenar</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                  {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            <div className="results-heading" aria-live="polite">
              <div>
                <p className="section-kicker">Resultado da consulta</p>
                <h2>{results.length.toLocaleString("pt-BR")} {results.length === 1 ? "festival" : "festivais"}</h2>
              </div>
              {(query || filterCount > 0 || sort !== "source") && (
                <button className="clear-button" type="button" onClick={clearAll}>Limpar consulta</button>
              )}
            </div>

            {results.length > 0 ? (
              <>
                <div className="festival-list">
                  {visible.map((record) => (
                    <FestivalCard key={record.id} record={record} onOpen={setSelected} />
                  ))}
                </div>
                {visible.length < results.length && (
                  <div className="load-more">
                    <p>Exibindo {visible.length} de {results.length}</p>
                    <button className="button" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                      Carregar mais festivais
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <span aria-hidden="true">○</span>
                <h2>Nenhum festival encontrado</h2>
                <p>Tente reduzir os filtros ou buscar por outro termo.</p>
                <button className="button" type="button" onClick={clearAll}>Limpar consulta</button>
              </div>
            )}
          </div>
        </section>

        <section className="source-section" id="fonte" aria-labelledby="source-title">
          <p className="section-kicker">Proveniência</p>
          <div className="source-section__grid">
            <div>
              <h2 id="source-title">A planilha continua sendo a referência.</h2>
              <p>
                Esta versão preserva {catalog.meta.recordCount} registros, {catalog.meta.columnCount} colunas,
                comentários de célula, valores vazios, acentos e URLs. A interface não completa lacunas nem
                corrige conteúdo editorial.
              </p>
            </div>
            <dl>
              <div><dt>Aba</dt><dd>{catalog.meta.sourceSheet}</dd></div>
              <div><dt>Atualização indicada</dt><dd>{new Date(catalog.meta.sourceUpdatedAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</dd></div>
              <div><dt>Registros</dt><dd>{catalog.meta.recordCount}</dd></div>
              <div><dt>Integridade</dt><dd><code>{catalog.meta.dataSha256.slice(0, 12)}…</code></dd></div>
            </dl>
          </div>
          <a className="source-link" href={catalog.meta.sourceUrl} target="_blank" rel="noreferrer">
            Abrir a publicação de origem <span aria-hidden="true">↗</span>
          </a>
          <a className="source-link source-link--secondary" href={new URL("catalogo.html", document.baseURI).toString()}>
            Catálogo integral sem JavaScript <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer className="site-footer">
        <span>Circuito de Festivais</span>
        <span>Dados sem invenção · consulta com contexto</span>
      </footer>
      <DetailDialog record={selected} meta={catalog.meta} onClose={() => setSelected(null)} />
    </>
  );
}
