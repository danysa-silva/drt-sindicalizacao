"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { useUsuario } from "./UserContext";

type EmpresaLite = { id: number; razaoSocial: string; cnpj: string };
type ConselhoEmpresa = { id: number; empresa: EmpresaLite };

type SindicatoLite = { id: number; nome: string };
type PresidenteLite = { id: number; nome: string; cargo: string | null; sindicato: SindicatoLite };

type RepresentanteConselhoVinculo = {
  id: number;
  representanteId: number;
  papel: string;
  representante: { id: number; nome: string };
};

type MembroLocal = {
  tempId: string;
  representanteId: number;
  papel: string;
  nome: string;
  vinculoId?: number;
};

type Conselho = {
  id: number;
  nome: string;
  tipo: string;
  titular: string | null;
  suplente: string | null;
  titularId: number | null;
  suplenteId: number | null;
  titularRef: PresidenteLite | null;
  suplenteRef: PresidenteLite | null;
  telefone: string | null;
  email: string | null;
  _count: { empresas: number };
  empresas: ConselhoEmpresa[];
  representantes: RepresentanteConselhoVinculo[];
};

type RepresentanteLite = { id: number; nome: string };
type EmpresaAll = { id: number; razaoSocial: string; cnpj: string };

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function badgeTipo(tipo: string) {
  return tipo === "comite"
    ? "bg-purple-100 text-purple-700 border border-purple-200"
    : "bg-teal-100 text-teal-700 border border-teal-200";
}

function labelPapel(papel: string) {
  const mapa: Record<string, string> = {
    titular: "Titular",
    suplente: "Suplente",
    membro: "Membro",
    outro: "Outro",
  };
  return mapa[papel] ?? papel;
}

