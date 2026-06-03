"use client";

import { useState } from "react";

type Empresa = { id: number; cnpj: string; razaoSocial: string };

type Origem = {
  tipo: "presidente" | "titular_fk" | "suplente_fk" | "titular_texto" | "suplente_texto";
  sindicato: { id: number; nome: string } | null;
  conselho: { id: number; nome: string; tipo: string } | null;
  empresasPorSindicato: Empresa[];
  empresasPorConselho: Empresa[];
  aviso?: string;
};

type Resultado = {
  pessoa: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  origens: Origem[];
};

const TIPO_CONFIG: Record<string, { label: string; cor: string }> = {
  presidente:    { label: "Presidente de Sindicato", cor: "bg-blue-100 text-blue-700 border border-blue-200" },
  titular_fk:    { label: "Titular de Conselho/Comitê", cor: "bg-green-100 text-green-700 border border-green-200" },
  suplente_fk:   { label: "Suplente de Conselho/Comitê", cor: "bg-teal-100 text-teal-700 border border-teal-200" },
  titular_texto: { label: "Titular (texto livre)", cor: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
  suplente_texto:{ label: "Suplente (texto livre)", cor: "bg-orange-100 text-orange-700 border border-orange-200" },
};

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function ListaEmpresas({ empresas, rotulo }: { empresas: Empresa[]; rotulo: string }) {
  if (!empresas.length) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-gray-500 mb-1">{rotulo}</p>
      <ul className="space-y-0.5">
        {empresas.map((e) => (
          <li key={e.id} className="text-xs text-gray-700 flex gap-2">
            <span className="font-mono text-gray-400">{formatarCNPJ(e.cnpj)}</span>
            <span>{e.razaoSocial}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CartaoOrigem({ origem }: { origem: Origem }) {
  const config = TIPO_CONFIG[origem.tipo] ?? { label: origem.tipo, cor: "bg-gray-100 text-gray-600" };
  const temEmpresas = origem.empresasPorSindicato.length > 0 || origem.empresasPorConselho.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.cor}`}>
          {config.label}
        </span>
        {origem.sindicato && (
          <span className="text-xs text-gray-600">
            Sindicato: <strong>{origem.sindicato.nome}</strong>
          </span>
        )}
        {origem.conselho && (
          <span className="text-xs text-gray-600">
            {origem.conselho.tipo === "comite" ? "Comitê" : "Conselho"}:{" "}
            <strong>{origem.conselho.nome}</strong>
          </span>
        )}
      </div>

      {origem.aviso && (
        <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
          <span className="text-yellow-600 text-xs mt-0.5">⚠</span>
          <p className="text-xs text-yellow-700">{origem.aviso}</p>
        </div>
      )}

      {temEmpresas ? (
        <>
          <ListaEmpresas
            empresas={origem.empresasPorSindicato}
            rotulo="Empresas vinculadas via sindicato:"
          />
          <ListaEmpresas
            empresas={origem.empresasPorConselho}
            rotulo="Empresas vinculadas via conselho/comitê:"
          />
        </>
      ) : (
        <p className="text-xs text-gray-400 italic">Nenhuma empresa vinculada neste contexto.</p>
      )}
    </div>
  );
}

function CartaoResultado({ resultado }: { resultado: Resultado }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{resultado.pessoa}</h3>
          <div className="flex flex-wrap gap-3 mt-0.5">
            {resultado.cargo && (
              <span className="text-xs text-gray-500">{resultado.cargo}</span>
            )}
            {resultado.email && (
              <span className="text-xs text-gray-500">{resultado.email}</span>
            )}
            {resultado.telefone && (
              <span className="text-xs text-gray-500">{resultado.telefone}</span>
            )}
          </div>
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {resultado.origens.length} vínculo{resultado.origens.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {resultado.origens.map((origem, idx) => (
          <CartaoOrigem key={idx} origem={origem} />
        ))}
      </div>
    </div>
  );
}

export default function ConsultaVinculos() {
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const termo = busca.trim();
    if (termo.length < 2) {
      setErro("Informe ao menos 2 caracteres para buscar.");
      return;
    }

    setCarregando(true);
    setErro(null);
    setResultados(null);

    try {
      const res = await fetch(`/api/vinculos?busca=${encodeURIComponent(termo)}`);
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? "Erro ao consultar vínculos.");
        return;
      }

      setResultados(data.resultados);
      setTotal(data.total);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Consulta de Vínculos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pesquise uma pessoa pelo nome e veja onde ela aparece: presidências de sindicato,
          titularidades/suplências em conselhos e comitês, e as empresas vinculadas indiretamente.
        </p>
      </div>

      <form onSubmit={buscar} className="mb-6 flex gap-3">
        <input
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setErro(null); }}
          placeholder="Nome da pessoa (mín. 2 caracteres)"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={carregando}
          className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50"
        >
          {carregando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {resultados !== null && !carregando && (
        <>
          {resultados.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-sm text-gray-500">
                Nenhum vínculo encontrado para <strong>"{busca}"</strong>.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Verifique se o nome está cadastrado como presidente de sindicato ou como titular/suplente de conselho.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                {total} pessoa{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""} para <strong>"{busca}"</strong>
              </p>
              <div className="space-y-4">
                {resultados.map((r, idx) => (
                  <CartaoResultado key={idx} resultado={r} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
