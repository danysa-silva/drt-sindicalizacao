"use client";

import { useState, useEffect } from "react";

type Representante = { id: number; nome: string };

type SindicatoFormData = {
  nome: string;
  tipo: string;
  cnpj: string;
  validadeMandato: string;
  observacoes: string;
};

type InitialSindicato = {
  id?: number;
  nome?: string | null;
  tipo?: string | null;
  cnpj?: string | null;
  validadeMandato?: string | null;
  observacoes?: string | null;
  presidenteRepresentanteId?: number | null;
};

type Props = {
  inicial?: InitialSindicato;
  onSalvar: () => void;
  onCancelar: () => void;
};

function formatarCNPJ(valor: string) {
  const digits = valor.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

const VAZIO: SindicatoFormData = {
  nome: "", tipo: "patronal", cnpj: "", validadeMandato: "", observacoes: "",
};

export default function SindicatoForm({ inicial, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<SindicatoFormData>(VAZIO);
  const [presidenteId, setPresidenteId] = useState("");
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [filtroRep, setFiltroRep] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/representantes")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setRepresentantes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (inicial) {
      setForm({
        nome: inicial.nome ?? "",
        tipo: inicial.tipo ?? "patronal",
        cnpj: inicial.cnpj ? formatarCNPJ(inicial.cnpj) : "",
        validadeMandato: inicial.validadeMandato ?? "",
        observacoes: inicial.observacoes ?? "",
      });
      setPresidenteId(inicial.presidenteRepresentanteId ? String(inicial.presidenteRepresentanteId) : "");
    }
  }, [inicial]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === "cnpj") {
      setForm((f) => ({ ...f, cnpj: formatarCNPJ(value) }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const url = inicial?.id ? `/api/sindicatos/${inicial.id}` : "/api/sindicatos";
    const method = inicial?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Erro ao salvar sindicato");
      setSalvando(false);
      return;
    }

    const sindicatoSalvo = await res.json();
    const sindicatoId = sindicatoSalvo.id ?? inicial?.id;

    const presidenteAnteriorNum = inicial?.presidenteRepresentanteId
      ? Number(inicial.presidenteRepresentanteId)
      : null;
    const presidenteNovo = presidenteId ? Number(presidenteId) : null;

    if (presidenteNovo !== presidenteAnteriorNum && sindicatoId) {
      await fetch(`/api/sindicatos/${sindicatoId}/presidente`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ representanteId: presidenteNovo }),
      });
    }

    onSalvar();
    setSalvando(false);
  }

  const repFiltrados = representantes.filter((r) => {
    if (String(r.id) === presidenteId) return true;
    return !filtroRep || r.nome.toLowerCase().includes(filtroRep.toLowerCase());
  });

  const lbl = "block text-sm font-medium text-gray-700 mb-1";
  const inp = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {erro && (
        <div className="rounded-md bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      <div>
        <label className={lbl}>Nome do Sindicato *</label>
        <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome completo do sindicato" required className={inp} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl}>Tipo *</label>
          <select name="tipo" value={form.tipo} onChange={handleChange} required className={inp}>
            <option value="patronal">Patronal</option>
          </select>
        </div>
        <div>
          <label className={lbl}>CNPJ</label>
          <input name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" className={inp} />
        </div>
      </div>

      <div>
        <label className={lbl}>Validade do Mandato</label>
        <input name="validadeMandato" value={form.validadeMandato} onChange={handleChange} placeholder="Ex: 08/04/2023" className={inp} />
      </div>

      <div>
        <label className={lbl}>Presidente</label>
        <input
          value={filtroRep}
          onChange={(e) => setFiltroRep(e.target.value)}
          placeholder="Filtrar representantes..."
          className={`mb-1 ${inp}`}
        />
        <select
          value={presidenteId}
          onChange={(e) => setPresidenteId(e.target.value)}
          className={inp}
        >
          <option value="">— Nenhum —</option>
          {repFiltrados.map((r) => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={lbl}>Observações</label>
        <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={2} placeholder="Informações adicionais..." className={inp} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancelar} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={salvando} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {salvando ? "Salvando..." : inicial?.id ? "Salvar Alterações" : "Cadastrar Sindicato"}
        </button>
      </div>
    </form>
  );
}
