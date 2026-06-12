"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import SindicatoForm from "./SindicatoForm";
import { useUsuario } from "./UserContext";

type RepresentanteLite = { id: number; nome: string };

type RepresentanteVinculo = {
  id: number;
  representanteId: number;
  papel: string;
  representante: { id: number; nome: string };
};

type EmpresaSimples = {
  id: number;
  cnpj: string;
  razaoSocial: string;
  cnae: string | null;
  perfil: string | null;
  situacaoRFB: string | null;
  afinidade: string | null;
  status: string;
};

type Sindicato = {
  id: number;
  nome: string;
  tipo: string;
  cnpj: string | null;
  afinidadeFieam: string | null;
  validadeMandato: string | null;
  observacoes: string | null;
  representantes: RepresentanteVinculo[];
  _count: { empresas: number };
};

const PAPEIS_SINDICATO = [
  "presidente", "vice-presidente", "secretario", "tesoureiro",
  "diretor", "conselho-fiscal", "suplente", "outro",
];
const LABEL_PAPEL: Record<string, string> = {
  "presidente":      "Presidente",
  "vice-presidente": "Vice-Presidente",
  "secretario":      "Secretário",
  "tesoureiro":      "Tesoureiro",
  "diretor":         "Diretor",
  "conselho-fiscal": "Conselho Fiscal",
  "suplente":        "Suplente",
  "outro":           "Outro",
};

function badgeTipo(tipo: string) {
  return tipo === "patronal"
    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
    : "bg-orange-100 text-orange-700 border border-orange-200";
}

