"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { useUsuario } from "./UserContext";

type SindicatoLite = { id: number; nome: string; tipo: string };
type ConselhoLite  = { id: number; nome: string; tipo: string };
type EmpresaLite   = { id: number; cnpj: string; razaoSocial: string; situacaoRFB: string | null };

type VinculoSindicato = {
  id: number;
  papel: string;
  dataInicio: string | null;
  dataFim: string | null;
  sindicato: SindicatoLite;
};

type VinculoConselho = {
  id: number;
  papel: string;
  conselho: ConselhoLite;
};

type VinculoEmpresa = {
  id: number;
  tipoRelacao: string;
  cargoNaEmpresa: string | null;
  observacao: string | null;
  aplicaCondicaoComercial: boolean;
  tipoCondicaoComercial: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  ativo: boolean;
  empresa: EmpresaLite;
};

const PAPEIS_SINDICATO = [
  "presidente",
  "vice-presidente",
  "secretario",
  "tesoureiro",
  "diretor",
  "conselho-fiscal",
  "suplente",
  "outro",
];
const LABEL_PAPEL_SINDICATO: Record<string, string> = {
  "presidente":      "Presidente",
  "vice-presidente": "Vice-Presidente",
  "secretario":      "Secretário",
  "tesoureiro":      "Tesoureiro",
  "diretor":         "Diretor",
  "conselho-fiscal": "Conselho Fiscal",
  "suplente":        "Suplente",
  "outro":           "Outro",
};
const PAPEIS_CONSELHO  = ["titular", "suplente", "membro", "outro"];
const TIPOS_RELACAO    = [
  "dono",
  "socio",
  "representante-legal",
  "diretor",
  "contato-comercial",
  "rh",
  "financeiro",
  "outro",
];
const LABEL_RELACAO: Record<string, string> = {
  "dono": "Dono",
  "socio": "Sócio",
  "representante-legal": "Representante Legal",
  "diretor": "Diretor",
  "contato-comercial": "Contato Comercial",
  "rh": "RH",
  "financeiro": "Financeiro",
  "outro": "Outro",
};

type Aba = "sindicatos" | "conselhos" | "empresas";

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return fallback;
    const text = await res.text();
    if (!text.trim()) return fallback;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

const inp = "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

type Props = {
  representanteId: number;
  representanteNome: string;
  onFechar: () => void;
};

