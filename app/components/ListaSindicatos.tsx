"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import SindicatoForm from "./SindicatoForm";
import PresidentesModal from "./PresidentesModal";
import EmpresasSindicatoModal from "./EmpresasSindicatoModal";
import { useUsuario } from "./UserContext";

type Presidente = {
  id: number;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
};

type Sindicato = {
  id: number;
  nome: string;
  tipo: string;
  cnpj: string | null;
  afinidadeFieam: string | null;
  validadeMandato: string | null;
  observacoes: string | null;
  presidentes: Presidente[];
  _count: { empresas: number };
};

function formatarCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function badgeAfinidade(a: string | null) {
  if (!a) return "bg-gray-100 text-gray-400";
  const u = a.toUpperCase();
  if (u === "ALTO") return "bg-blue-100 text-blue-700 border border-blue-200";
  if (u === "MÉDIO" || u === "MEDIO") return "bg-yellow-100 text-yellow-700 border border-yellow-200";
  return "bg-red-100 text-red-600 border border-red-200";
}

function badgeTipo(tipo: string) {
  return tipo === "patronal"
    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
    : "bg-orange-100 text-orange-700 border border-orange-200";
}

export default function ListaSindicatos() {
  const usuario = useUsuario();
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "editor";
  const podeExcluir = usuario?.perfil === "admin";
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const [filtro, setFiltro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [modal, setModal] = useState<"novo" | "editar" | "excluir" | "presidentes" | "empresas" | null>(null);
  const [selecionado, setSelecionado] = useState<Sindicato | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await fetch("/api/sindicatos");
    const data = await res.json();
    setSindicatos(data);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function fecharModal() { setModal(null); setSelecionado(null); }

  async function confirmarExcluir() {
    if (!selecionado) return;
    await fetch(`/api/sindicatos/${selecionado.id}`, { method: "DELETE" });
    setModal(null);
    carregar();
  }

  function corresponde(nome: string, busca: string): boolean {
    const n = nome.toLowerCase();
    const partes = busca.toLowerCase().split("*").map((p) => p.trim()).filter(Boolean);
    if (partes.length === 0) return true;
    let pos = 0;
    for (const parte of partes) {
      const idx = n.indexOf(parte, pos);
      if (idx === -1) return false;
      pos = idx + parte.length;
    }
    return true;
  }

  const filtrados = sindicatos.filter((s) => {
    const passaTexto = !filtro || corresponde(s.nome, filtro) || (s.cnpj?.includes(filtro.replace(/\D/g, "")) ?? false);
    const passaTipo = filtroTipo === "todos" || s.tipo === filtroTipo;
    return passaTexto && passaTipo;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Ações e filtros */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nome ou CNPJ..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todos os tipos</option>
            <option value="patronal">Patronal</option>
            <option value="laboral">Laboral</option>
          </select>
        </div>
        {podeEditar && (
          <button
            onClick={() => setModal("novo")}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition"
          >
            + Novo Sindicato
          </button>
        )}
      </div>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total", valor: sindicatos.length, cor: "text-gray-800" },
          { label: "Patronais", valor: sindicatos.filter((s) => s.tipo === "patronal").length, cor: "text-indigo-700" },
          { label: "Laborais", valor: sindicatos.filter((s) => s.tipo === "laboral").length, cor: "text-orange-600" },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="rounded-lg bg-white border border-gray-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {carregando ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Nenhum sindicato encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">CNPJ</th>
                  <th className="px-4 py-3 text-left">Validade Mandato</th>
                  <th className="px-4 py-3 text-left">Empresas</th>
                  <th className="px-4 py-3 text-left">Presidente</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.nome}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeTipo(s.tipo)}`}>
                        {s.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {s.cnpj ? formatarCNPJ(s.cnpj) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {s.validadeMandato || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 font-medium">
                      {s._count.empresas > 0 ? (
                        <button
                          onClick={() => { setSelecionado(s); setModal("empresas"); }}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          {s._count.empresas}
                        </button>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px]">
                      {s.presidentes[0] ? (
                        <div>
                          <div className="font-medium truncate" title={s.presidentes[0].nome}>{s.presidentes[0].nome}</div>
                          {s.presidentes[0].cargo && <div className="text-gray-400 truncate">{s.presidentes[0].cargo}</div>}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => { setSelecionado(s); setModal("empresas"); }}
                        className="mr-2 text-green-600 hover:underline text-xs"
                      >
                        Empresas
                      </button>
                      <button
                        onClick={() => { setSelecionado(s); setModal("presidentes"); }}
                        className="mr-2 text-indigo-600 hover:underline text-xs"
                      >
                        Presidentes
                      </button>
                      {podeEditar && (
                        <button
                          onClick={() => { setSelecionado(s); setModal("editar"); }}
                          className="mr-2 text-blue-600 hover:underline text-xs"
                        >
                          Editar
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          onClick={() => { setSelecionado(s); setModal("excluir"); }}
                          className="text-red-500 hover:underline text-xs"
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {filtrados.length} sindicato{filtrados.length !== 1 ? "s" : ""} exibido{filtrados.length !== 1 ? "s" : ""}
      </p>

      {modal === "novo" && (
        <Modal titulo="Novo Sindicato" onFechar={fecharModal}>
          <SindicatoForm onSalvar={() => { fecharModal(); carregar(); }} onCancelar={fecharModal} />
        </Modal>
      )}

      {modal === "editar" && selecionado && (
        <Modal titulo="Editar Sindicato" onFechar={fecharModal}>
          <SindicatoForm
            inicial={selecionado}
            onSalvar={() => { fecharModal(); carregar(); }}
            onCancelar={fecharModal}
          />
        </Modal>
      )}

      {modal === "empresas" && selecionado && (
        <Modal titulo={`Empresas — ${selecionado.nome}`} onFechar={fecharModal} largo>
          <EmpresasSindicatoModal sindicatoId={selecionado.id} nomeSindicato={selecionado.nome} onFechar={fecharModal} />
        </Modal>
      )}

      {modal === "presidentes" && selecionado && (
        <Modal titulo={`Presidentes — ${selecionado.nome}`} onFechar={fecharModal}>
          <PresidentesModal sindicatoId={selecionado.id} onFechar={fecharModal} />
        </Modal>
      )}

      {modal === "excluir" && selecionado && (
        <Modal titulo="Confirmar Exclusão" onFechar={fecharModal}>
          <p className="text-sm text-gray-600 mb-2">
            Deseja excluir o sindicato <strong>{selecionado.nome}</strong>?
          </p>
          {selecionado._count.empresas > 0 && (
            <p className="text-xs text-orange-600 mb-4">
              Atenção: {selecionado._count.empresas} empresa(s) vinculada(s) perderão o vínculo.
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <button onClick={fecharModal} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={confirmarExcluir} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Excluir</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
