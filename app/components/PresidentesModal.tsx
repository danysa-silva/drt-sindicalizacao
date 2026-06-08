"use client";

import { useState, useEffect, useCallback } from "react";
import { useUsuario } from "./UserContext";

type Presidente = {
  id: number;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  dataInicio: string | null;
  dataFim: string | null;
};

type Props = { sindicatoId: number; onFechar: () => void };

const VAZIO = { nome: "", cargo: "", email: "", telefone: "", dataInicio: "", dataFim: "" };

export default function PresidentesModal({ sindicatoId, onFechar }: Props) {
  const usuario = useUsuario();
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "editor";
  const podeExcluir = usuario?.perfil === "admin";
  const [presidentes, setPresidentes] = useState<Presidente[]>([]);
  const [form, setForm] = useState(VAZIO);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/sindicatos/${sindicatoId}/presidentes`);
    setPresidentes(await res.json());
  }, [sindicatoId]);

  useEffect(() => { carregar(); }, [carregar]);

  function editarPresidente(p: Presidente) {
    setEditandoId(p.id);
    setForm({
      nome: p.nome,
      cargo: p.cargo ?? "",
      email: p.email ?? "",
      telefone: p.telefone ?? "",
      dataInicio: p.dataInicio ? new Date(p.dataInicio).toISOString().split("T")[0] : "",
      dataFim: p.dataFim ? new Date(p.dataFim).toISOString().split("T")[0] : "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const url = editandoId
      ? `/api/sindicatos/${sindicatoId}/presidentes/${editandoId}`
      : `/api/sindicatos/${sindicatoId}/presidentes`;
    const method = editandoId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm(VAZIO);
      setEditandoId(null);
      carregar();
    } else {
      const data = await res.json();
      setErro(data.error ?? "Erro ao salvar");
    }
    setSalvando(false);
  }

  async function excluir(id: number) {
    await fetch(`/api/sindicatos/${sindicatoId}/presidentes/${id}`, { method: "DELETE" });
    carregar();
  }

  const inp = "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Lista */}
      {presidentes.length > 0 ? (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {presidentes.map((p) => (
            <div key={p.id} className="flex items-start justify-between px-4 py-3">
              <div>
                <p className="font-medium text-sm text-gray-900">{p.nome}</p>
                {p.cargo && <p className="text-xs text-gray-500">{p.cargo}</p>}
                <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                  {p.email && <span>{p.email}</span>}
                  {p.telefone && <span>{p.telefone}</span>}
                </div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                {podeEditar && (
                  <button onClick={() => editarPresidente(p)} className="text-blue-600 hover:underline text-xs">Editar</button>
                )}
                {podeExcluir && (
                  <button onClick={() => excluir(p.id)} className="text-red-500 hover:underline text-xs">Excluir</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Nenhum presidente cadastrado.</p>
      )}

      {/* Formulário — apenas para admin e editor */}
      {podeEditar && <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {editandoId ? "Editar Presidente" : "Adicionar Presidente"}
        </h3>
        {erro && <div className="mb-3 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{erro}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required placeholder="Nome completo" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
              <input value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Presidente" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
              <input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(92) 99999-9999" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Início do mandato</label>
              <input type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fim do mandato</label>
              <input type="date" value={form.dataFim} onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))} className={inp} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editandoId && (
              <button type="button" onClick={() => { setEditandoId(null); setForm(VAZIO); }} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
            )}
            <button type="submit" disabled={salvando} className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {salvando ? "Salvando..." : editandoId ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>}

      <div className="flex justify-end">
        <button onClick={onFechar} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Fechar</button>
      </div>
    </div>
  );
}
