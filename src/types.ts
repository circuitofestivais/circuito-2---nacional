export const FIELD_KEYS = [
  "s",
  "sourceNumber",
  "groupNumber",
  "law",
  "exhibitionMode",
  "onlineExhibitionMode",
  "name",
  "edition",
  "state",
  "municipality",
  "region",
  "themeProfile",
  "scopeProfile",
  "format",
  "shortFilmLimit",
  "registration",
  "registrationFormat",
  "virtualPlatform",
  "multiFormat",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];
export type FieldValue = string | number | null;
export type FestivalFields = Record<FieldKey, FieldValue>;

export type ColumnMeta = {
  key: FieldKey;
  sourceColumn: string;
  sourceHeader: string;
  label: string;
  required: boolean;
  distinctValues: string[];
};

export type FestivalRecord = {
  id: string;
  sourceRow: number | null;
  sourceCells: Partial<Record<FieldKey, string>>;
  fields: FestivalFields;
  notes: Partial<Record<FieldKey, string>>;
  sourceFormatting: {
    s: { fillType: string | null; fillColor: string | null };
  };
  sourceFlags: { sMarked: boolean };
};

export type CatalogMeta = {
  schemaVersion: number;
  sourceFile: string;
  sourceSheet: string;
  sourceUrl: string;
  sourceUpdatedAt: string;
  importedAt: string;
  recordCount: number;
  columnCount: number;
  commentCount: number;
  recordsWithNotes: number;
  urlCountInNotes: number;
  sourceSha256: string;
  dataSha256: string;
  columns: ColumnMeta[];
  formulas: Array<{ coordinate: string; formula: string; cachedValue: number | string }>;
};

export type CatalogPayload = { meta: CatalogMeta; records: FestivalRecord[] };

export type PublicDataState = {
  records: FestivalRecord[];
  origin: "snapshot" | "supabase" | "cache";
  fetchedAt: string;
  message?: string;
};

export type AdminFestival = FestivalRecord & {
  deletedAt?: string | null;
  updatedAt?: string;
};

export type ValidationErrors = Partial<Record<FieldKey | "general", string>>;
