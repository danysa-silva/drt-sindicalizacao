"use client";

import { useState, useEffect, useCallback } from "react";

type Alteracao = {
  id: number;
  empresaNome: string;
  usuarioNome: string;
  acao: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNovo: string | null;
  createdAt: string;
};

const ACOES: Record<string, { label: string; cor: string }> = {
  criacao: { label: "Inclusão", cor: "bg-green-100 text-green-700 border border-green-200" },
  edicao: { label: "Edição", cor: "bg-blue-100 text-blue-700 border border-blue-200" },
  exclusao: { label: "Exclusão", cor: "bg-red-100 text-red-700 border border-red-200" },
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Manaus", dateStyle: "short", timeStyle: "short" });
}

export default function ListaAlteracoes() {
  const [alteracoes, setAlteracoes] = useState<Alteracao[]>([]);
  const [filtroAcao, setFiltroAcao] = useState("todos");
  const [filtro, setFiltro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const params = filtroAcao !== "todos" ? `?acao=${filtroAcao}` : "";
    const res = await fetch(`/api/alteracoes${params}`);
    setAlteracoes(await res.json());
    setCarregando(false);
  }, [filtroAcao]);

  useEffect(() => { carregar(); }, [carregar]);

  function exportarCSV() {
    const cabecalho = "Data/Hora;Empresa;Usuário;Ação;Campo;Valor Anterior;Valor Novo";
    const linhas = filtradas.map((a) =>
      [
        formatarDataHora(a.createdAt),
        a.empresaNome,
        a.usuarioNome,
        ACOES[a.acao]?.label ?? a.acao,
        a.campo ?? "",
        a.valorAnterior ?? "",
        a.valorNovo ?? "",
      ].map((v) => `"${v}"`).join(";")
    );
    const csv = "﻿" + [cabecalho, ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alteracoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtradas = alteracoes.filter((a) => {
    if (!filtro) return true;
    const t = filtro.toLowerCase();
    return a.empresaNome.toLowerCase().includes(t) || a.usuarioNome.toLowerCase().includes(t);
  });

  const contagem = {
    criacao: alteracoes.filter((a) => a.acao === "criacao").length,
    edicao: alteracoes.filter((a) => a.acao === "edicao").length,
    exclusao: alteracoes.filter((a) => a.acao === "exclusao").length,
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por empresa ou usuário..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={filtroAcao}
            onChange={(e) => setFiltroAcao(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todos os tipos</option>
            <option value="criacao">Inclusões</option>
            <option value="edicao">Edições</option>
            <option value="exclusao">Exclusões</option>
          </select>
        </div>
        <button
          onClick={exportarCSV}
          className="inline-flex items-center gap-1 rounded-lg border border-green-600 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition"
        >
          ⬇ Exportar Excel
        </button>
      </div>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Inclusões", valor: contagem.criacao, cor: "text-green-700" },
          { label: "Edições", valor: contagem.edicao, cor: "text-blue-700" },
          { label: "Exclusões", valor: contagem.exclusao, cor: "text-red-700" },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="rounded-lg bg-white border border-gray-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">{label} (30 dias)</p>
            <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {carregando ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Nenhuma alteração encontrada nos últimos 30 dias.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Data/Hora</th>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Campo</th>
                  <th className="px-4 py-3 text-left">Antes</th>
                  <th className="px-4 py-3 text-left">Depois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatarDataHora(a.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                      <div className="truncate" title={a.empresaNome}>{a.empresaNome}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{a.usuarioNome}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACOES[a.acao]?.cor ?? "bg-gray-100 text-gray-600"}`}>
                        {ACOES[a.acao]?.label ?? a.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{a.campo ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-red-500 max-w-[140px]">
                      <div className="truncate" title={a.valorAnterior ?? ""}>{a.valorAnterior ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-green-600 max-w-[140px]">
                      <div className="truncate" title={a.valorNovo ?? ""}>{a.valorNovo ?? "—"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {filtradas.length} registro{filtradas.length !== 1 ? "s" : ""} — últimos 30 dias
      </p>
    </main>
  );
}
