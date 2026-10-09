import type { FestivalRecord } from "../types";
import {
  FILTER_FIELDS,
  FILTER_LABELS,
  activeFilterCount,
  optionValues,
  type Filters,
} from "../lib/search";

type Props = {
  records: FestivalRecord[];
  filters: Filters;
  onChange: (filters: Filters) => void;
  onClear: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

export function FilterPanel({
  records,
  filters,
  onChange,
  onClear,
  mobileOpen,
  onMobileClose,
}: Props) {
  const count = activeFilterCount(filters);
  function toggle(field: keyof Filters, value: string) {
    const current = filters[field] ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...filters, [field]: next });
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="filter-backdrop"
          aria-label="Fechar filtros"
          onClick={onMobileClose}
        />
      )}
      <aside className={`filter-panel ${mobileOpen ? "is-open" : ""}`} aria-label="Filtros">
        <div className="filter-panel__header">
          <div>
            <p className="section-kicker">Refinar consulta</p>
            <h2>Filtros {count > 0 && <span>({count})</span>}</h2>
          </div>
          <button className="icon-button mobile-only" type="button" onClick={onMobileClose}>
            Fechar
          </button>
        </div>
        {count > 0 && (
          <button className="clear-button" type="button" onClick={onClear}>
            Limpar todos os filtros
          </button>
        )}
        <div className="filter-groups">
          {FILTER_FIELDS.map((field, index) => {
            const options = optionValues(records, field);
            if (options.length === 0) return null;
            return (
              <details key={field} open={index < 5 || Boolean(filters[field]?.length)}>
                <summary>
                  <span>{FILTER_LABELS[field]}</span>
                  <span className="filter-summary-count">
                    {filters[field]?.length ? `${filters[field]?.length} selecionado(s)` : options.length}
                  </span>
                </summary>
                <div className="filter-options">
                  {options.map((option) => {
                    const id = `filter-${field}-${encodeURIComponent(option.value)}`;
                    return (
                      <label key={option.value} htmlFor={id}>
                        <input
                          id={id}
                          type="checkbox"
                          checked={filters[field]?.includes(option.value) ?? false}
                          onChange={() => toggle(field, option.value)}
                        />
                        <span>{option.value}</span>
                        <small>{option.count}</small>
                      </label>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </aside>
    </>
  );
}