function badgeSituacaoRFB(s: string | null) {
  if (!s) return "bg-gray-100 text-gray-500";
  const u = s.toUpperCase();
  if (u === "ATIVA") return "bg-green-100 text-green-700";
  if (u === "SUSPENSA") return "bg-orange-100 text-orange-600";
  if (u === "BAIXADA") return "bg-gray-100 text-gray-500";
  return "bg-red-100 text-red-600";
}

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export default function ListaSindicatos() {
  const usuario = useUsuario();
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "editor";
  const podeExcluir = usuario?.perfil === "admin";

  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const [todosRepresentantes, setTodosRepresentantes] = useState<RepresentanteLite[]>([]);
  const [filtro, setFiltro] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [modal, setModal] = useState<"novo" | "editar" | "excluir" | "membros" | null>(null);
  const [selecionado, setSelecionado] = useState<Sindicato | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Empresas por sindicato (carregadas sob demanda)
  const [empresasCache, setEmpresasCache] = useState<Record<number, EmpresaSimples[]>>({});
  const [carregandoEmpresas, setCarregandoEmpresas] = useState<number | null>(null);
  const [filtroEmpresas, setFiltroEmpresas] = useState<Record<number, string>>({});

  // Membros — estado do modal
  const [addRepId, setAddRepId] = useState("");
  const [addPapel, setAddPapel] = useState("presidente");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [rs, rr] = await Promise.all([
      fetch("/api/sindicatos"),
      fetch("/api/representantes"),
    ]);
    setSindicatos(await rs.json());
    const rrData = await rr.json();
    setTodosRepresentantes(Array.isArray(rrData) ? rrData : []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function fecharModal() { setModal(null); setSelecionado(null); setAddRepId(""); setAddPapel("presidente"); }

  async function confirmarExcluir() {
    if (!selecionado) return;
    await fetch(`/api/sindicatos/${selecionado.id}`, { method: "DELETE" });
    setModal(null);
    carregar();
  }

  async function expandirSindicato(sindicatoId: number) {
    if (expandido === sindicatoId) {
      setExpandido(null);
      return;
    }
    setExpandido(sindicatoId);
    setAddRepId("");
    setAddPapel("presidente");
    if (!empresasCache[sindicatoId]) {
      setCarregandoEmpresas(sindicatoId);
      const res = await fetch(`/api/sindicatos/${sindicatoId}/empresas`);
      const data = await res.json();
      setEmpresasCache((prev) => ({ ...prev, [sindicatoId]: data }));
      setCarregandoEmpresas(null);
    }
  }

  async function adicionarMembro(sindicatoId: number) {
    if (!addRepId) return;
    await fetch(`/api/representantes/${addRepId}/sindicatos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sindicatoId, papel: addPapel }),
    });
    setAddRepId("");
    carregar();
  }

  async function removerMembro(representanteId: number, vinculoId: number) {
    await fetch(`/api/representantes/${representanteId}/sindicatos/${vinculoId}`, { method: "DELETE" });
    carregar();
  }

  function corresponde(nome: string, busca: string): boolean {
    const n = nome.toLowerCase();
    const partes = busca.toLowerCase().split("*").map((p) => p.trim()).filter(Boolean);
    if (partes.length === 0) return true;
    let pos = 0;
    for (const parte of partes) {
      const idx = n.indexOf(parte, pos);
      if (idx === -1) return false;
      pos = idx + parte.length;
    }
    return true;
  }

  const filtrados = sindicatos.filter((s) =>
    !filtro || corresponde(s.nome, filtro) || (s.cnpj?.includes(filtro.replace(/\D/g, "")) ?? false)
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {podeEditar && (
          <button
            onClick={() => setModal("novo")}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
          >
            + Novo Sindicato
          </button>
        )}
      </div>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {[
          { label: "Total", valor: sindicatos.length, cor: "text-gray-800" },
          { label: "Patronais", valor: sindicatos.length, cor: "text-indigo-700" },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="rounded-lg bg-white border border-gray-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Lista acordeão */}
      {carregando ? (
        <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">Nenhum sindicato encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((s) => {
            const aberto = expandido === s.id;
            const empresas = empresasCache[s.id] ?? [];
            const termoEmp = filtroEmpresas[s.id] ?? "";
            const empresasFiltradas = termoEmp
              ? empresas.filter((e) =>
                  e.razaoSocial.toLowerCase().includes(termoEmp.toLowerCase()) ||
                  e.cnpj.includes(termoEmp.replace(/\D/g, ""))
                )
              : empresas;

            return (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Cabeçalho */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => expandirSindicato(s.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-gray-900 text-sm truncate">{s.nome}</span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {s._count.empresas} empresa{s._count.empresas !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelecionado(s); setModal("membros"); }}
                      className="shrink-0 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                    >
                      {s.representantes.length} membro{s.representantes.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {podeEditar && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelecionado(s); setModal("editar"); }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Editar
                      </button>
                    )}
                    {podeExcluir && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelecionado(s); setModal("excluir"); }}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Excluir
                      </button>
                    )}
                    <span className="text-gray-400 text-xs">{aberto ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Empresas expandidas */}
                {aberto && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Empresas Vinculadas
                        {empresas.length > 0 && <span className="ml-1 font-normal text-gray-400">({empresas.length})</span>}
                      </p>
                      {empresas.length > 4 && (
                        <input
                          value={termoEmp}
                          onChange={(e) => setFiltroEmpresas((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          placeholder="Filtrar..."
                          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>

                    {carregandoEmpresas === s.id ? (
                      <p className="text-xs text-gray-400 py-4 text-center">Carregando...</p>
                    ) : empresas.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhuma empresa vinculada a este sindicato.</p>
                    ) : empresasFiltradas.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhuma empresa encontrada para "{termoEmp}".</p>
                    ) : (
                      <>
                        {/* Cards — mobile */}
                        <div className="sm:hidden space-y-2">
                          {empresasFiltradas.map((e) => (
                            <div key={e.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                              <p className="font-medium text-gray-900 text-sm">{e.razaoSocial}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                                <span className="font-mono">{formatarCNPJ(e.cnpj)}</span>
                                {e.situacaoRFB && (
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeSituacaoRFB(e.situacaoRFB)}`}>
                                    {e.situacaoRFB}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Tabela — desktop */}
                        <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-100">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                              <tr>
                                <th className="px-3 py-2 text-left">Razão Social</th>
                                <th className="px-3 py-2 text-left">CNPJ</th>
                                <th className="px-3 py-2 text-left">CNAE</th>
                                <th className="px-3 py-2 text-left">Sit. RFB</th>
                                <th className="px-3 py-2 text-left">Perfil</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {empresasFiltradas.map((e) => (
                                <tr key={e.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-medium text-gray-900 text-sm">{e.razaoSocial}</td>
                                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{formatarCNPJ(e.cnpj)}</td>
                                  <td className="px-3 py-2 text-xs text-gray-500">{e.cnae || "—"}</td>
                                  <td className="px-3 py-2">
                                    {e.situacaoRFB ? (
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeSituacaoRFB(e.situacaoRFB)}`}>
                                        {e.situacaoRFB}
                                      </span>
                                    ) : <span className="text-xs text-gray-400">—</span>}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-500">{e.perfil || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        {filtrados.length} sindicato{filtrados.length !== 1 ? "s" : ""} exibido{filtrados.length !== 1 ? "s" : ""}
      </p>

      {/* Modal: Novo */}
      {modal === "novo" && (
        <Modal titulo="Novo Sindicato" onFechar={fecharModal}>
          <SindicatoForm onSalvar={() => { fecharModal(); carregar(); }} onCancelar={fecharModal} />
        </Modal>
      )}

      {/* Modal: Editar */}
      {modal === "editar" && selecionado && (
        <Modal titulo="Editar Sindicato" onFechar={fecharModal}>
          <SindicatoForm
            inicial={{
              ...selecionado,
              presidenteRepresentanteId: selecionado.representantes.find((r) => r.papel === "presidente")?.representante.id ?? null,
            }}
            onSalvar={() => { fecharModal(); carregar(); }}
            onCancelar={fecharModal}
          />
        </Modal>
      )}

      {/* Modal: Membros */}
      {modal === "membros" && selecionado && (
        <Modal titulo={`Membros — ${selecionado.nome}`} onFechar={fecharModal}>
          <div className="space-y-4">
            {selecionado.representantes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {[...selecionado.representantes]
                  .sort((a, b) => PAPEIS_SINDICATO.indexOf(a.papel) - PAPEIS_SINDICATO.indexOf(b.papel))
                  .map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
                      <span className="font-medium">{r.representante.nome}</span>
                      <span className="text-blue-400 ml-0.5">· {LABEL_PAPEL[r.papel] ?? r.papel}</span>
                      {podeEditar && (
                        <button
                          onClick={() => removerMembro(r.representanteId, r.id)}
                          className="ml-1 text-blue-300 hover:text-red-500 font-bold leading-none"
                          title="Remover"
                        >×</button>
                      )}
                    </span>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Nenhum membro vinculado.</p>
            )}
            {podeEditar && (
              <div className="flex gap-2 pt-1">
                <select
                  value={addRepId}
                  onChange={(e) => setAddRepId(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Adicionar representante...</option>
                  {todosRepresentantes.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
                <select
                  value={addPapel}
                  onChange={(e) => setAddPapel(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {PAPEIS_SINDICATO.map((p) => (
                    <option key={p} value={p}>{LABEL_PAPEL[p]}</option>
                  ))}
                </select>
                <button
                  onClick={() => adicionarMembro(selecionado.id)}
                  disabled={!addRepId}
                  className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-40"
                >
                  Adicionar
                </button>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <button onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Excluir */}
      {modal === "excluir" && selecionado && (
        <Modal titulo="Confirmar Exclusão" onFechar={fecharModal}>
          <p className="text-sm text-gray-600 mb-2">
            Deseja excluir o sindicato <strong>{selecionado.nome}</strong>?
          </p>
          {selecionado._count.empresas > 0 && (
            <p className="text-xs text-orange-600 mb-4">
              Atenção: {selecionado._count.empresas} empresa(s) vinculada(s) perderão o vínculo.
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <button onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={confirmarExcluir} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Excluir</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
