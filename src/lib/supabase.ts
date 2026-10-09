import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, hasBackendConfig } from "./config";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!hasBackendConfig) return null;
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
