import type { PublicDataState } from "../types";

export function DataNotice({ state, onRetry }: { state: PublicDataState; onRetry: () => void }) {
  if (state.origin === "supabase" && !state.message) return null;
  return (
    <div className={`data-notice data-notice--${state.origin}`} role="status">
      <span>{state.message}</span>
      {state.origin !== "supabase" && (
        <button className="text-button" type="button" onClick={onRetry}>
          Tentar atualizar
        </button>
      )}
    </div>
  );
}
