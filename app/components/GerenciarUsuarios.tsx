"use client";

import { useState, useEffect, useCallback } from "react";
import { useUsuario } from "./UserContext";

type UsuarioItem = { id: number; email: string; nome: string; perfil: string; createdAt: string };

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

  async function alterarPerfil(id: number, perfil: string) {
    setSalvando(id);
    await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfil }),
    });
    await carregar();
    setSalvando(null);
  }

  if (eu?.perfil !== "admin") {
    return <main className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-400">Acesso restrito a administradores.</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Gerenciar Usuários</h2>
        <span className="text-xs text-gray-400">{usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {carregando ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Cadastro</th>
                <th className="px-4 py-3 text-left">Perfil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.nome}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    {u.id === eu.id ? (
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 capitalize">
                        {u.perfil} (você)
                      </span>
                    ) : (
                      <select
                        value={u.perfil}
                        disabled={salvando === u.id}
                        onChange={(e) => alterarPerfil(u.id, e.target.value)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      >
                        <option value="visualizador">Visualizador</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
