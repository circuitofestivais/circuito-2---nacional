import type {
  CatalogPayload,
  FestivalRecord,
  PublicDataState,
} from "../types";
import { config } from "./config";
import { getSupabaseClient } from "./supabase";

const CACHE_KEY = "circuito-public-cache-v1";

type CachedData = {
  savedAt: string;
  records: FestivalRecord[];
};

function assetUrl(path: string) {
  return new URL(path, document.baseURI).toString();
}

export async function fetchSnapshot(): Promise<CatalogPayload> {
  const response = await fetch(assetUrl("data/festivals.json"), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Snapshot indisponível (${response.status})`);
  return (await response.json()) as CatalogPayload;
}

function readCache(): CachedData | null {
  try {
    const value = localStorage.getItem(CACHE_KEY);
    if (!value) return null;
    return JSON.parse(value) as CachedData;
  } catch {
    return null;
  }
}

function saveCache(records: FestivalRecord[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), records } satisfies CachedData),
    );
  } catch {
    // Falha de quota não impede a consulta online.
  }
}

export async function loadPublicData(
  snapshot: CatalogPayload,
): Promise<PublicDataState> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      records: snapshot.records,
      origin: "snapshot",
      fetchedAt: now,
      message: "Dados da planilha preservada no site.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("festivals")
      .select("payload,position,updated_at")
      .is("deleted_at", null)
      .order("position", { ascending: true })
      .limit(1000);
    if (error) throw error;
    const records = (data ?? [])
      .map((row) => row.payload as FestivalRecord)
      .filter((record) => record && record.id);
    if (records.length === 0) {
      return {
        records: snapshot.records,
        origin: "snapshot",
        fetchedAt: now,
        message: "A base online está vazia; exibindo a planilha preservada.",
      };
    }
    saveCache(records);
    return { records, origin: "supabase", fetchedAt: now };
  } catch {
    const cached = readCache();
    if (cached) {
      const ageHours =
        (Date.now() - new Date(cached.savedAt).getTime()) / (1000 * 60 * 60);
      if (Number.isFinite(ageHours) && ageHours <= config.maxStaleHours) {
        return {
          records: cached.records,
          origin: "cache",
          fetchedAt: cached.savedAt,
          message: `Sem conexão com a base. Cache de ${Math.max(1, Math.round(ageHours))} h em uso.`,
        };
      }
    }
    return {
      records: snapshot.records,
      origin: "snapshot",
      fetchedAt: now,
      message: "A base online não respondeu; exibindo a planilha preservada.",
    };
  }
}

export function getAssetUrl(path: string) {
  return assetUrl(path);
}
