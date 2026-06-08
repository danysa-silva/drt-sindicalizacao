"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { useUsuario } from "./UserContext";

type EmpresaLite = { id: number; razaoSocial: string; cnpj: string };
type ConselhoEmpresa = { id: number; empresa: EmpresaLite };

type SindicatoLite = { id: number; nome: string };
type PresidenteLite = { id: number; nome: string; cargo: string | null; sindicato: SindicatoLite };

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
};

type EmpresaAll = { id: number; razaoSocial: string; cnpj: string };

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function badgeTipo(tipo: string) {
  return tipo === "comite"
    ? "bg-purple-100 text-purple-700 border border-purple-200"
    : "bg-teal-100 text-teal-700 border border-teal-200";
}

export default function ListaConselhos() {
  const usuario = useUsuario();
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "editor";
  const podeExcluir = usuario?.perfil === "admin";
  const [conselhos, setConselhos] = useState<Conselho[]>([]);
  const [todasEmpresas, setTodasEmpresas] = useState<EmpresaAll[]>([]);
  const [todosPresidentes, setTodosPresidentes] = useState<PresidenteLite[]>([]);
  const [filtro, setFiltro] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);
  const [modal, setModal] = useState<"novo" | "editar" | "excluir" | null>(null);
  const [selecionado, setSelecionado] = useState<Conselho | null>(null);
  const [novoForm, setNovoForm] = useState({ nome: "", tipo: "conselho", titular: "", suplente: "", titularId: "", suplenteId: "", telefone: "", email: "" });
  const [addEmpresaId, setAddEmpresaId] = useState<string>("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [rc, re, rs] = await Promise.all([
      fetch("/api/conselhos"),
      fetch("/api/empresas"),
      fetch("/api/presidentes"),
    ]);
    setConselhos(await rc.json());
    setTodasEmpresas(await re.json());
    setTodosPresidentes(await rs.json());
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function fecharModal() { setModal(null); setSelecionado(null); setNovoForm({ nome: "", tipo: "conselho", titular: "", suplente: "", titularId: "", suplenteId: "", telefone: "", email: "" }); setErro(""); }

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
        ...novoForm,
        titularId: novoForm.titularId ? Number(novoForm.titularId) : null,
        suplenteId: novoForm.suplenteId ? Number(novoForm.suplenteId) : null,
      }),
    });

    if (res.ok) {
      fecharModal();
      carregar();
    } else {
      const data = await res.json();
      setErro(data.error ?? "Erro ao salvar");
    }
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

  const filtrados = conselhos.filter((c) => {
    return !filtro || c.nome.toLowerCase().includes(filtro.toLowerCase());
  });

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

      {/* Lista de conselhos (acordeão) */}
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
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeTipo(c.tipo)}`}>
                      {c.tipo === "comite" ? "Comitê" : "Conselho"}
                    </span>
                    <span className="font-medium text-gray-900 text-sm">{c.nome}</span>
                    <span className="text-xs text-gray-400">{c._count.empresas} empresa{c._count.empresas !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {podeEditar && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelecionado(c); setNovoForm({ nome: c.nome, tipo: c.tipo, titular: c.titular ?? "", suplente: c.suplente ?? "", titularId: c.titularId ? String(c.titularId) : "", suplenteId: c.suplenteId ? String(c.suplenteId) : "", telefone: c.telefone ?? "", email: c.email ?? "" }); setModal("editar"); }}
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
                  <div className="border-t border-gray-100 px-4 py-4 space-y-3">
                    {/* Dados de contato */}
                    {(c.titularRef || c.suplenteRef || c.titular || c.suplente || c.telefone || c.email) && (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        {(c.titularRef || c.titular) && (
                          <div>
                            <span className="font-medium text-gray-500">Titular:</span>{" "}
                            {c.titularRef ? (
                              <span>
                                <span className="font-medium text-gray-800">{c.titularRef.nome}</span>
                                {c.titularRef.cargo && <span className="text-gray-400"> ({c.titularRef.cargo})</span>}
                                <br />
                                <span className="text-gray-400 text-[10px]">{c.titularRef.sindicato.nome}</span>
                              </span>
                            ) : c.titular}
                          </div>
                        )}
                        {(c.suplenteRef || c.suplente) && (
                          <div>
                            <span className="font-medium text-gray-500">Suplente:</span>{" "}
                            {c.suplenteRef ? (
                              <span>
                                <span className="font-medium text-gray-800">{c.suplenteRef.nome}</span>
                                {c.suplenteRef.cargo && <span className="text-gray-400"> ({c.suplenteRef.cargo})</span>}
                                <br />
                                <span className="text-gray-400 text-[10px]">{c.suplenteRef.sindicato.nome}</span>
                              </span>
                            ) : c.suplente}
                          </div>
                        )}
                        {c.telefone && <div><span className="font-medium text-gray-500">Telefone:</span> {c.telefone}</div>}
                        {c.email && <div><span className="font-medium text-gray-500">E-mail:</span> {c.email}</div>}
                      </div>
                    )}
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
          <form onSubmit={salvarConselho} className="space-y-4">
            {erro && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input value={novoForm.nome} onChange={(e) => setNovoForm((f) => ({ ...f, nome: e.target.value }))} required placeholder="Nome do conselho ou comitê" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={novoForm.tipo} onChange={(e) => setNovoForm((f) => ({ ...f, tipo: e.target.value }))} required className={inp}>
                <option value="conselho">Conselho</option>
                <option value="comite">Comitê</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titular</label>
                <select
                  value={novoForm.titularId}
                  onChange={(e) => {
                    const pres = todosPresidentes.find((p) => String(p.id) === e.target.value);
                    setNovoForm((f) => ({ ...f, titularId: e.target.value, titular: pres?.nome ?? "" }));
                  }}
                  className={inp}
                >
                  <option value="">— Selecionar presidente —</option>
                  {todosPresidentes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}{p.cargo ? ` (${p.cargo})` : ""} — {p.sindicato.nome.slice(0, 40)}
                    </option>
                  ))}
                </select>
                {!novoForm.titularId && (
                  <input
                    value={novoForm.titular}
                    onChange={(e) => setNovoForm((f) => ({ ...f, titular: e.target.value }))}
                    placeholder="Ou digitar nome manualmente"
                    className={`mt-1 ${inp}`}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Suplente</label>
                <select
                  value={novoForm.suplenteId}
                  onChange={(e) => {
                    const pres = todosPresidentes.find((p) => String(p.id) === e.target.value);
                    setNovoForm((f) => ({ ...f, suplenteId: e.target.value, suplente: pres?.nome ?? "" }));
                  }}
                  className={inp}
                >
                  <option value="">— Selecionar presidente —</option>
                  {todosPresidentes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}{p.cargo ? ` (${p.cargo})` : ""} — {p.sindicato.nome.slice(0, 40)}
                    </option>
                  ))}
                </select>
                {!novoForm.suplenteId && (
                  <input
                    value={novoForm.suplente}
                    onChange={(e) => setNovoForm((f) => ({ ...f, suplente: e.target.value }))}
                    placeholder="Ou digitar nome manualmente"
                    className={`mt-1 ${inp}`}
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input value={novoForm.telefone} onChange={(e) => setNovoForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(92) 99999-9999" className={inp} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input type="email" value={novoForm.email} onChange={(e) => setNovoForm((f) => ({ ...f, email: e.target.value }))} placeholder="contato@exemplo.com" className={inp} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
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
    </main>
  );
}
