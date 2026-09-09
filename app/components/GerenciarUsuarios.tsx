"use client";

import { useState, useEffect, useCallback } from "react";
import { useUsuario } from "./UserContext";

type UsuarioItem = { id: number; email: string; nome: string; perfil: string; status: string; createdAt: string };

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const STATUS_CLASSE: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  aprovado: "bg-green-100 text-green-700 border-green-200",
  rejeitado: "bg-red-100 text-red-700 border-red-200",
};

export default function GerenciarUsuarios() {
  const eu = useUsuario();
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsuarios(await res.json());
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function atualizar(id: number, dados: { perfil?: string; status?: string }) {
    setSalvando(id);
    await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    await carregar();
    setSalvando(null);
  }

  if (eu?.perfil !== "admin") {
    return <main className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-400">Acesso restrito a administradores.</main>;
  }

  const pendentes = usuarios.filter((u) => u.status === "pendente");
  const demais = usuarios.filter((u) => u.status !== "pendente");

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Gerenciar Usuários</h2>
        <span className="text-xs text-gray-400">{usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""}</span>
      </div>

      {carregando ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">Carregando...</div>
      ) : (
        <div className="space-y-8">
          {pendentes.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-yellow-700">
                Aguardando aprovação ({pendentes.length})
              </h3>
              <div className="overflow-hidden rounded-xl border border-yellow-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-yellow-50 text-xs font-medium uppercase tracking-wide text-yellow-800">
                    <tr>
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">E-mail</th>
                      <th className="px-4 py-3 text-left">Cadastro</th>
                      <th className="px-4 py-3 text-left">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendentes.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              disabled={salvando === u.id}
                              onClick={() => atualizar(u.id, { status: "aprovado" })}
                              className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Aprovar
                            </button>
                            <button
                              disabled={salvando === u.id}
                              onClick={() => atualizar(u.id, { status: "rejeitado" })}
                              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Todos os usuários</h3>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">E-mail</th>
                    <th className="px-4 py-3 text-left">Cadastro</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Perfil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {demais.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        {u.id === eu.id ? (
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASSE[u.status] ?? ""}`}>
                            {STATUS_LABEL[u.status] ?? u.status}
                          </span>
                        ) : (
                          <select
                            value={u.status}
                            disabled={salvando === u.id}
                            onChange={(e) => atualizar(u.id, { status: e.target.value })}
                            className={`rounded-md border px-2 py-1 text-xs focus:outline-none disabled:opacity-50 ${STATUS_CLASSE[u.status] ?? "border-gray-300"}`}
                          >
                            <option value="aprovado">Aprovado</option>
                            <option value="pendente">Pendente</option>
                            <option value="rejeitado">Rejeitado</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.id === eu.id ? (
                          <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-xs font-medium capitalize text-indigo-700">
                            {u.perfil} (você)
                          </span>
                        ) : (
                          <select
                            value={u.perfil}
                            disabled={salvando === u.id}
                            onChange={(e) => atualizar(u.id, { perfil: e.target.value })}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                          >
                            <option value="visualizador">Visualizador</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
