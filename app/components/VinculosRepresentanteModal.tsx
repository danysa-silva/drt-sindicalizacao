"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { useUsuario } from "./UserContext";

type SindicatoLite = { id: number; nome: string; tipo: string };
type ConselhoLite  = { id: number; nome: string; tipo: string };

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

const PAPEIS_SINDICATO = ["presidente", "vice-presidente", "diretor", "outro"];
const PAPEIS_CONSELHO  = ["titular", "suplente", "membro", "outro"];

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

type Props = {
  representanteId: number;
  representanteNome: string;
  onFechar: () => void;
};

export default function VinculosRepresentanteModal({ representanteId, representanteNome, onFechar }: Props) {
  const usuario = useUsuario();
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "editor";

  const [vinculosSindicato, setVinculosSindicato] = useState<VinculoSindicato[]>([]);
  const [vinculosConselho,  setVinculosConselho]  = useState<VinculoConselho[]>([]);
  const [sindicatos, setSindicatos] = useState<SindicatoLite[]>([]);
  const [conselhos,  setConselhos]  = useState<ConselhoLite[]>([]);

  const [formSind, setFormSind] = useState({ sindicatoId: "", papel: "presidente", dataInicio: "", dataFim: "" });
  const [formCons, setFormCons] = useState({ conselhoId: "", papel: "titular" });

  const [erroSind, setErroSind] = useState("");
  const [erroCons, setErroCons] = useState("");
  const [salvandoSind, setSalvandoSind] = useState(false);
  const [salvandoCons, setSalvandoCons] = useState(false);

  const carregar = useCallback(async () => {
    const [vs, vc, rs, rc] = await Promise.all([
      fetch(`/api/representantes/${representanteId}/sindicatos`),
      fetch(`/api/representantes/${representanteId}/conselhos`),
      fetch("/api/sindicatos"),
      fetch("/api/conselhos"),
    ]);
    setVinculosSindicato(await vs.json());
    setVinculosConselho(await vc.json());
    const todosS = await rs.json();
    const todosC = await rc.json();
    setSindicatos(Array.isArray(todosS) ? todosS : []);
    setConselhos(Array.isArray(todosC) ? todosC : []);
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
    const data = await res.json();
    if (!res.ok) { setErroSind(data.error ?? "Erro ao vincular."); }
    else { setFormSind({ sindicatoId: "", papel: "presidente", dataInicio: "", dataFim: "" }); await carregar(); }
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
    const data = await res.json();
    if (!res.ok) { setErroCons(data.error ?? "Erro ao vincular."); }
    else { setFormCons({ conselhoId: "", papel: "titular" }); await carregar(); }
    setSalvandoCons(false);
  }

  async function removerConselho(vinculoId: number) {
    await fetch(`/api/representantes/${representanteId}/conselhos/${vinculoId}`, { method: "DELETE" });
    await carregar();
  }

  return (
    <Modal titulo={`Vínculos — ${representanteNome}`} onFechar={onFechar} largo>
      <div className="space-y-6">

        {/* Vínculos com Sindicatos */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Sindicatos ({vinculosSindicato.length})
          </h3>

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
                  {vinculosSindicato.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{v.sindicato.nome}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700 capitalize">{v.papel}</span>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={formSind.sindicatoId}
                  onChange={(e) => setFormSind({ ...formSind, sindicatoId: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Selecione o sindicato</option>
                  {sindicatos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                <select
                  value={formSind.papel}
                  onChange={(e) => setFormSind({ ...formSind, papel: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {PAPEIS_SINDICATO.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input
                  type="date"
                  value={formSind.dataInicio}
                  onChange={(e) => setFormSind({ ...formSind, dataInicio: e.target.value })}
                  placeholder="Início do mandato"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={formSind.dataFim}
                  onChange={(e) => setFormSind({ ...formSind, dataFim: e.target.value })}
                  placeholder="Fim do mandato"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              {erroSind && <p className="text-xs text-red-600">{erroSind}</p>}
              <button
                type="submit"
                disabled={salvandoSind}
                className="rounded-md bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {salvandoSind ? "Salvando..." : "Adicionar"}
              </button>
            </form>
          )}
        </div>

        {/* Vínculos com Conselhos/Comitês */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Conselhos e Comitês ({vinculosConselho.length})
          </h3>

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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={formCons.conselhoId}
                  onChange={(e) => setFormCons({ ...formCons, conselhoId: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Selecione o conselho/comitê</option>
                  {conselhos.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
                </select>
                <select
                  value={formCons.papel}
                  onChange={(e) => setFormCons({ ...formCons, papel: e.target.value })}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {PAPEIS_CONSELHO.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {erroCons && <p className="text-xs text-red-600">{erroCons}</p>}
              <button
                type="submit"
                disabled={salvandoCons}
                className="rounded-md bg-blue-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {salvandoCons ? "Salvando..." : "Adicionar"}
              </button>
            </form>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={onFechar} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
