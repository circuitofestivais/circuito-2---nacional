import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AdminForm } from "../components/AdminForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Header } from "../components/Header";
import { config, isE2EMode } from "../lib/config";
import { E2EFestivalRepository } from "../lib/e2eRepository";
import { normalize } from "../lib/search";
import { SupabaseFestivalRepository, type FestivalRepository } from "../lib/repository";
import { FIELD_KEYS, type AdminFestival, type CatalogPayload, type FestivalFields, type FestivalRecord } from "../types";

type Phase = "checking" | "unconfigured" | "signed-out" | "denied" | "ready" | "error";

function makeRepository(): FestivalRepository {
  if (isE2EMode) return new E2EFestivalRepository();
  return new SupabaseFestivalRepository();
}

function emptyRecord(records: AdminFestival[]): FestivalRecord {
  const maxNumber = Math.max(0, ...records.map((record) => Number(record.fields.sourceNumber) || 0));
  const values = Object.fromEntries(FIELD_KEYS.map((key) => [key, null])) as FestivalFields;
  values.sourceNumber = maxNumber + 1;
  return {
    id: `festival-${crypto.randomUUID()}`,
    sourceRow: null,
    sourceCells: {},
    fields: values,
    notes: {},
    sourceFormatting: { s: { fillType: null, fillColor: null } },
    sourceFlags: { sMarked: false },
  };
}

function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Não foi possível concluir a operação.";
}

function githubAccountLabel(session: Session | null) {
  const metadata = session?.user.user_metadata;
  const username = metadata?.user_name ?? metadata?.preferred_username;
  return typeof username === "string" && username.trim()
    ? `@${username.trim()}`
    : "conta GitHub autenticada";
}

