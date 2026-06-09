"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import VinculosRepresentanteModal from "./VinculosRepresentanteModal";
import { useUsuario } from "./UserContext";

type Representante = {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  _count: { sindicatos: number; conselhos: number };
};

const FORM_VAZIO = { nome: "", cpf: "", email: "", telefone: "", observacoes: "" };

function formatarCPF(cpf: string) {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export default function ListaRepresentantes() {
  const usuario = useUsuario();
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "editor";
  const podeExcluir = usuario?.perfil === "admin";

  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [filtro, setFiltro] = useState("");
  const [modal, setModal] = useState<"novo" | "editar" | "excluir" | "vinculos" | null>(null);
  const [selecionado, setSelecionado] = useState<Representante | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/representantes");
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setRepresentantes(Array.isArray(data) ? data : []);
    } catch {
      setRepresentantes([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setSelecionado(null);
    setErro("");
    setModal("novo");
  }

  function abrirEditar(r: Representante) {
    setForm({
      nome: r.nome,
      cpf: r.cpf ?? "",
      email: r.email ?? "",
      telefone: r.telefone ?? "",
      observacoes: r.observacoes ?? "",
    });
    setSelecionado(r);
    setErro("");
    setModal("editar");
  }

  function abrirExcluir(r: Representante) {
    setSelecionado(r);
    setModal("excluir");
  }

  function abrirVinculos(r: Representante) {
    setSelecionado(r);
    setModal("vinculos");
  }

  function fecharModal() {
    setModal(null);
    setSelecionado(null);
    setForm(FORM_VAZIO);
    setErro("");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const url = selecionado ? `/api/representantes/${selecionado.id}` : "/api/representantes";
    const method = selecionado ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome,
        cpf: form.cpf || null,
        email: form.email || null,
        telefone: form.telefone || null,
        observacoes: form.observacoes || null,
      }),
    });

    let data: { error?: string } = {};
    try {
      const text = await res.text();
      if (text) data = JSON.parse(text);
    } catch { /* empty body */ }
    if (!res.ok) {
      setErro(data.error ?? "Erro ao salvar.");
    } else {
      fecharModal();
      await carregar();
    }
    setSalvando(false);
  }

  async function confirmarExcluir() {
    if (!selecionado) return;
    await fetch(`/api/representantes/${selecionado.id}`, { method: "DELETE" });
    fecharModal();
    await carregar();
  }

  const filtrados = representantes.filter((r) =>
    !filtro || r.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Cabeçalho e ações */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por nome..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {podeEditar && (
          <button
            onClick={abrirNovo}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
          >
            + Novo Representante
          </button>
        )}
      </div>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total", valor: representantes.length, cor: "text-gray-800" },
          { label: "Com sindicato", valor: representantes.filter((r) => r._count.sindicatos > 0).length, cor: "text-blue-700" },
          { label: "Com conselho", valor: representantes.filter((r) => r._count.conselhos > 0).length, cor: "text-green-700" },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="rounded-lg bg-white border border-gray-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {carregando ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Nenhum representante encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">CPF</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-center">Sindicatos</th>
                  <th className="px-4 py-3 text-center">Conselhos</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nome}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {r.cpf ? formatarCPF(r.cpf) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {r.email && <div>{r.email}</div>}
                      {r.telefone && <div className="text-gray-400">{r.telefone}</div>}
                      {!r.email && !r.telefone && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r._count.sindicatos > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                        {r._count.sindicatos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r._count.conselhos > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {r._count.conselhos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => abrirVinculos(r)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Vínculos
                      </button>
                      {podeEditar && (
                        <button onClick={() => abrirEditar(r)} className="text-blue-600 hover:underline text-xs">Editar</button>
                      )}
                      {podeExcluir && (
                        <button onClick={() => abrirExcluir(r)} className="text-red-500 hover:underline text-xs">Excluir</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {filtrados.length} representante{filtrados.length !== 1 ? "s" : ""} exibido{filtrados.length !== 1 ? "s" : ""}
      </p>

      {/* Modal: Cadastro / Edição */}
      {(modal === "novo" || modal === "editar") && (
        <Modal titulo={modal === "editar" ? "Editar Representante" : "Novo Representante"} onFechar={fecharModal}>
          <form onSubmit={salvar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="(92) 90000-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Informações adicionais..."
              />
            </div>

            {erro && (
              <p className="text-sm text-red-600 rounded-md bg-red-50 border border-red-200 px-3 py-2">{erro}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Confirmar Exclusão */}
      {modal === "excluir" && selecionado && (
        <Modal titulo="Confirmar Exclusão" onFechar={fecharModal}>
          <p className="text-sm text-gray-600 mb-2">
            Deseja excluir <strong>{selecionado.nome}</strong>?
          </p>
          {(selecionado._count.sindicatos > 0 || selecionado._count.conselhos > 0) && (
            <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-3 py-2 mb-4">
              Este representante possui {selecionado._count.sindicatos} vínculo(s) com sindicatos e{" "}
              {selecionado._count.conselhos} vínculo(s) com conselhos. Todos serão removidos.
            </p>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={confirmarExcluir} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Excluir</button>
          </div>
        </Modal>
      )}

      {/* Modal: Gerenciar Vínculos */}
      {modal === "vinculos" && selecionado && (
        <VinculosRepresentanteModal
          representanteId={selecionado.id}
          representanteNome={selecionado.nome}
          onFechar={() => { fecharModal(); carregar(); }}
        />
      )}
    </main>
  );
}
