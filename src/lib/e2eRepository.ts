import type { Session } from "@supabase/supabase-js";
import type { AdminFestival, FestivalRecord } from "../types";
import type { FestivalRepository } from "./repository";

const STORAGE_KEY = "circuito-e2e-admin-v1";

function read(): AdminFestival[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? (JSON.parse(stored) as AdminFestival[]) : [];
}

function write(records: AdminFestival[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export class E2EFestivalRepository implements FestivalRepository {
  isConfigured() {
    return true;
  }
  async getSession() {
    return { user: { email: "teste@circuito.local" } } as unknown as Session;
  }
  async isAdmin() {
    return true;
  }
  async sendMagicLink() {}
  async signOut() {}
  async list() {
    return read();
  }
  async save(record: FestivalRecord) {
    const records = read();
    const index = records.findIndex((item) => item.id === record.id);
    const saved = { ...record, deletedAt: null, updatedAt: new Date().toISOString() };
    if (index >= 0) records[index] = saved;
    else records.push(saved);
    write(records);
  }
  async archive(id: string) {
    write(
      read().map((item) =>
        item.id === id ? { ...item, deletedAt: new Date().toISOString() } : item,
      ),
    );
  }
  async restore(id: string) {
    write(read().map((item) => (item.id === id ? { ...item, deletedAt: null } : item)));
  }
  async seed(records: FestivalRecord[]) {
    if (read().length === 0) write(records.map((record) => ({ ...record, deletedAt: null })));
  }
}