export function AdminPage({ catalog }: { catalog: CatalogPayload }) {
  const repository = useMemo(makeRepository, []);
  const [phase, setPhase] = useState<Phase>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [records, setRecords] = useState<AdminFestival[]>([]);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<FestivalRecord | null>(null);
  const [archiving, setArchiving] = useState<AdminFestival | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadRecords() {
    const next = await repository.list();
    setRecords(next);
  }

  async function checkAccess() {
    setPhase("checking");
    setError(null);
    if (!repository.isConfigured()) {
      setPhase("unconfigured");
      return;
    }
    try {
      const activeSession = await repository.getSession();
      setSession(activeSession);
      if (!activeSession) {
        setPhase("signed-out");
        return;
      }
      if (!(await repository.isAdmin())) {
        setPhase("denied");
        return;
      }
      const callbackUrl = new URL(window.location.href);
      if (callbackUrl.searchParams.get("oauth") === "github") {
        callbackUrl.searchParams.delete("oauth");
        callbackUrl.hash = "admin";
        window.history.replaceState({}, "", callbackUrl);
      }
      if (isE2EMode) await repository.seed(catalog.records);
      await loadRecords();
      setPhase("ready");
    } catch (caught) {
      setError(friendlyError(caught));
      setPhase("error");
    }
  }

  useEffect(() => { void checkAccess(); }, []);

  const visible = useMemo(() => {
    const needle = normalize(query);
    return records
      .filter((record) => Boolean(record.deletedAt) === showArchived)
      .filter((record) => !needle || normalize(`${record.fields.sourceNumber} ${record.fields.name} ${record.fields.state} ${record.fields.municipality}`).includes(needle))
      .sort((a, b) => Number(a.fields.sourceNumber) - Number(b.fields.sourceNumber));
  }, [records, query, showArchived]);
  const activeCount = records.filter((record) => !record.deletedAt).length;
  const archivedCount = records.length - activeCount;

  async function requestGitHubAccess() {
    setBusy(true);
    setError(null);
    try {
      await repository.signInWithGitHub();
    } catch (caught) {
      setError(friendlyError(caught));
      setBusy(false);
    }
  }

  async function save(record: FestivalRecord) {
    setError(null);
    const wasNew = !records.some((item) => item.id === record.id);
    try {
      await repository.save(record);
      await loadRecords();
      setEditing(null);
      setMessage(wasNew ? "Festival adicionado com sucesso." : "Festival atualizado com sucesso.");
    } catch (caught) {
      setError(friendlyError(caught));
      throw caught;
    }
  }

  async function archive() {
    if (!archiving) return;
    setBusy(true);
    try {
      await repository.archive(archiving.id);
      await loadRecords();
      setMessage("Festival movido para a lixeira. Ele pode ser recuperado.");
      setArchiving(null);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function restore(record: AdminFestival) {
    setBusy(true);
    try {
      await repository.restore(record.id);
      await loadRecords();
      setMessage("Festival restaurado e novamente visível na consulta pública.");
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    try {
      await repository.seed(catalog.records);
      await loadRecords();
      setMessage(`${catalog.records.length} festivais importados para a base online.`);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await repository.signOut();
    setSession(null);
    setRecords([]);
    setPhase("signed-out");
  }

  return (
    <>
      <a className="skip-link" href="#admin-content">Pular para a administração</a>
      <Header admin count={phase === "ready" ? activeCount : undefined} />
      <main className="admin-page" id="admin-content">
        <section className="admin-intro">
          <p className="section-kicker">Área restrita</p>
          <h1>Administração da base</h1>
          <p>Edite os mesmos 19 campos da planilha. Alterações publicadas ficam disponíveis para a consulta, sem expor credenciais no site.</p>
        </section>

        {error && <div className="feedback feedback--error" role="alert">{error}<button type="button" onClick={() => setError(null)}>Fechar</button></div>}
        {message && <div className="feedback feedback--success" role="status">{message}<button type="button" onClick={() => setMessage(null)}>Fechar</button></div>}

        {phase === "checking" && <div className="loading-state" role="status"><span className="spinner" />Verificando acesso…</div>}

        {phase === "unconfigured" && (
          <section className="admin-gate">
            <span className="gate-number">01</span>
            <h2>Administração ainda não conectada</h2>
            <p>A consulta pública está completa e operacional. Para habilitar gravação segura, configure o projeto Supabase seguindo o README e preencha somente a URL e a chave pública em <code>public/config.json</code>.</p>
            <p className="gate-note">Nenhum token pessoal, senha ou chave privada deve ser colocado no repositório.</p>
            <a className="button" href="https://github.com/circuitofestivais/circuito-2---nacional#configuração-da-administração" target="_blank" rel="noreferrer">Abrir instruções</a>
          </section>
        )}

        {phase === "signed-out" && (
          <section className="admin-gate">
            <span className="gate-number">02</span>
            <h2>Entrar com a conta proprietária do GitHub</h2>
            <p>Somente a identidade GitHub permanente da conta <strong>@circuitofestivais</strong> pode ler a lixeira ou alterar a base. Outras contas autenticadas recebem acesso negado.</p>
            <button className="button" type="button" onClick={() => void requestGitHubAccess()} disabled={busy}>{busy ? "Abrindo GitHub…" : "Entrar com GitHub"}</button>
          </section>
        )}

        {phase === "denied" && (
          <section className="admin-gate">
            <span className="gate-number">403</span>
            <h2>Conta sem permissão</h2>
            <p>A conta <strong>{githubAccountLabel(session)}</strong> foi autenticada, mas não corresponde à identidade proprietária autorizada.</p>
            <button className="button button--quiet" type="button" onClick={() => void signOut()}>Sair e usar outra conta</button>
          </section>
        )}

        {phase === "error" && (
          <section className="admin-gate"><h2>Não foi possível verificar o acesso</h2><button className="button" type="button" onClick={() => void checkAccess()}>Tentar novamente</button></section>
        )}

        {phase === "ready" && (
          <section className="admin-workspace">
            <div className="admin-toolbar">
              <div>
                <p>Conectado como <strong>{githubAccountLabel(session)}</strong></p>
                <button className="text-button" type="button" onClick={() => void signOut()}>Sair</button>
              </div>
              <button className="button" type="button" onClick={() => setEditing(emptyRecord(records))}>+ Adicionar festival</button>
            </div>

            {records.length === 0 ? (
              <div className="empty-state admin-empty">
                <h2>A base online está vazia</h2>
                <p>Importe a cópia verificada de {catalog.records.length} registros. O processo não remove dados existentes.</p>
                <button className="button" type="button" onClick={() => void seed()} disabled={busy}>{busy ? "Importando…" : "Importar planilha verificada"}</button>
              </div>
            ) : (
              <>
                <div className="admin-list-tools">
                  <div className="admin-tabs" role="tablist" aria-label="Estado dos registros">
                    <button role="tab" aria-selected={!showArchived} onClick={() => setShowArchived(false)}>Ativos <span>{activeCount}</span></button>
                    <button role="tab" aria-selected={showArchived} onClick={() => setShowArchived(true)}>Lixeira <span>{archivedCount}</span></button>
                  </div>
                  <label className="admin-search"><span className="sr-only">Buscar na administração</span><input type="search" placeholder="Buscar nome, número, UF ou município" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>N°</th><th>Festival</th><th>UF</th><th>Município</th><th>Edição</th><th><span className="sr-only">Ações</span></th></tr></thead>
                    <tbody>
                      {visible.map((record) => (
                        <tr key={record.id} data-admin-id={record.id}>
                          <td>{String(record.fields.sourceNumber)}</td>
                          <th scope="row">{String(record.fields.name)}</th>
                          <td>{String(record.fields.state ?? "—")}</td>
                          <td>{String(record.fields.municipality ?? "—")}</td>
                          <td>{String(record.fields.edition ?? "—")}</td>
                          <td className="admin-row-actions">
                            {!showArchived ? (
                              <><button className="text-button" type="button" onClick={() => setEditing(record)}>Editar</button><button className="text-button text-button--danger" type="button" onClick={() => setArchiving(record)}>Arquivar</button></>
                            ) : (
                              <button className="text-button" type="button" onClick={() => void restore(record)} disabled={busy}>Restaurar</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visible.length === 0 && <div className="table-empty">Nenhum registro nesta visualização.</div>}
                </div>
              </>
            )}
          </section>
        )}
      </main>
      <AdminForm record={editing} meta={catalog.meta} existing={records} onSave={save} onCancel={() => setEditing(null)} />
      <ConfirmDialog open={Boolean(archiving)} title="Mover festival para a lixeira?" description={archiving ? `${String(archiving.fields.name)} deixará de aparecer na consulta pública, mas poderá ser restaurado.` : ""} confirmLabel="Mover para a lixeira" onConfirm={() => void archive()} onCancel={() => setArchiving(null)} />
      <footer className="site-footer"><span>Administração protegida</span><span>Cache público: {config.cacheTtlMinutes} min</span></footer>
    </>
  );
}
