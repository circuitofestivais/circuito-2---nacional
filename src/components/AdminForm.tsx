import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AdminFestival,
  CatalogMeta,
  FestivalRecord,
  FieldKey,
  ValidationErrors,
} from "../types";
import { hasErrors, validateRecord } from "../lib/validation";

const FREE_TEXT_FIELDS = new Set<FieldKey>(["name", "edition", "municipality"]);
const NUMERIC_FIELDS = new Set<FieldKey>(["sourceNumber", "groupNumber"]);

export function AdminForm({
  record,
  meta,
  existing,
  onSave,
  onCancel,
}: {
  record: FestivalRecord | null;
  meta: CatalogMeta;
  existing: AdminFestival[];
  onSave: (record: FestivalRecord) => Promise<void>;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<FestivalRecord | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setDraft(structuredClone(record));
      setErrors({});
      if (ref.current && !ref.current.open) ref.current.showModal();
    } else if (ref.current?.open) {
      ref.current.close();
    }
  }, [record]);

  const columns = useMemo(() => meta.columns, [meta.columns]);
  if (!draft) return <dialog ref={ref} />;
  const isNew = !existing.some((item) => item.id === draft.id);

  function setField(key: FieldKey, value: string | number | null) {
    setDraft((current) =>
      current ? { ...current, fields: { ...current.fields, [key]: value } } : current,
    );
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function setNote(key: FieldKey, value: string) {
    setDraft((current) => {
      if (!current) return current;
      const notes = { ...current.notes };
      if (value === "") delete notes[key];
      else notes[key] = value;
      return { ...current, notes };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const currentDraft = draft;
    if (!currentDraft) return;
    const nextErrors = validateRecord(currentDraft, meta, existing);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      requestAnimationFrame(() => {
        ref.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }
    setSaving(true);
    try {
      await onSave(currentDraft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="admin-form-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form onSubmit={submit} noValidate>
        <div className="dialog-topline admin-form-topline">
          <div>
            <span>{isNew ? "Novo festival" : `Editar ${draft.id}`}</span>
            <h2>{isNew ? "Adicionar registro" : String(draft.fields.name)}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel}>
            Fechar
          </button>
        </div>
        <p className="form-intro">
          Os rótulos e opções vêm da planilha. Notas preservam os comentários de célula da fonte.
        </p>
        <div className="admin-form-grid">
          {columns.map((column) => {
            const key = column.key;
            if (key === "s") {
              return (
                <div className="form-field form-field--checkbox" key={key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.sourceFlags.sMarked}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                sourceFlags: { sMarked: event.target.checked },
                                sourceFormatting: {
                                  s: {
                                    fillType: event.target.checked ? "solid" : null,
                                    fillColor: event.target.checked ? "#00B0F0" : null,
                                  },
                                },
                              }
                            : current,
                        )
                      }
                    />
                    <span>
                      <strong>{column.sourceHeader}</strong>
                      <small>Marcação visual da coluna A</small>
                    </span>
                  </label>
                </div>
              );
            }
            const value = draft.fields[key] ?? "";
            const inputId = `admin-field-${key}`;
            const errorId = `admin-error-${key}`;
            return (
              <div className={`form-field form-field--${key}`} key={key}>
                <label htmlFor={inputId}>
                  {column.sourceHeader.trim()} <small>coluna {column.sourceColumn}</small>
                  {column.required && <span aria-label="obrigatório"> *</span>}
                </label>
                {NUMERIC_FIELDS.has(key) ? (
                  <input
                    id={inputId}
                    type="number"
                    min="1"
                    step="1"
                    value={String(value)}
                    onChange={(event) => setField(key, Number(event.target.value))}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={errors[key] ? errorId : undefined}
                  />
                ) : FREE_TEXT_FIELDS.has(key) ? (
                  <input
                    id={inputId}
                    type="text"
                    value={String(value)}
                    onChange={(event) => setField(key, event.target.value)}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={errors[key] ? errorId : undefined}
                  />
                ) : (
                  <select
                    id={inputId}
                    value={String(value)}
                    onChange={(event) => setField(key, event.target.value || null)}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={errors[key] ? errorId : undefined}
                  >
                    <option value="">{column.required ? "Selecione…" : "Sem informação"}</option>
                    {column.distinctValues.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                {errors[key] && <p className="field-error" id={errorId}>{errors[key]}</p>}
                <details className="note-editor" open={Boolean(draft.notes[key])}>
                  <summary>Nota da fonte {draft.notes[key] ? "(preenchida)" : ""}</summary>
                  <label htmlFor={`${inputId}-note`} className="sr-only">
                    Nota da fonte para {column.sourceHeader}
                  </label>
                  <textarea
                    id={`${inputId}-note`}
                    rows={4}
                    value={draft.notes[key] ?? ""}
                    onChange={(event) => setNote(key, event.target.value)}
                  />
                </details>
              </div>
            );
          })}
        </div>
        <div className="admin-form-footer">
          <p>{Object.keys(errors).length ? "Revise os campos sinalizados." : "* Campos sempre preenchidos na fonte."}</p>
          <div className="dialog-actions">
            <button className="button button--quiet" type="button" onClick={onCancel} disabled={saving}>
              Cancelar sem salvar
            </button>
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar festival"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
