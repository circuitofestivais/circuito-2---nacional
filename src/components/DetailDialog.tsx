import { useEffect, useRef } from "react";
import type { CatalogMeta, FestivalRecord, FieldKey } from "../types";
import { cleanDisplay, splitLinks } from "../lib/links";

export function DetailDialog({
  record,
  meta,
  onClose,
}: {
  record: FestivalRecord | null;
  meta: CatalogMeta;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (record && !dialog.open) dialog.showModal();
    if (!record && dialog.open) dialog.close();
  }, [record]);
  if (!record) return <dialog ref={ref} />;

  const fieldValue = (key: FieldKey) => {
    if (key === "s") return record.sourceFlags.sMarked ? "Marcado na fonte" : null;
    return record.fields[key];
  };

  return (
    <dialog
      ref={ref}
      className="detail-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="dialog-topline">
        <span>Registro {String(record.fields.sourceNumber).padStart(3, "0")}</span>
        <button className="icon-button" type="button" onClick={onClose} autoFocus>
          Fechar
        </button>
      </div>
      <header className="detail-header">
        <p>{cleanDisplay(record.fields.edition)} · {cleanDisplay(record.fields.state)}</p>
        <h2>{String(record.fields.name)}</h2>
        <p className="detail-location">
          {cleanDisplay(record.fields.municipality)} · {cleanDisplay(record.fields.region)}
        </p>
      </header>
      <div className="detail-grid">
        {meta.columns.map((column) => {
          const value = fieldValue(column.key);
          const note = record.notes[column.key];
          return (
            <section className="detail-field" key={column.key}>
              <h3>{column.label}</h3>
              <p className={value === null || value === "" ? "is-empty" : undefined}>
                {cleanDisplay(value)}
              </p>
              {note && (
                <div className="source-note">
                  <strong>Nota da fonte</strong>
                  <p>
                    {splitLinks(note).map((part, index) =>
                      part.href ? (
                        <a key={`${part.href}-${index}`} href={part.href} target="_blank" rel="noreferrer">
                          {part.text}
                        </a>
                      ) : (
                        <span key={index}>{part.text}</span>
                      ),
                    )}
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <footer className="detail-footer">
        <span>ID técnico: {record.id}</span>
        {record.sourceRow && <span>Linha {record.sourceRow} da planilha</span>}
      </footer>
    </dialog>
  );
}
