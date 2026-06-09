"use client";

import { useState, useEffect, useCallback } from "react";

type Empresa = {
  id: number;
  cnpj: string;
  razaoSocial: string;
  cnae: string | null;
  perfil: string | null;
  situacaoRFB: string | null;
  afinidade: string | null;
  status: string;
};

type Props = { sindicatoId: number; nomeSindicato: string; onFechar: () => void };

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function badgeAfinidade(a: string | null) {
  if (!a) return null;
  const u = a.toUpperCase();
  if (u === "ALTO") return "bg-blue-100 text-blue-700";
  if (u === "MÉDIO" || u === "MEDIO") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-600";
}

export default function EmpresasSindicatoModal({ sindicatoId, nomeSindicato, onFechar }: Props) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [filtro, setFiltro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch(`/api/sindicatos/${sindicatoId}/empresas`);
    setEmpresas(await res.json());
    setCarregando(false);
  }, [sindicatoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = empresas.filter((e) => {
    if (!filtro) return true;
    const f = filtro.toLowerCase();
    return (
      e.razaoSocial.toLowerCase().includes(f) ||
      e.cnpj.includes(filtro.replace(/\D/g, ""))
    );
  });

  return (
    <div className="flex flex-col gap-3" style={{ maxHeight: "75vh" }}>
      {/* Resumo */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{empresas.length}</span> empresa{empresas.length !== 1 ? "s" : ""} vinculada{empresas.length !== 1 ? "s" : ""}
        </span>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por nome ou CNPJ..."
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
        />
      </div>

      {/* Lista */}
      <div className="overflow-y-auto flex-1 rounded-lg border border-gray-200">
        {carregando ? (
          <div className="py-10 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            {empresas.length === 0 ? "Nenhuma empresa vinculada a este sindicato." : "Nenhuma empresa encontrada."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Razão Social</th>
                <th className="px-4 py-2 text-left">CNPJ</th>
                <th className="px-4 py-2 text-left">CNAE</th>
                <th className="px-4 py-2 text-left">Situação RFB</th>
                <th className="px-4 py-2 text-left">Afinidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map((e) => {
                const afBadge = badgeAfinidade(e.afinidade);
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{e.razaoSocial}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500">{formatarCNPJ(e.cnpj)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{e.cnae || "—"}</td>
                    <td className="px-4 py-2 text-xs">
                      {e.situacaoRFB ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.situacaoRFB.toUpperCase() === "ATIVA" ? "bg-green-100 text-green-700" : e.situacaoRFB.toUpperCase() === "SUSPENSA" ? "bg-orange-100 text-orange-600" : e.situacaoRFB.toUpperCase() === "BAIXADA" ? "bg-gray-100 text-gray-500" : "bg-red-100 text-red-600"}`}>
                          {e.situacaoRFB}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {afBadge && e.afinidade ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${afBadge}`}>{e.afinidade}</span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {filtradas.length > 0 && (
        <p className="text-xs text-gray-400">{filtradas.length} empresa{filtradas.length !== 1 ? "s" : ""} exibida{filtradas.length !== 1 ? "s" : ""}</p>
      )}

      <div className="flex justify-end">
        <button onClick={onFechar} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Fechar
        </button>
      </div>
    </div>
  );
}
