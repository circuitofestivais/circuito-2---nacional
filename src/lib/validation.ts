import type {
  AdminFestival,
  CatalogMeta,
  FestivalRecord,
  FieldKey,
  ValidationErrors,
} from "../types.ts";

const URL_RE = /https?:\/\/[^\s)\]}>,;]+/gi;

export function validateRecord(
  record: FestivalRecord,
  meta: CatalogMeta,
  existing: AdminFestival[] = [],
): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const column of meta.columns) {
    const value = record.fields[column.key];
    if (column.required && (value === null || String(value).trim() === "")) {
      errors[column.key] = "Campo obrigatório conforme o padrão da planilha.";
    }
  }

  for (const field of ["sourceNumber", "groupNumber"] as FieldKey[]) {
    const value = Number(record.fields[field]);
    if (!Number.isInteger(value) || value < 1) {
      errors[field] = "Use um número inteiro maior que zero.";
    }
  }

  const duplicate = existing.find(
    (item) =>
      item.id !== record.id &&
      Number(item.fields.sourceNumber) === Number(record.fields.sourceNumber),
  );
  if (duplicate) errors.sourceNumber = "Este N° da coluna B já está em uso.";

  if (
    record.fields.onlineExhibitionMode &&
    !["H", "ON"].includes(String(record.fields.exhibitionMode))
  ) {
    errors.onlineExhibitionMode = "Na fonte, ON só é usado em registros H ou ON.";
  }

  if (
    record.fields.registrationFormat === "Multiformatos" &&
    !String(record.fields.multiFormat ?? "").trim()
  ) {
    errors.multiFormat = "Informe a combinação registrada em MULTIFORMATOS.";
  }

  for (const [field, note] of Object.entries(record.notes) as Array<[FieldKey, string]>) {
    for (const candidate of note.match(URL_RE) ?? []) {
      try {
        new URL(candidate);
      } catch {
        errors[field] = "A nota contém uma URL inválida.";
      }
    }
  }
  return errors;
}

export function hasErrors(errors: ValidationErrors) {
  return Object.keys(errors).length > 0;
}
