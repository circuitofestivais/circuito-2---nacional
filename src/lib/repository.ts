import type { Session } from "@supabase/supabase-js";
import type { AdminFestival, FestivalRecord } from "../types";
import { getSupabaseClient } from "./supabase";

export interface FestivalRepository {
  isConfigured(): boolean;
  getSession(): Promise<Session | null>;
  isAdmin(): Promise<boolean>;
  signInWithGitHub(): Promise<void>;
  signOut(): Promise<void>;
  list(): Promise<AdminFestival[]>;
  save(record: FestivalRecord): Promise<void>;
  archive(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  seed(records: FestivalRecord[]): Promise<void>;
}

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase não configurado.");
  return client;
}

export class SupabaseFestivalRepository implements FestivalRepository {
  isConfigured() {
    return Boolean(getSupabaseClient());
  }

  async getSession() {
    const client = requireClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async isAdmin() {
    const client = requireClient();
    const { data, error } = await client.rpc("is_circuito_admin");
    if (error) throw error;
    return data === true;
  }

  async signInWithGitHub() {
    const client = requireClient();
    const redirectUrl = new URL(window.location.pathname, window.location.origin);
    redirectUrl.searchParams.set("oauth", "github");
    const { error } = await client.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: redirectUrl.toString(),
        scopes: "read:user",
      },
    });
    if (error) throw error;
  }

  async signOut() {
    const client = requireClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async list() {
    const client = requireClient();
    const { data, error } = await client
      .from("festivals")
      .select("payload,deleted_at,updated_at,position")
      .order("position", { ascending: true })
      .limit(1000);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...(row.payload as FestivalRecord),
      deletedAt: row.deleted_at as string | null,
      updatedAt: row.updated_at as string,
    }));
  }

  async save(record: FestivalRecord) {
    const client = requireClient();
    const { error } = await client.from("festivals").upsert(
      {
        id: record.id,
        source_number: Number(record.fields.sourceNumber),
        source_row: record.sourceRow,
        position: Number(record.fields.sourceNumber),
        payload: record,
        deleted_at: null,
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  }

  async archive(id: string) {
    const client = requireClient();
    const { error } = await client
      .from("festivals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async restore(id: string) {
    const client = requireClient();
    const { error } = await client.from("festivals").update({ deleted_at: null }).eq("id", id);
    if (error) throw error;
  }

  async seed(records: FestivalRecord[]) {
    const client = requireClient();
    for (let index = 0; index < records.length; index += 100) {
      const batch = records.slice(index, index + 100).map((record) => ({
        id: record.id,
        source_number: Number(record.fields.sourceNumber),
        source_row: record.sourceRow,
        position: Number(record.fields.sourceNumber),
        payload: record,
        deleted_at: null,
      }));
      const { error } = await client.from("festivals").upsert(batch, { onConflict: "id" });
      if (error) throw error;
    }
  }
}
