"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import Modal from "./Modal";
import EmpresaForm from "./EmpresaForm";
import { useUsuario } from "./UserContext";

type Sindicato = {
  id: number;
  nome: string;
  tipo: string;
};

type RepresentanteEmpresaVinculo = {
  id: number;
  representanteId: number;
  tipoRelacao: string;
  cargoNaEmpresa: string | null;
  representante: { id: number; nome: string };
};

type Empresa = {
  id: number;
  cnpj: string;
  razaoSocial: string;
  cnae: string | null;
  ramoAtividade: string | null;
  perfil: string | null;
  situacaoRFB: string | null;
  afinidade: string | null;
  sindicatoId: number | null;
  sindicato: Sindicato | null;
  dataSindicalizacao: string;
  dataVencimento: string;
  status: string;
  observacoes: string | null;
  representantes: RepresentanteEmpresaVinculo[];
};

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function badgeStatus(status: string) {
  return status === "ativo"
    ? "bg-green-100 text-green-700 border border-green-200"
    : "bg-red-100 text-red-700 border border-red-200";
}


function badgeSituacaoRFB(s: string | null) {
  if (!s) return "";
  const upper = s.toUpperCase();
  if (upper === "ATIVA") return "text-green-700";
  if (upper === "BAIXADA") return "text-gray-500";
  if (upper === "SUSPENSA") return "text-orange-600";
  return "text-red-600";
}

function vencida(data: string) {
  return new Date(data) < new Date();
}

function Row({ label, valor, classe }: { label: string; valor?: string | null; classe?: string }) {
  if (!valor) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 shrink-0 w-24">{label}:</span>
      <span className={`text-gray-800 ${classe ?? ""}`}>{valor}</span>
    </div>
  );
}

