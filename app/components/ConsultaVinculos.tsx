"use client";

import { useState } from "react";

// ── tipos ─────────────────────────────────────────────────────────────────────

type SindicatoLite = { id: number; nome: string; tipo: string };
type ConselhoLite  = { id: number; nome: string; tipo: string };
type EmpresaLite   = { id: number; razaoSocial: string; cnpj: string };

type ResultadoPessoa = {
  id: number; nome: string;
  sindicatos: { id: number; papel: string; sindicato: SindicatoLite }[];
  conselhos:  { id: number; papel: string; conselho: ConselhoLite }[];
  empresas:   { id: number; tipoRelacao: string; cargoNaEmpresa: string | null; empresa: EmpresaLite }[];
};
type ResultadoSindicato = {
  id: number; nome: string; tipo: string;
  representantes: { id: number; papel: string; representante: { nome: string } }[];
  _count: { empresas: number };
};
type ResultadoConselho = {
  id: number; nome: string; tipo: string;
  representantes: { id: number; papel: string; representante: { nome: string } }[];
  empresas: { id: number; empresa: EmpresaLite }[];
};
type ResultadoEmpresa = {
  id: number; razaoSocial: string; cnpj: string; situacaoRFB: string | null;
  sindicato: SindicatoLite | null;
  representantes: { id: number; tipoRelacao: string; representante: { nome: string } }[];
};

type RespostaTudo = {
  tipo: "tudo"; total: number;
  pessoas: ResultadoPessoa[];
  sindicatos: ResultadoSindicato[];
  conselhos: ResultadoConselho[];
  empresas: ResultadoEmpresa[];
};
type RespostaFiltrada =
  | { tipo: "pessoa";    total: number; resultados: ResultadoPessoa[] }
  | { tipo: "sindicato"; total: number; resultados: ResultadoSindicato[] }
  | { tipo: "conselho";  total: number; resultados: ResultadoConselho[] }
  | { tipo: "empresa";   total: number; resultados: ResultadoEmpresa[] };

type Resposta = RespostaTudo | RespostaFiltrada;

// ── labels ────────────────────────────────────────────────────────────────────

const LABEL_PAPEL_SIND: Record<string, string> = {
  "presidente": "Presidente", "vice-presidente": "Vice-Presidente",
  "secretario": "Secretário", "tesoureiro": "Tesoureiro",
  "diretor": "Diretor", "conselho-fiscal": "Conselho Fiscal",
  "suplente": "Suplente", "outro": "Outro",
};
const LABEL_PAPEL_CONS: Record<string, string> = {
  titular: "Titular", suplente: "Suplente", membro: "Membro", outro: "Outro",
};
const LABEL_RELACAO: Record<string, string> = {
  "dono": "Dono", "socio": "Sócio", "representante-legal": "Representante Legal",
  "diretor": "Diretor", "contato-comercial": "Contato Comercial",
  "rh": "RH", "financeiro": "Financeiro", "outro": "Outro",
};

const TIPOS_BUSCA = [
  { value: "tudo",      label: "Tudo",             placeholder: "Palavra-chave" },
  { value: "pessoa",    label: "Pessoa",            placeholder: "Nome da pessoa" },
  { value: "sindicato", label: "Sindicato",          placeholder: "Nome do sindicato" },
  { value: "conselho",  label: "Conselho / Comitê",  placeholder: "Nome do conselho ou comitê" },
  { value: "empresa",   label: "Empresa",            placeholder: "Razão social ou CNPJ" },
];

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
function badgeTipoSind(tipo: string) {
  return tipo === "patronal"
    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
    : "bg-orange-50 text-orange-700 border border-orange-200";
}
function badgeTipoCons(tipo: string) {
  return tipo === "comite"
    ? "bg-purple-50 text-purple-700 border border-purple-200"
    : "bg-teal-50 text-teal-700 border border-teal-200";
}

// ── cartões ───────────────────────────────────────────────────────────────────

