import type { FestivalRecord } from "../types";
import { cleanDisplay } from "../lib/links";

export function FestivalCard({
  record,
  onOpen,
}: {
  record: FestivalRecord;
  onOpen: (record: FestivalRecord) => void;
}) {
  const f = record.fields;
  const noteCount = Object.keys(record.notes).length;
  return (
    <article className="festival-card" data-festival-id={record.id}>
      <button type="button" className="festival-card__button" onClick={() => onOpen(record)}>
        <span className="festival-card__index">{String(f.sourceNumber).padStart(3, "0")}</span>
        <span className="festival-card__content">
          <span className="festival-card__eyebrow">
            {cleanDisplay(f.edition)} · {cleanDisplay(f.state)} · {cleanDisplay(f.region)}
          </span>
          <span className="festival-card__title">{String(f.name)}</span>
          <span className="festival-card__location">{cleanDisplay(f.municipality)}</span>
          <span className="festival-card__tags" aria-label="Classificações">
            {record.sourceFlags.sMarked && <span className="tag tag--source">S</span>}
            <span className="tag">{cleanDisplay(f.law)}</span>
            <span className="tag">{cleanDisplay(f.exhibitionMode)}</span>
            <span className="tag">{cleanDisplay(f.scopeProfile)}</span>
            <span className="tag">{cleanDisplay(f.themeProfile)}</span>
          </span>
          <span className="festival-card__submission">
            <strong>{cleanDisplay(f.registrationFormat)}</strong>
            <span>{cleanDisplay(f.shortFilmLimit)}</span>
          </span>
        </span>
        <span className="festival-card__aside">
          {noteCount > 0 && <span>{noteCount} {noteCount === 1 ? "nota" : "notas"}</span>}
          <span aria-hidden="true">Abrir ↗</span>
        </span>
      </button>
    </article>
  );
}