export default function ListaEmpresas() {
  const usuario = useUsuario();
  const isAdmin = usuario?.perfil === "admin" || usuario?.perfil === "editor";
  const podeExcluir = usuario?.perfil === "admin";
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroSindicato, setFiltroSindicato] = useState("todos");
  const [modal, setModal] = useState<"novo" | "editar" | "excluir" | "importar" | "ver" | null>(null);
  const [selecionada, setSelecionada] = useState<Empresa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{
    criados: number;
    atualizados: number;
    erros: number;
    linhasComErro: { linha: number; cnpj: string; razaoSocial: string; motivo: string }[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/empresas");
    const data = await res.json();
    setEmpresas(data);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Atualiza a lista automaticamente a cada 30 segundos quando nenhum modal está aberto
  useEffect(() => {
    const timer = setInterval(() => {
      if (!modal) carregar();
    }, 30_000);
    return () => clearInterval(timer);
  }, [carregar, modal]);

  function abrirVer(e: Empresa) { setSelecionada(e); setModal("ver"); }
  function abrirEditar(e: Empresa) { setSelecionada(e); setModal("editar"); }
  function abrirExcluir(e: Empresa) { setSelecionada(e); setModal("excluir"); }

  async function confirmarExcluir() {
    if (!selecionada) return;
    await fetch(`/api/empresas/${selecionada.id}`, { method: "DELETE" });
    setModal(null);
    carregar();
  }

  function fecharModal() { setModal(null); setSelecionada(null); setResultadoImport(null); }

  function exportarCSV() {
    const cabecalhos = [
      "CNPJ", "Razão Social", "Perfil", "CNAE", "Ramo de Atividade",
      "Situação RFB", "Sindicato", "Tipo Sindicato",
      "Data Sindicalização", "Data Vencimento", "Status DRT", "Observações",
    ];

    function escaparCampo(valor: string): string {
      if (valor.includes(";") || valor.includes('"') || valor.includes("\n")) {
        return `"${valor.replace(/"/g, '""')}"`;
      }
      return valor;
    }

    const linhas = filtradas.map((e) =>
      [
        formatarCNPJ(e.cnpj),
        e.razaoSocial,
        e.perfil ?? "",
        e.cnae ?? "",
        e.ramoAtividade ?? "",
        e.situacaoRFB ?? "",
        e.sindicato?.nome ?? "",
        e.sindicato?.tipo ?? "",
        formatarData(e.dataSindicalizacao),
        formatarData(e.dataVencimento),
        e.status,
        e.observacoes ?? "",
      ].map(escaparCampo).join(";")
    );

    const csv = "﻿" + [cabecalhos.map(escaparCampo).join(";"), ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `empresas_sindicalizadas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImportando(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: fd });
    const data = await res.json();
    setResultadoImport(data);
    setImportando(false);
    carregar();
  }

  function baixarErrosCSV() {
    if (!resultadoImport?.linhasComErro.length) return;
    const cabecalho = "Linha;CNPJ;Razão Social;Motivo do Erro";
    const linhas = resultadoImport.linhasComErro.map(
      (r) => `${r.linha};"${r.cnpj}";"${r.razaoSocial}";"${r.motivo}"`
    );
    const csv = "﻿" + [cabecalho, ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "erros_importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function corresponde(texto: string, busca: string): boolean {
    const t = texto.toLowerCase();
    const partes = busca.toLowerCase().split("*").map((p) => p.trim()).filter(Boolean);
    if (partes.length === 0) return true;
    let pos = 0;
    for (const parte of partes) {
      const idx = t.indexOf(parte, pos);
      if (idx === -1) return false;
      pos = idx + parte.length;
    }
    return true;
  }

  const sindicatosDisponiveis = Array.from(
    new Map(
      empresas
        .filter((e) => e.sindicato)
        .map((e) => [e.sindicato!.id, e.sindicato!])
    ).values()
  ).sort((a, b) => a.nome.localeCompare(b.nome));

  const filtradas = empresas.filter((e) => {
    const cnpjBusca = filtro.replace(/\D/g, "");
    const passaTexto =
      !filtro ||
      corresponde(e.razaoSocial, filtro) ||
      (cnpjBusca.length > 0 && e.cnpj.includes(cnpjBusca));
    const passaStatus = filtroStatus === "todos" || e.status === filtroStatus;
    const passaSindicato =
      filtroSindicato === "todos" ||
      (filtroSindicato === "sem_sindicato" ? !e.sindicatoId : e.sindicatoId === Number(filtroSindicato));
    return passaTexto && passaStatus && passaSindicato;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Ações e filtros */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por razão social, CNPJ, sindicato, CNAE..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <select
              value={filtroSindicato}
              onChange={(e) => setFiltroSindicato(e.target.value)}
              className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-xs"
            >
              <option value="todos">Todos os sindicatos</option>
              <option value="sem_sindicato">Sem sindicato</option>
              {sindicatosDisponiveis.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">

          {isAdmin && (
            <button
              onClick={exportarCSV}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg border border-green-600 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition"
            >
              ⬇ Exportar CSV
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setModal("novo")}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
            >
              + Nova Empresa
            </button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3">
        {[
          { label: "Total", valor: filtradas.length, cor: "text-gray-800" },
          { label: "Ativos", valor: filtradas.filter((e) => e.status === "ativo").length, cor: "text-green-700" },
          { label: "Inativos", valor: filtradas.filter((e) => e.status === "inativo").length, cor: "text-red-700" },
          { label: "Vencidos", valor: filtradas.filter((e) => vencida(e.dataVencimento) && e.status === "ativo").length, cor: "text-orange-600" },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="rounded-lg bg-white border border-gray-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {carregando ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Nenhuma empresa encontrada.</div>
        ) : (
          <>
            {/* Cards — mobile */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filtradas.map((e) => (
                <div key={e.id} className="px-4 py-3 space-y-1" onClick={() => abrirVer(e)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{e.razaoSocial}</p>
                      <p className="font-mono text-xs text-gray-400">{formatarCNPJ(e.cnpj)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeStatus(e.status)}`}>
                      {e.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {e.sindicato && <span>{e.sindicato.nome}</span>}
                    <span className={vencida(e.dataVencimento) && e.status === "ativo" ? "text-orange-600 font-medium" : ""}>
                      Venc. {formatarData(e.dataVencimento)}{vencida(e.dataVencimento) && e.status === "ativo" ? " ⚠" : ""}
                    </span>
                    {e.situacaoRFB && (
                      <span className={badgeSituacaoRFB(e.situacaoRFB)}>{e.situacaoRFB}</span>
                    )}
                  </div>
                  {(isAdmin || podeExcluir) && (
                    <div className="flex gap-3 pt-1">
                      {isAdmin && (
                        <button onClick={(ev) => { ev.stopPropagation(); abrirEditar(e); }} className="text-blue-600 text-xs font-medium">Editar</button>
                      )}
                      {podeExcluir && (
                        <button onClick={(ev) => { ev.stopPropagation(); abrirExcluir(e); }} className="text-red-500 text-xs font-medium">Excluir</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tabela — desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">CNPJ</th>
                    <th className="px-4 py-3 text-left">Razão Social</th>
                    <th className="px-4 py-3 text-left">Perfil / CNAE</th>
                    <th className="px-4 py-3 text-left">Sindicato</th>
                    <th className="px-4 py-3 text-left">Sit. RFB</th>
                    <th className="px-4 py-3 text-left">Vencimento</th>
                    <th className="px-4 py-3 text-left">Status DRT</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtradas.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onDoubleClick={() => abrirVer(e)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{formatarCNPJ(e.cnpj)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>{e.razaoSocial}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {e.perfil && <div className="text-xs font-medium text-gray-700">{e.perfil}</div>}
                        {e.cnae && <div className="text-xs text-gray-400">{e.cnae}{e.ramoAtividade ? ` — ${e.ramoAtividade}` : ""}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {e.sindicato ? (
                          <div>
                            <div className="text-xs text-gray-700">{e.sindicato.nome}</div>
                            <span className="text-[10px] text-gray-400 capitalize">{e.sindicato.tipo}</span>
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${badgeSituacaoRFB(e.situacaoRFB)}`}>
                          {e.situacaoRFB ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={vencida(e.dataVencimento) && e.status === "ativo" ? "text-orange-600 font-medium text-xs" : "text-gray-600 text-xs"}>
                          {formatarData(e.dataVencimento)}
                          {vencida(e.dataVencimento) && e.status === "ativo" && " ⚠"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeStatus(e.status)}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <button onClick={(ev) => { ev.stopPropagation(); abrirEditar(e); }} className="mr-2 text-blue-600 hover:underline text-xs">Editar</button>
                        )}
                        {podeExcluir && (
                          <button onClick={(ev) => { ev.stopPropagation(); abrirExcluir(e); }} className="text-red-500 hover:underline text-xs">Excluir</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {filtradas.length} empresa{filtradas.length !== 1 ? "s" : ""} exibida{filtradas.length !== 1 ? "s" : ""}
      </p>

      {/* Modal: Visualizar */}
      {modal === "ver" && selecionada && (
        <Modal titulo="Detalhes da Empresa" onFechar={fecharModal}>
          <div className="space-y-5">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selecionada.razaoSocial}</h3>
                <p className="font-mono text-sm text-gray-500 mt-0.5">{formatarCNPJ(selecionada.cnpj)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeStatus(selecionada.status)}`}>
                  {selecionada.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              {/* Perfil / Atividade */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Atividade</p>
                <div className="space-y-1">
                  <Row label="Perfil" valor={selecionada.perfil} />
                  <Row label="CNAE" valor={selecionada.cnae} />
                  <Row label="Ramo" valor={selecionada.ramoAtividade} />
                  <Row
                    label="Sit. RFB"
                    valor={selecionada.situacaoRFB}
                    classe={badgeSituacaoRFB(selecionada.situacaoRFB)}
                  />
                </div>
              </div>

              {/* Sindicalização */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Sindicalização</p>
                <div className="space-y-1">
                  <Row label="Sindicato" valor={selecionada.sindicato?.nome} />
                  <Row label="Tipo" valor={selecionada.sindicato?.tipo} classe="capitalize" />
                  <Row label="Responsável" valor={selecionada.representantes?.find((r) => r.tipoRelacao === "responsavel")?.representante.nome} />
                  <Row label="Sindicalizado em" valor={formatarData(selecionada.dataSindicalizacao)} />
                  <Row
                    label="Desfiliação"
                    valor={
                      formatarData(selecionada.dataVencimento) +
                      (vencida(selecionada.dataVencimento) && selecionada.status === "ativo" ? " ⚠ Vencido" : "")
                    }
                    classe={vencida(selecionada.dataVencimento) && selecionada.status === "ativo" ? "text-orange-600 font-medium" : ""}
                  />
                </div>
              </div>
            </div>

            {selecionada.representantes?.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Representantes</p>
                <div className="space-y-1">
                  {selecionada.representantes.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-800">{r.representante.nome}</span>
                      <span className="text-xs text-gray-400 capitalize">{r.tipoRelacao.replace(/-/g, " ")}</span>
                      {r.cargoNaEmpresa && <span className="text-xs text-gray-400">({r.cargoNaEmpresa})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selecionada.observacoes && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Observações</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selecionada.observacoes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              {isAdmin && (
                <button
                  onClick={() => { setModal(null); abrirEditar(selecionada); }}
                  className="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  Editar
                </button>
              )}
              <button onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Nova Empresa */}
      {modal === "novo" && (
        <Modal titulo="Nova Empresa Sindicalizada" onFechar={fecharModal}>
          <EmpresaForm onSalvar={() => { fecharModal(); carregar(); }} onCancelar={fecharModal} />
        </Modal>
      )}

      {/* Modal: Editar */}
      {modal === "editar" && selecionada && (
        <Modal titulo="Editar Empresa" onFechar={fecharModal}>
          <EmpresaForm
            inicial={{
              ...selecionada,
              responsavelRepresentanteId: selecionada.representantes?.find((r) => r.tipoRelacao === "responsavel")?.representanteId ?? null,
            }}
            onSalvar={() => { fecharModal(); carregar(); }}
            onCancelar={fecharModal}
          />
        </Modal>
      )}

      {/* Modal: Confirmar Exclusão */}
      {modal === "excluir" && selecionada && (
        <Modal titulo="Confirmar Exclusão" onFechar={fecharModal}>
          <p className="text-sm text-gray-600 mb-6">
            Deseja excluir <strong>{selecionada.razaoSocial}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={confirmarExcluir} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Excluir</button>
          </div>
        </Modal>
      )}

      {/* Modal: Importar CSV */}
      {modal === "importar" && (
        <Modal titulo="Importar Empresas por CSV" onFechar={fecharModal}>
          {resultadoImport ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm">
                <p className="font-medium text-green-800 mb-2">Importação concluída!</p>
                <ul className="space-y-1 text-green-700">
                  <li>Criadas: <strong>{resultadoImport.criados}</strong></li>
                  <li>Atualizadas: <strong>{resultadoImport.atualizados}</strong></li>
                  <li>Erros: <strong className={resultadoImport.erros > 0 ? "text-red-600" : ""}>{resultadoImport.erros}</strong></li>
                </ul>
              </div>

              {resultadoImport.linhasComErro.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-red-700">Empresas com erro ({resultadoImport.linhasComErro.length}):</p>
                    <button
                      onClick={baixarErrosCSV}
                      className="inline-flex items-center gap-1 rounded-md border border-green-600 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      ⬇ Baixar em Excel
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-red-200">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50 text-red-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Linha</th>
                          <th className="px-3 py-2 text-left font-medium">CNPJ</th>
                          <th className="px-3 py-2 text-left font-medium">Razão Social</th>
                          <th className="px-3 py-2 text-left font-medium">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {resultadoImport.linhasComErro.map((r) => (
                          <tr key={r.linha} className="bg-white hover:bg-red-50">
                            <td className="px-3 py-2 text-gray-500">{r.linha}</td>
                            <td className="px-3 py-2 font-mono text-gray-700">{r.cnpj}</td>
                            <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate" title={r.razaoSocial}>{r.razaoSocial}</td>
                            <td className="px-3 py-2 text-red-600">{r.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={fecharModal} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Fechar</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleImport} className="space-y-4">
              <p className="text-sm text-gray-600">
                Faça upload de um arquivo CSV com as colunas: <code className="text-xs bg-gray-100 px-1 rounded">cnpj</code>, <code className="text-xs bg-gray-100 px-1 rounded">razao_social</code>, <code className="text-xs bg-gray-100 px-1 rounded">sindicato</code>, <code className="text-xs bg-gray-100 px-1 rounded">data_sindicalizacao</code>, <code className="text-xs bg-gray-100 px-1 rounded">data_vencimento</code>, entre outros. Separador: vírgula ou ponto-e-vírgula.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                required
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={importando} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                  {importando ? "Importando..." : "Importar"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </main>
  );
}