function CartaoPessoa({ r }: { r: ResultadoPessoa }) {
  const total = r.sindicatos.length + r.conselhos.length + r.empresas.length;
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-200 text-gray-600 px-2 py-0.5 text-xs font-medium">Pessoa</span>
          <h3 className="font-semibold text-gray-900 text-sm">{r.nome}</h3>
        </div>
        <span className="text-xs text-gray-400">{total} vínculo{total !== 1 ? "s" : ""}</span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {r.sindicatos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Sindicatos</p>
            <div className="flex flex-wrap gap-1.5">
              {r.sindicatos.map((v) => (
                <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
                  <span className="font-medium">{v.sindicato.nome}</span>
                  <span className="text-blue-400">· {LABEL_PAPEL_SIND[v.papel] ?? v.papel}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {r.conselhos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Conselhos e Comitês</p>
            <div className="flex flex-wrap gap-1.5">
              {r.conselhos.map((v) => (
                <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2.5 py-0.5 text-xs text-green-700">
                  <span className="font-medium">{v.conselho.nome}</span>
                  <span className="text-green-400">· {LABEL_PAPEL_CONS[v.papel] ?? v.papel}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {r.empresas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Empresas</p>
            <div className="flex flex-wrap gap-1.5">
              {r.empresas.map((v) => (
                <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-xs text-orange-700">
                  <span className="font-medium">{v.empresa.razaoSocial}</span>
                  <span className="text-orange-400">· {LABEL_RELACAO[v.tipoRelacao] ?? v.tipoRelacao}</span>
                  {v.cargoNaEmpresa && <span className="text-orange-300">({v.cargoNaEmpresa})</span>}
                </span>
              ))}
            </div>
          </div>
        )}
        {total === 0 && <p className="text-xs text-gray-400 italic">Pessoa cadastrada sem vínculos.</p>}
      </div>
    </div>
  );
}

function CartaoSindicato({ r }: { r: ResultadoSindicato }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="rounded-full bg-gray-200 text-gray-600 px-2 py-0.5 text-xs font-medium">Sindicato</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeTipoSind(r.tipo)}`}>
          {r.tipo === "patronal" ? "Patronal" : "Laboral"}
        </span>
        <h3 className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate">{r.nome}</h3>
        <span className="text-xs text-gray-400 shrink-0">{r._count.empresas} empresa{r._count.empresas !== 1 ? "s" : ""}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Membros</p>
        {r.representantes.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Nenhum membro vinculado.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {r.representantes.map((v) => (
              <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700">
                <span className="font-medium">{v.representante.nome}</span>
                <span className="text-blue-400">· {LABEL_PAPEL_SIND[v.papel] ?? v.papel}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CartaoConselho({ r }: { r: ResultadoConselho }) {
  const empresas = r.empresas.map((e) => e.empresa);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="rounded-full bg-gray-200 text-gray-600 px-2 py-0.5 text-xs font-medium">
          {r.tipo === "comite" ? "Comitê" : "Conselho"}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeTipoCons(r.tipo)}`}>
          {r.tipo === "comite" ? "Comitê" : "Conselho"}
        </span>
        <h3 className="font-semibold text-gray-900 text-sm flex-1 min-w-0 truncate">{r.nome}</h3>
        <span className="text-xs text-gray-400 shrink-0">{empresas.length} empresa{empresas.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Membros</p>
          {r.representantes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhum membro vinculado.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {r.representantes.map((v) => (
                <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2.5 py-0.5 text-xs text-green-700">
                  <span className="font-medium">{v.representante.nome}</span>
                  <span className="text-green-400">· {LABEL_PAPEL_CONS[v.papel] ?? v.papel}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {empresas.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Empresas</p>
            <div className="flex flex-wrap gap-1.5">
              {empresas.map((e) => (
                <span key={e.id} className="rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-700">
                  {e.razaoSocial}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CartaoEmpresa({ r }: { r: ResultadoEmpresa }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="rounded-full bg-gray-200 text-gray-600 px-2 py-0.5 text-xs font-medium">Empresa</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{r.razaoSocial}</h3>
          <p className="font-mono text-xs text-gray-400">{formatarCNPJ(r.cnpj)}</p>
        </div>
        {r.situacaoRFB && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            r.situacaoRFB.toUpperCase() === "ATIVA" ? "bg-green-100 text-green-700"
            : r.situacaoRFB.toUpperCase() === "SUSPENSA" ? "bg-orange-100 text-orange-600"
            : "bg-gray-100 text-gray-500"
          }`}>{r.situacaoRFB}</span>
        )}
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {r.sindicato && (
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sindicato</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeTipoSind(r.sindicato.tipo)}`}>
              {r.sindicato.tipo}
            </span>
            <span className="text-sm text-gray-700">{r.sindicato.nome}</span>
          </div>
        )}
        {r.representantes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Representantes</p>
            <div className="flex flex-wrap gap-1.5">
              {r.representantes.map((v) => (
                <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2.5 py-0.5 text-xs text-orange-700">
                  <span className="font-medium">{v.representante.nome}</span>
                  <span className="text-orange-400">· {LABEL_RELACAO[v.tipoRelacao] ?? v.tipoRelacao}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {!r.sindicato && r.representantes.length === 0 && (
          <p className="text-xs text-gray-400 italic">Sem sindicato ou representantes vinculados.</p>
        )}
      </div>
    </div>
  );
}

function SecaoResultados({ titulo, cor, children }: { titulo: string; cor: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${cor}`}>{titulo}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ── componente principal ──────────────────────────────────────────────────────

export default function ConsultaVinculos() {
  const [busca, setBusca] = useState("");
  const [tipoBusca, setTipoBusca] = useState("tudo");
  const [carregando, setCarregando] = useState(false);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const configTipo = TIPOS_BUSCA.find((t) => t.value === tipoBusca)!;

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const termo = busca.trim();
    if (termo.length < 2) { setErro("Informe ao menos 2 caracteres."); return; }

    setCarregando(true);
    setErro(null);
    setResposta(null);

    try {
      const res = await fetch(`/api/vinculos?tipo=${tipoBusca}&busca=${encodeURIComponent(termo)}`);
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao consultar."); return; }
      setResposta(data as Resposta);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const vazio = resposta !== null && !carregando && resposta.total === 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Consulta de Vínculos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pesquise por palavra-chave e veja todos os lugares onde ela aparece: pessoas, sindicatos, conselhos, comitês e empresas.
        </p>
      </div>

      <form onSubmit={buscar} className="mb-6 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {TIPOS_BUSCA.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { setTipoBusca(t.value); setResposta(null); setErro(null); }}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                tipoBusca === t.value
                  ? "bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setErro(null); }}
            placeholder={`${configTipo.placeholder} (mín. 2 caracteres)`}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={carregando}
            className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50"
          >
            {carregando ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {vazio && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            Nenhum resultado para <strong>"{busca}"</strong>.
          </p>
        </div>
      )}

      {resposta !== null && !carregando && resposta.total > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-4">
            {resposta.total} resultado{resposta.total !== 1 ? "s" : ""} para <strong>"{busca}"</strong>
          </p>

          {resposta.tipo === "tudo" && (
            <div className="space-y-6">
              {resposta.pessoas.length > 0 && (
                <SecaoResultados titulo={`Pessoas (${resposta.pessoas.length})`} cor="text-gray-500">
                  {resposta.pessoas.map((r) => <CartaoPessoa key={r.id} r={r} />)}
                </SecaoResultados>
              )}
              {resposta.sindicatos.length > 0 && (
                <SecaoResultados titulo={`Sindicatos (${resposta.sindicatos.length})`} cor="text-indigo-600">
                  {resposta.sindicatos.map((r) => <CartaoSindicato key={r.id} r={r} />)}
                </SecaoResultados>
              )}
              {resposta.conselhos.length > 0 && (
                <SecaoResultados titulo={`Conselhos e Comitês (${resposta.conselhos.length})`} cor="text-teal-600">
                  {resposta.conselhos.map((r) => <CartaoConselho key={r.id} r={r} />)}
                </SecaoResultados>
              )}
              {resposta.empresas.length > 0 && (
                <SecaoResultados titulo={`Empresas (${resposta.empresas.length})`} cor="text-orange-600">
                  {resposta.empresas.map((r) => <CartaoEmpresa key={r.id} r={r} />)}
                </SecaoResultados>
              )}
            </div>
          )}

          {resposta.tipo === "pessoa" && (
            <div className="space-y-4">
              {resposta.resultados.map((r) => <CartaoPessoa key={r.id} r={r} />)}
            </div>
          )}
          {resposta.tipo === "sindicato" && (
            <div className="space-y-4">
              {resposta.resultados.map((r) => <CartaoSindicato key={r.id} r={r} />)}
            </div>
          )}
          {resposta.tipo === "conselho" && (
            <div className="space-y-4">
              {resposta.resultados.map((r) => <CartaoConselho key={r.id} r={r} />)}
            </div>
          )}
          {resposta.tipo === "empresa" && (
            <div className="space-y-4">
              {resposta.resultados.map((r) => <CartaoEmpresa key={r.id} r={r} />)}
            </div>
          )}
        </>
      )}
    </main>
  );
}
