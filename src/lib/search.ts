import type { FestivalRecord, FieldKey } from "../types.ts";

export type SortKey =
  | "source"
  | "name-asc"
  | "name-desc"
  | "edition-desc"
  | "state"
  | "municipality";

export type Filters = Partial<Record<FieldKey | "sMarked", string[]>>;

export const FILTER_FIELDS: Array<FieldKey | "sMarked"> = [
  "sMarked",
  "law",
  "exhibitionMode",
  "onlineExhibitionMode",
  "state",
  "region",
  "themeProfile",
  "scopeProfile",
  "format",
  "shortFilmLimit",
  "registration",
  "registrationFormat",
  "virtualPlatform",
  "multiFormat",
];

export const FILTER_LABELS: Record<FieldKey | "sMarked", string> = {
  s: "S",
  sMarked: "S — marcação da fonte",
  sourceNumber: "N° — coluna B",
  groupNumber: "N° — coluna C",
  law: "LEI",
  exhibitionMode: "n° — coluna E",
  onlineExhibitionMode: "ON",
  name: "NOME",
  edition: "EDIÇÃO",
  state: "UF",
  municipality: "MUNICÍPIO",
  region: "REGIÃO",
  themeProfile: "TEMÁTICA/PERFIL",
  scopeProfile: "PERFIL",
  format: "BITOLA",
  shortFilmLimit: "ACEITA CURTAS ATÉ",
  registration: "INSCRIÇÃO",
  registrationFormat: "FORMATO INSCRIÇÃO",
  virtualPlatform: "PLATAFORMA VIRTUAL",
  multiFormat: "MULTIFORMATOS",
};

export function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function searchableText(record: FestivalRecord) {
  return normalize(
    [
      ...Object.values(record.fields),
      ...Object.values(record.notes),
      record.sourceFlags.sMarked ? "S marcado" : "",
    ].join(" "),
  );
}

export function optionValues(
  records: FestivalRecord[],
  field: FieldKey | "sMarked",
): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const raw =
      field === "sMarked"
        ? record.sourceFlags.sMarked
          ? "Marcado"
          : "Não marcado"
        : record.fields[field];
    if (raw === null || raw === "") continue;
    const value = String(raw);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, "pt-BR", { numeric: true }));
}

export function filterRecords(
  records: FestivalRecord[],
  query: string,
  filters: Filters,
  sort: SortKey,
) {
  const terms = normalize(query).split(" ").filter(Boolean);
  const filtered = records.filter((record) => {
    if (terms.length && !terms.every((term) => searchableText(record).includes(term))) {
      return false;
    }
    return Object.entries(filters).every(([field, selected]) => {
      if (!selected?.length) return true;
      const actual =
        field === "sMarked"
          ? record.sourceFlags.sMarked
            ? "Marcado"
            : "Não marcado"
          : String(record.fields[field as FieldKey] ?? "");
      return selected.includes(actual);
    });
  });

  const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });
  return filtered.sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return collator.compare(String(a.fields.name), String(b.fields.name));
      case "name-desc":
        return collator.compare(String(b.fields.name), String(a.fields.name));
      case "edition-desc": {
        const aNumber = Number(String(a.fields.edition).match(/\d+/)?.[0] ?? 0);
        const bNumber = Number(String(b.fields.edition).match(/\d+/)?.[0] ?? 0);
        return bNumber - aNumber || collator.compare(String(a.fields.name), String(b.fields.name));
      }
      case "state":
        return (
          collator.compare(String(a.fields.state), String(b.fields.state)) ||
          collator.compare(String(a.fields.name), String(b.fields.name))
        );
      case "municipality":
        return (
          collator.compare(String(a.fields.municipality), String(b.fields.municipality)) ||
          collator.compare(String(a.fields.name), String(b.fields.name))
        );
      default:
        return Number(a.fields.sourceNumber) - Number(b.fields.sourceNumber);
    }
  });
}

export function activeFilterCount(filters: Filters) {
  return Object.values(filters).reduce((total, values) => total + (values?.length ?? 0), 0);
}