export default function VinculosRepresentanteModal({ representanteId, representanteNome, onFechar }: Props) {
  const usuario = useUsuario();
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "editor";

  const [abaAtiva, setAbaAtiva] = useState<Aba>("sindicatos");

  const [vinculosSindicato, setVinculosSindicato] = useState<VinculoSindicato[]>([]);
  const [vinculosConselho,  setVinculosConselho]  = useState<VinculoConselho[]>([]);
  const [vinculosEmpresa,   setVinculosEmpresa]   = useState<VinculoEmpresa[]>([]);
  const [sindicatos, setSindicatos] = useState<SindicatoLite[]>([]);
  const [conselhos,  setConselhos]  = useState<ConselhoLite[]>([]);
  const [empresas,   setEmpresas]   = useState<EmpresaLite[]>([]);

  const [formSind, setFormSind] = useState({ sindicatoId: "", papel: "presidente", dataInicio: "", dataFim: "" });
  const [formCons, setFormCons] = useState({ conselhoId: "", papel: "titular" });
  const [formEmp,  setFormEmp]  = useState({
    empresaId: "",
    tipoRelacao: "dono",
    cargoNaEmpresa: "",
    observacao: "",
    dataInicio: "",
    dataFim: "",
    ativo: true,
  });
  const [filtroSindicato, setFiltroSindicato] = useState("");
  const [filtroConselho,  setFiltroConselho]  = useState("");
  const [filtroEmpresa,   setFiltroEmpresa]   = useState("");

  const [erroSind, setErroSind] = useState("");
  const [erroCons, setErroCons] = useState("");
  const [erroEmp,  setErroEmp]  = useState("");
  const [salvandoSind, setSalvandoSind] = useState(false);
  const [salvandoCons, setSalvandoCons] = useState(false);
  const [salvandoEmp,  setSalvandoEmp]  = useState(false);

  const carregar = useCallback(async () => {
    const [vs, vc, ve, rs, rc, re] = await Promise.all([
      fetch(`/api/representantes/${representanteId}/sindicatos`),
      fetch(`/api/representantes/${representanteId}/conselhos`),
      fetch(`/api/representantes/${representanteId}/empresas`),
      fetch("/api/sindicatos"),
      fetch("/api/conselhos"),
      fetch("/api/empresas"),
    ]);
    const [vsSafe, vcSafe, veSafe, todosS, todosC, todosE] = await Promise.all([
      safeJson<VinculoSindicato[]>(vs, []),
      safeJson<VinculoConselho[]>(vc, []),
      safeJson<VinculoEmpresa[]>(ve, []),
      safeJson<SindicatoLite[]>(rs, []),
      safeJson<ConselhoLite[]>(rc, []),
      safeJson<EmpresaLite[]>(re, []),
    ]);
    setVinculosSindicato(vsSafe);
    setVinculosConselho(vcSafe);
    setVinculosEmpresa(veSafe);
    setSindicatos(Array.isArray(todosS) ? todosS : []);
    setConselhos(Array.isArray(todosC) ? todosC : []);
    setEmpresas(Array.isArray(todosE) ? todosE : []);
  }, [representanteId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionarSindicato(e: React.FormEvent) {
    e.preventDefault();
    setErroSind("");
    if (!formSind.sindicatoId) { setErroSind("Selecione um sindicato."); return; }
    setSalvandoSind(true);
    const res = await fetch(`/api/representantes/${representanteId}/sindicatos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sindicatoId: Number(formSind.sindicatoId),
        papel: formSind.papel,
        dataInicio: formSind.dataInicio || null,
        dataFim: formSind.dataFim || null,
      }),
    });
    const data = await safeJson<{ error?: string }>(res, {});
    if (!res.ok) { setErroSind(data.error ?? "Erro ao vincular."); }
    else { setFormSind({ sindicatoId: "", papel: "presidente", dataInicio: "", dataFim: "" }); setFiltroSindicato(""); await carregar(); }
    setSalvandoSind(false);
  }

  async function removerSindicato(vinculoId: number) {
    await fetch(`/api/representantes/${representanteId}/sindicatos/${vinculoId}`, { method: "DELETE" });
    await carregar();
  }

  async function adicionarConselho(e: React.FormEvent) {
    e.preventDefault();
    setErroCons("");
    if (!formCons.conselhoId) { setErroCons("Selecione um conselho/comitê."); return; }
    setSalvandoCons(true);
    const res = await fetch(`/api/representantes/${representanteId}/conselhos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conselhoId: Number(formCons.conselhoId),
        papel: formCons.papel,
      }),
    });
    const data = await safeJson<{ error?: string }>(res, {});
    if (!res.ok) { setErroCons(data.error ?? "Erro ao vincular."); }
    else { setFormCons({ conselhoId: "", papel: "titular" }); setFiltroConselho(""); await carregar(); }
    setSalvandoCons(false);
  }

  async function removerConselho(vinculoId: number) {
    await fetch(`/api/representantes/${representanteId}/conselhos/${vinculoId}`, { method: "DELETE" });
    await carregar();
  }

  async function adicionarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    setErroEmp("");
    if (!formEmp.empresaId) { setErroEmp("Selecione uma empresa."); return; }
    setSalvandoEmp(true);
    const res = await fetch(`/api/representantes/${representanteId}/empresas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId: Number(formEmp.empresaId),
        tipoRelacao: formEmp.tipoRelacao,
        cargoNaEmpresa: formEmp.cargoNaEmpresa || null,
        observacao: formEmp.observacao || null,
        dataInicio: formEmp.dataInicio || null,
        dataFim: formEmp.dataFim || null,
        ativo: formEmp.ativo,
      }),
    });
    const data = await safeJson<{ error?: string }>(res, {});
    if (!res.ok) { setErroEmp(data.error ?? "Erro ao vincular."); }
    else {
      setFormEmp({ empresaId: "", tipoRelacao: "dono", cargoNaEmpresa: "", observacao: "", dataInicio: "", dataFim: "", ativo: true });
      setFiltroEmpresa("");
      await carregar();
    }
    setSalvandoEmp(false);
  }

  async function removerEmpresa(vinculoId: number) {
    await fetch(`/api/representantes/${representanteId}/empresas/${vinculoId}`, { method: "DELETE" });
    await carregar();
  }

  const sindicatosFiltrados = sindicatos.filter((s) =>
    !filtroSindicato || s.nome.toLowerCase().includes(filtroSindicato.toLowerCase())
  );

  const conselhosFiltrados = conselhos.filter((c) =>
    !filtroConselho || c.nome.toLowerCase().includes(filtroConselho.toLowerCase())
  );

  const empresasFiltradas = empresas.filter((e) => {
    if (!filtroEmpresa) return true;
    const f = filtroEmpresa.toLowerCase();
    return (
      e.razaoSocial.toLowerCase().includes(f) ||
      e.cnpj.replace(/\D/g, "").includes(filtroEmpresa.replace(/\D/g, ""))
    );
  });

  const abas: { key: Aba; label: string; count: number }[] = [
    { key: "sindicatos", label: "Sindicatos",        count: vinculosSindicato.length },
    { key: "conselhos",  label: "Conselhos e Comitês", count: vinculosConselho.length },
    { key: "empresas",   label: "Empresas",           count: vinculosEmpresa.length },
  ];

  return (
    <Modal titulo={`Vínculos — ${representanteNome}`} onFechar={onFechar} largo>
      <div className="space-y-4">

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {abas.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setAbaAtiva(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${
                abaAtiva === key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                abaAtiva === key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Aba: Sindicatos */}
        {abaAtiva === "sindicatos" && (
          <div>
            {vinculosSindicato.length > 0 ? (
              <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Sindicato</th>
                      <th className="px-4 py-2 text-left">Papel</th>
                      <th className="px-4 py-2 text-left">Início</th>
                      <th className="px-4 py-2 text-left">Fim</th>
                      {podeEditar && <th className="px-4 py-2 text-right">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...vinculosSindicato]
                      .sort((a, b) => PAPEIS_SINDICATO.indexOf(a.papel) - PAPEIS_SINDICATO.indexOf(b.papel))
                      .map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{v.sindicato.nome}</td>
                        <td className="px-4 py-2">
                          <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">{LABEL_PAPEL_SINDICATO[v.papel] ?? v.papel}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{formatarData(v.dataInicio)}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{formatarData(v.dataFim)}</td>
                        {podeEditar && (
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => removerSindicato(v.id)} className="text-red-500 hover:underline text-xs">Remover</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-4">Nenhum sindicato vinculado.</p>
            )}

            {podeEditar && (
              <form onSubmit={adicionarSindicato} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-medium text-gray-600">Adicionar vínculo com sindicato</p>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={filtroSindicato}
                    onChange={(e) => setFiltroSindicato(e.target.value)}
                    placeholder="Filtrar sindicato por nome..."
                    className={inp}
                  />
                  <select
                    value={formSind.sindicatoId}
                    onChange={(e) => setFormSind({ ...formSind, sindicatoId: e.target.value })}
                    size={4}
                    className={inp}
                  >
                    <option value="">— selecione —</option>
                    {sindicatosFiltrados.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <select
                    value={formSind.papel}
                    onChange={(e) => setFormSind({ ...formSind, papel: e.target.value })}
                    className={inp}
                  >
                    {PAPEIS_SINDICATO.map((p) => <option key={p} value={p}>{LABEL_PAPEL_SINDICATO[p]}</option>)}
                  </select>
                  <input
                    type="date"
                    value={formSind.dataInicio}
                    onChange={(e) => setFormSind({ ...formSind, dataInicio: e.target.value })}
                    className={inp}
                  />
                  <input
                    type="date"
                    value={formSind.dataFim}
                    onChange={(e) => setFormSind({ ...formSind, dataFim: e.target.value })}
                    className={inp}
                  />
                </div>
                {erroSind && <p className="text-xs text-red-600">{erroSind}</p>}
                <button type="submit" disabled={salvandoSind}
                  className="rounded-md bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                  {salvandoSind ? "Salvando..." : "Adicionar"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Aba: Conselhos */}
        {abaAtiva === "conselhos" && (
          <div>
            {vinculosConselho.length > 0 ? (
              <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Conselho/Comitê</th>
                      <th className="px-4 py-2 text-left">Tipo</th>
                      <th className="px-4 py-2 text-left">Papel</th>
                      {podeEditar && <th className="px-4 py-2 text-right">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vinculosConselho.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{v.conselho.nome}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${v.conselho.tipo === "comite" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-teal-50 text-teal-700 border border-teal-200"}`}>
                            {v.conselho.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700 capitalize">{v.papel}</span>
                        </td>
                        {podeEditar && (
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => removerConselho(v.id)} className="text-red-500 hover:underline text-xs">Remover</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-4">Nenhum conselho/comitê vinculado.</p>
            )}

            {podeEditar && (
              <form onSubmit={adicionarConselho} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-medium text-gray-600">Adicionar vínculo com conselho/comitê</p>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={filtroConselho}
                    onChange={(e) => setFiltroConselho(e.target.value)}
                    placeholder="Filtrar conselho/comitê por nome..."
                    className={inp}
                  />
                  <select
                    value={formCons.conselhoId}
                    onChange={(e) => setFormCons({ ...formCons, conselhoId: e.target.value })}
                    size={4}
                    className={inp}
                  >
                    <option value="">— selecione —</option>
                    {conselhosFiltrados.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={formCons.papel}
                    onChange={(e) => setFormCons({ ...formCons, papel: e.target.value })}
                    className={inp}
                  >
                    {PAPEIS_CONSELHO.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {erroCons && <p className="text-xs text-red-600">{erroCons}</p>}
                <button type="submit" disabled={salvandoCons}
                  className="rounded-md bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                  {salvandoCons ? "Salvando..." : "Adicionar"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Aba: Empresas */}
        {abaAtiva === "empresas" && (
          <div>
            {vinculosEmpresa.length > 0 ? (
              <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Empresa</th>
                      <th className="px-4 py-2 text-left">Tipo de Relação</th>
                      <th className="px-4 py-2 text-left">Cargo</th>
                      <th className="px-4 py-2 text-left">Ativo</th>
                      {podeEditar && <th className="px-4 py-2 text-right">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vinculosEmpresa.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-800 text-xs">{v.empresa.razaoSocial}</p>
                          <p className="font-mono text-gray-400 text-xs">{formatarCNPJ(v.empresa.cnpj)}</p>
                        </td>
                        <td className="px-4 py-2">
                          <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-xs text-orange-700">
                            {LABEL_RELACAO[v.tipoRelacao] ?? v.tipoRelacao}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">{v.cargoNaEmpresa || "—"}</td>
                        <td className="px-4 py-2 text-xs">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.ativo ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                            {v.ativo ? "Sim" : "Não"}
                          </span>
                        </td>
                        {podeEditar && (
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => removerEmpresa(v.id)} className="text-red-500 hover:underline text-xs">Remover</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-4">Nenhuma empresa vinculada.</p>
            )}

            {podeEditar && (
              <form onSubmit={adicionarEmpresa} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-medium text-gray-600">Adicionar vínculo com empresa</p>

                {/* Busca + seleção de empresa */}
                <div className="space-y-1">
                  <input
                    type="text"
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    placeholder="Filtrar empresa por nome ou CNPJ..."
                    className={inp}
                  />
                  <select
                    value={formEmp.empresaId}
                    onChange={(e) => setFormEmp({ ...formEmp, empresaId: e.target.value })}
                    size={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">— selecione —</option>
                    {empresasFiltradas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.razaoSocial} ({formatarCNPJ(e.cnpj)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tipo de Relação</label>
                    <select
                      value={formEmp.tipoRelacao}
                      onChange={(e) => setFormEmp({ ...formEmp, tipoRelacao: e.target.value })}
                      className={inp}
                    >
                      {TIPOS_RELACAO.map((t) => (
                        <option key={t} value={t}>{LABEL_RELACAO[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Cargo na Empresa</label>
                    <input
                      type="text"
                      value={formEmp.cargoNaEmpresa}
                      onChange={(e) => setFormEmp({ ...formEmp, cargoNaEmpresa: e.target.value })}
                      placeholder="Ex: Diretor Financeiro"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Data Início</label>
                    <input
                      type="date"
                      value={formEmp.dataInicio}
                      onChange={(e) => setFormEmp({ ...formEmp, dataInicio: e.target.value })}
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
                    <input
                      type="date"
                      value={formEmp.dataFim}
                      onChange={(e) => setFormEmp({ ...formEmp, dataFim: e.target.value })}
                      className={inp}
                    />
                  </div>
                </div>

                {/* Ativo */}
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formEmp.ativo}
                    onChange={(e) => setFormEmp({ ...formEmp, ativo: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Vínculo ativo
                </label>

                {/* Observação */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Observação</label>
                  <textarea
                    value={formEmp.observacao}
                    onChange={(e) => setFormEmp({ ...formEmp, observacao: e.target.value })}
                    rows={2}
                    placeholder="Informações adicionais sobre este vínculo..."
                    className={inp}
                  />
                </div>

                {erroEmp && <p className="text-xs text-red-600">{erroEmp}</p>}
                <button type="submit" disabled={salvandoEmp}
                  className="rounded-md bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                  {salvandoEmp ? "Salvando..." : "Adicionar Vínculo"}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1 border-t border-gray-100">
          <button onClick={onFechar} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
