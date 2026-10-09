export type CircuitoConfig = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  cacheTtlMinutes: number;
  maxStaleHours: number;
};

declare global {
  interface Window {
    CIRCUITO_CONFIG?: Partial<CircuitoConfig>;
  }
}

const raw = window.CIRCUITO_CONFIG ?? {};

export const config: CircuitoConfig = {
  supabaseUrl: raw.supabaseUrl?.trim() ?? "",
  supabasePublishableKey: raw.supabasePublishableKey?.trim() ?? "",
  cacheTtlMinutes: Number(raw.cacheTtlMinutes) || 15,
  maxStaleHours: Number(raw.maxStaleHours) || 24,
};

export const hasBackendConfig = Boolean(
  config.supabaseUrl && config.supabasePublishableKey,
);

export const isE2EMode = import.meta.env.VITE_E2E_MODE === "true";