export default function ListaConselhos() {
  const usuario = useUsuario();
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "editor";
  const podeExcluir = usuario?.perfil === "admin";
  const [conselhos, setConselhos] = useState<Conselho[]>([]);
  const [todasEmpresas, setTodasEmpresas] = useState<EmpresaAll[]>([]);
  const [todosPresidentes, setTodosPresidentes] = useState<PresidenteLite[]>([]);
  const [todosRepresentantes, setTodosRepresentantes] = useState<RepresentanteLite[]>([]);
  const [filtro, setFiltro] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [modal, setModal] = useState<"novo" | "editar" | "excluir" | null>(null);
  const [selecionado, setSelecionado] = useState<Conselho | null>(null);
  const [novoForm, setNovoForm] = useState({ nome: "", tipo: "conselho", telefone: "", email: "" });

  // membros locais do modal (buffer antes de salvar)
  const [localMembros, setLocalMembros] = useState<MembroLocal[]>([]);
  const [addModalRepId, setAddModalRepId] = useState("");
  const [addModalPapel, setAddModalPapel] = useState("titular");

  // membros na linha expandida
  const [addRepId, setAddRepId] = useState<string>("");
  const [addPapelConselho, setAddPapelConselho] = useState<string>("titular");

  const [addEmpresaId, setAddEmpresaId] = useState<string>("");
  const [carregando, setCarregando] = useState(true);

  // modal de cadastro rápido de representante
  const [modalNovoRep, setModalNovoRep] = useState(false);
  const [novoRepForm, setNovoRepForm] = useState({ nome: "", cpf: "", email: "", telefone: "", observacoes: "" });
  const [novoRepErro, setNovoRepErro] = useState("");
  const [novoRepSalvando, setNovoRepSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [rc, re, rs, rr] = await Promise.all([
      fetch("/api/conselhos"),
      fetch("/api/empresas"),
      fetch("/api/presidentes"),
      fetch("/api/representantes"),
    ]);
    setConselhos(await rc.json());
    setTodasEmpresas(await re.json());
    setTodosPresidentes(await rs.json());
    const rrData = await rr.json();
    setTodosRepresentantes(Array.isArray(rrData) ? rrData : []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function fecharModal() {
    setModal(null);
    setSelecionado(null);
    setNovoForm({ nome: "", tipo: "conselho", telefone: "", email: "" });
    setLocalMembros([]);
    setAddModalRepId("");
    setAddModalPapel("titular");
    setErro("");
  }

  function abrirEditar(c: Conselho) {
    setSelecionado(c);
    setNovoForm({ nome: c.nome, tipo: c.tipo, telefone: c.telefone ?? "", email: c.email ?? "" });
    setLocalMembros(
      c.representantes.map((m) => ({
        tempId: String(m.id),
        representanteId: m.representanteId,
        papel: m.papel,
        nome: m.representante.nome,
        vinculoId: m.id,
      }))
    );
    setModal("editar");
  }

  function adicionarMembroLocal() {
    if (!addModalRepId) return;
    const rep = todosRepresentantes.find((r) => String(r.id) === addModalRepId);
    if (!rep) return;
    const existe = localMembros.some((m) => m.representanteId === rep.id && m.papel === addModalPapel);
    if (existe) return;
    setLocalMembros((prev) => [...prev, {
      tempId: `tmp-${Date.now()}`,
      representanteId: rep.id,
      papel: addModalPapel,
      nome: rep.nome,
    }]);
    setAddModalRepId("");
  }

  function removerMembroLocal(tempId: string) {
    setLocalMembros((prev) => prev.filter((m) => m.tempId !== tempId));
  }

  async function salvarConselho(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const url = selecionado ? `/api/conselhos/${selecionado.id}` : "/api/conselhos";
    const method = selecionado ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novoForm.nome,
        tipo: novoForm.tipo,
        telefone: novoForm.telefone || null,
        email: novoForm.email || null,
        titularId: null,
        suplenteId: null,
        titular: null,
        suplente: null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Erro ao salvar");
      setSalvando(false);
      return;
    }

    const conselhoSalvo = await res.json();
    const conselhoId: number = conselhoSalvo.id ?? selecionado?.id;

    if (selecionado) {
      // edição: remover membros excluídos, adicionar novos
      const mantidosIds = new Set(localMembros.filter((m) => m.vinculoId).map((m) => m.vinculoId!));
      for (const original of selecionado.representantes) {
        if (!mantidosIds.has(original.id)) {
          await fetch(`/api/representantes/${original.representanteId}/conselhos/${original.id}`, { method: "DELETE" });
        }
      }
      for (const local of localMembros) {
        if (!local.vinculoId) {
          await fetch(`/api/representantes/${local.representanteId}/conselhos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conselhoId, papel: local.papel }),
          });
        }
      }
    } else {
      // criação: adicionar todos os membros pendentes
      for (const local of localMembros) {
        await fetch(`/api/representantes/${local.representanteId}/conselhos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conselhoId, papel: local.papel }),
        });
      }
    }

    fecharModal();
    carregar();
    setSalvando(false);
  }

  async function excluirConselho() {
    if (!selecionado) return;
    await fetch(`/api/conselhos/${selecionado.id}`, { method: "DELETE" });
    setModal(null);
    carregar();
  }

  async function adicionarEmpresa(conselhoId: number) {
    if (!addEmpresaId) return;
    await fetch(`/api/conselhos/${conselhoId}/empresas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId: Number(addEmpresaId) }),
    });
    setAddEmpresaId("");
    carregar();
  }

  async function removerEmpresa(conselhoId: number, empresaId: number) {
    await fetch(`/api/conselhos/${conselhoId}/empresas/${empresaId}`, { method: "DELETE" });
    carregar();
  }

  async function adicionarMembro(conselhoId: number) {
    if (!addRepId) return;
    await fetch(`/api/representantes/${addRepId}/conselhos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conselhoId, papel: addPapelConselho }),
    });
    setAddRepId("");
    carregar();
  }

  async function removerMembro(representanteId: number, vinculoId: number) {
    await fetch(`/api/representantes/${representanteId}/conselhos/${vinculoId}`, { method: "DELETE" });
    carregar();
  }

  async function salvarNovoRepresentante(e: React.FormEvent) {
    e.preventDefault();
    setNovoRepErro("");
    setNovoRepSalvando(true);
    const res = await fetch("/api/representantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novoRepForm.nome,
        cpf: novoRepForm.cpf || null,
        email: novoRepForm.email || null,
        telefone: novoRepForm.telefone || null,
        observacoes: novoRepForm.observacoes || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setNovoRepErro(data.error ?? "Erro ao salvar.");
      setNovoRepSalvando(false);
      return;
    }
    const novo = await res.json();
    // recarrega lista e pré-seleciona o novo representante
    const rr = await fetch("/api/representantes");
    const lista = await rr.json();
    setTodosRepresentantes(Array.isArray(lista) ? lista : []);
    setAddRepId(String(novo.id));
    setAddModalRepId(String(novo.id));
    setNovoRepForm({ nome: "", cpf: "", email: "", telefone: "", observacoes: "" });
    setModalNovoRep(false);
    setNovoRepSalvando(false);
  }

  const filtrados = conselhos.filter((c) =>
    !filtro || c.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  const inp = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Ações e filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar conselho ou comitê..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {podeEditar && (
          <button
            onClick={() => setModal("novo")}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
          >
            + Novo Conselho / Comitê
          </button>
        )}
      </div>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total", valor: conselhos.length, cor: "text-gray-800" },
          { label: "Conselhos", valor: conselhos.filter((c) => c.tipo === "conselho").length, cor: "text-teal-700" },
          { label: "Comitês", valor: conselhos.filter((c) => c.tipo === "comite").length, cor: "text-purple-700" },
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
        <div className="py-16 text-center text-sm text-gray-400">Nenhum conselho ou comitê encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((c) => {
            const aberto = expandido === c.id;
            const empresasDoConselho = c.empresas.map((ce) => ce.empresa);
            const disponiveis = todasEmpresas.filter((e) => !empresasDoConselho.some((ec) => ec.id === e.id));

            return (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandido(aberto ? null : c.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeTipo(c.tipo)}`}>
                      {c.tipo === "comite" ? "Comitê" : "Conselho"}
                    </span>
                    <span className="font-medium text-gray-900 text-sm truncate">{c.nome}</span>
                    <span className="shrink-0 text-xs text-gray-400">{c._count.empresas} empresa{c._count.empresas !== 1 ? "s" : ""}</span>
                    {c.representantes.length > 0 && (
                      <span className="shrink-0 text-xs text-blue-500">{c.representantes.length} membro{c.representantes.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {podeEditar && (
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Editar
                      </button>
                    )}
                    {podeExcluir && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelecionado(c); setModal("excluir"); }}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Excluir
                      </button>
                    )}
                    <span className="text-gray-400 text-xs">{aberto ? "▲" : "▼"}</span>
                  </div>
                </div>

                {aberto && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                    {/* Membros via RepresentanteConselho */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Membros</p>
                      {c.representantes.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {c.representantes.map((m) => (
                            <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
                              <span className="font-medium">{m.representante.nome}</span>
                              <span className="text-blue-400 ml-0.5">· {labelPapel(m.papel)}</span>
                              {podeEditar && (
                                <button
                                  onClick={() => removerMembro(m.representanteId, m.id)}
                                  className="ml-1 text-blue-300 hover:text-red-500 font-bold leading-none"
                                  title="Remover"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mb-2">Nenhum membro vinculado.</p>
                      )}
                      {podeEditar && (
                        <>
                          <div className="flex gap-2">
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
                              value={addPapelConselho}
                              onChange={(e) => setAddPapelConselho(e.target.value)}
                              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="titular">Titular</option>
                              <option value="suplente">Suplente</option>
                              <option value="membro">Membro</option>
                              <option value="outro">Outro</option>
                            </select>
                            <button
                              onClick={() => adicionarMembro(c.id)}
                              disabled={!addRepId}
                              className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-40"
                            >
                              Adicionar
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Não encontrou?{" "}
                            <button type="button" onClick={() => setModalNovoRep(true)} className="text-blue-500 hover:underline">
                              Cadastrar novo representante
                            </button>
                          </p>
                        </>
                      )}
                    </div>

                    {/* Adicionar empresa */}
                    {podeEditar && (
                      <div className="flex gap-2">
                        <select
                          value={addEmpresaId}
                          onChange={(e) => setAddEmpresaId(e.target.value)}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Adicionar empresa ao {c.tipo}...</option>
                          {disponiveis.map((e) => (
                            <option key={e.id} value={e.id}>{e.razaoSocial}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => adicionarEmpresa(c.id)}
                          disabled={!addEmpresaId}
                          className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-40"
                        >
                          Adicionar
                        </button>
                      </div>
                    )}

                    {/* Lista de empresas */}
                    {empresasDoConselho.length === 0 ? (
                      <p className="text-xs text-gray-400">Nenhuma empresa neste {c.tipo}.</p>
                    ) : (
                      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                        {empresasDoConselho.map((emp) => (
                          <div key={emp.id} className="flex items-center justify-between px-3 py-2">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{emp.razaoSocial}</span>
                              <span className="ml-2 font-mono text-xs text-gray-400">{formatarCNPJ(emp.cnpj)}</span>
                            </div>
                            {podeEditar && (
                              <button
                                onClick={() => removerEmpresa(c.id, emp.id)}
                                className="text-red-500 hover:underline text-xs"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        {filtrados.length} item{filtrados.length !== 1 ? "s" : ""} exibido{filtrados.length !== 1 ? "s" : ""}
      </p>

      {/* Modal: Novo / Editar */}
      {(modal === "novo" || modal === "editar") && (
        <Modal titulo={selecionado ? "Editar Conselho/Comitê" : "Novo Conselho/Comitê"} onFechar={fecharModal}>
          <form onSubmit={salvarConselho} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {erro && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                value={novoForm.nome}
                onChange={(e) => setNovoForm((f) => ({ ...f, nome: e.target.value }))}
                required
                placeholder="Nome do conselho ou comitê"
                className={inp}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={novoForm.tipo} onChange={(e) => setNovoForm((f) => ({ ...f, tipo: e.target.value }))} required className={inp}>
                <option value="conselho">Conselho</option>
                <option value="comite">Comitê</option>
              </select>
            </div>

            {/* Membros via Representantes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titulares, Suplentes e Membros</label>

              {localMembros.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {localMembros.map((m) => (
                    <span key={m.tempId} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
                      <span className="font-medium">{m.nome}</span>
                      <span className="text-blue-400 ml-0.5">· {labelPapel(m.papel)}</span>
                      <button
                        type="button"
                        onClick={() => removerMembroLocal(m.tempId)}
                        className="ml-1 text-blue-300 hover:text-red-500 font-bold leading-none"
                        title="Remover"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {localMembros.length === 0 && (
                <p className="text-xs text-gray-400 mb-2">Nenhum membro adicionado ainda.</p>
              )}

              <div className="flex gap-2">
                <select
                  value={addModalRepId}
                  onChange={(e) => setAddModalRepId(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecionar representante...</option>
                  {todosRepresentantes.map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
                <select
                  value={addModalPapel}
                  onChange={(e) => setAddModalPapel(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="titular">Titular</option>
                  <option value="suplente">Suplente</option>
                  <option value="membro">Membro</option>
                  <option value="outro">Outro</option>
                </select>
                <button
                  type="button"
                  onClick={adicionarMembroLocal}
                  disabled={!addModalRepId}
                  className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-40"
                >
                  + Adicionar
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Não encontrou?{" "}
                <button type="button" onClick={() => setModalNovoRep(true)} className="text-blue-500 hover:underline">
                  Cadastrar novo representante
                </button>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  value={novoForm.telefone}
                  onChange={(e) => setNovoForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="(92) 99999-9999"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={novoForm.email}
                  onChange={(e) => setNovoForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contato@exemplo.com"
                  className={inp}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {salvando ? "Salvando..." : selecionado ? "Salvar Alterações" : "Criar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Excluir */}
      {modal === "excluir" && selecionado && (
        <Modal titulo="Confirmar Exclusão" onFechar={fecharModal}>
          <p className="text-sm text-gray-600 mb-6">
            Deseja excluir <strong>{selecionado.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={excluirConselho} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Excluir</button>
          </div>
        </Modal>
      )}

      {/* Modal: Cadastro rápido de representante */}
      {modalNovoRep && (
        <Modal titulo="Novo Representante" onFechar={() => { setModalNovoRep(false); setNovoRepErro(""); setNovoRepForm({ nome: "", cpf: "", email: "", telefone: "", observacoes: "" }); }}>
          <form onSubmit={salvarNovoRepresentante} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                value={novoRepForm.nome}
                onChange={(e) => setNovoRepForm({ ...novoRepForm, nome: e.target.value })}
                required
                placeholder="Nome completo"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <input
                  value={novoRepForm.cpf}
                  onChange={(e) => setNovoRepForm({ ...novoRepForm, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={novoRepForm.email}
                  onChange={(e) => setNovoRepForm({ ...novoRepForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  value={novoRepForm.telefone}
                  onChange={(e) => setNovoRepForm({ ...novoRepForm, telefone: e.target.value })}
                  placeholder="(92) 90000-0000"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={novoRepForm.observacoes}
                onChange={(e) => setNovoRepForm({ ...novoRepForm, observacoes: e.target.value })}
                rows={2}
                placeholder="Informações adicionais..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {novoRepErro && (
              <p className="text-sm text-red-600 rounded-md bg-red-50 border border-red-200 px-3 py-2">{novoRepErro}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => { setModalNovoRep(false); setNovoRepErro(""); }} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={novoRepSalvando} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                {novoRepSalvando ? "Salvando..." : "Cadastrar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
