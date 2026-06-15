"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";

type Sindicato = { id: number; nome: string; tipo: string };
type Representante = { id: number; nome: string };

type EmpresaFormData = {
  cnpj: string;
  tipoUnidade: string;
  razaoSocial: string;
  cnae: string;
  ramoAtividade: string;
  perfil: string;
  situacaoRFB: string;
  sindicatoId: string;
  dataSindicalizacao: string;
  dataVencimento: string;
  status: string;
  observacoes: string;
};

type InitialEmpresa = {
  id?: number;
  cnpj?: string | null;
  tipoUnidade?: string | null;
  razaoSocial?: string | null;
  cnae?: string | null;
  ramoAtividade?: string | null;
  perfil?: string | null;
  situacaoRFB?: string | null;
  sindicatoId?: number | null;
  sindicato?: Sindicato | null;
  dataSindicalizacao?: string | null;
  dataVencimento?: string | null;
  status?: string | null;
  observacoes?: string | null;
  responsavelRepresentanteId?: number | null;
};

type Props = {
  inicial?: InitialEmpresa;
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

const CAMPOS_VAZIOS: EmpresaFormData = {
  cnpj: "", tipoUnidade: "", razaoSocial: "", cnae: "", ramoAtividade: "", perfil: "",
  situacaoRFB: "", sindicatoId: "",
  dataSindicalizacao: "", dataVencimento: "", status: "ativo", observacoes: "",
};

function ehCnaeIndustria(cnae: string): boolean {
  const digits = cnae.replace(/\D/g, "");
  if (digits.length < 2) return false;
  const prefixo = parseInt(digits.slice(0, 2), 10);
  return (prefixo >= 5 && prefixo <= 33) || (prefixo >= 35 && prefixo <= 39) || (prefixo >= 41 && prefixo <= 43);
}

export default function EmpresaForm({ inicial, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<EmpresaFormData>(CAMPOS_VAZIOS);
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const [filtroSindicato, setFiltroSindicato] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmarNaoIndustria, setConfirmarNaoIndustria] = useState(false);

  const [responsavelId, setResponsavelId] = useState("");
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  const [filtroRep, setFiltroRep] = useState("");
  const [modalNovoRep, setModalNovoRep] = useState(false);
  const [novoRepForm, setNovoRepForm] = useState({ nome: "", cpf: "", email: "", telefone: "", observacoes: "" });
  const [novoRepErro, setNovoRepErro] = useState("");
  const [novoRepSalvando, setNovoRepSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/sindicatos").then((r) => r.json()).then(setSindicatos).catch(() => {});
    fetch("/api/representantes")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setRepresentantes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (inicial) {
      setForm({
        cnpj: inicial.cnpj ? formatarCNPJ(inicial.cnpj) : "",
        tipoUnidade: inicial.tipoUnidade ?? "",
        razaoSocial: inicial.razaoSocial ?? "",
        cnae: inicial.cnae ?? "",
        ramoAtividade: inicial.ramoAtividade ?? "",
        perfil: inicial.perfil ?? "",
        situacaoRFB: inicial.situacaoRFB ?? "",
        sindicatoId: inicial.sindicatoId ? String(inicial.sindicatoId) : "",
        dataSindicalizacao: inicial.dataSindicalizacao
          ? new Date(inicial.dataSindicalizacao).toISOString().split("T")[0]
          : "",
        dataVencimento: inicial.dataVencimento
          ? new Date(inicial.dataVencimento).toISOString().split("T")[0]
          : "",
        status: inicial.status ?? "ativo",
        observacoes: inicial.observacoes ?? "",
      });
      setResponsavelId(inicial.responsavelRepresentanteId ? String(inicial.responsavelRepresentanteId) : "");
    }
  }, [inicial]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === "cnpj") {
      setForm((f) => ({ ...f, cnpj: formatarCNPJ(value) }));
    } else if (name === "cnae") {
      const perfil = ehCnaeIndustria(value) ? "Indústria" : "";
      setForm((f) => ({ ...f, cnae: value, perfil }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  async function salvarNovoRepresentante(e: React.FormEvent) {
    e.preventDefault();
    setNovoRepErro("");
    setNovoRepSalvando(true);
    const res = await fetch("/api/representantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novoRepForm.nome,
        cpf: novoRepForm.cpf || null,
        email: novoRepForm.email || null,
        telefone: novoRepForm.telefone || null,
        observacoes: novoRepForm.observacoes || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setNovoRepErro(data.error ?? "Erro ao salvar.");
      setNovoRepSalvando(false);
      return;
    }
    const novo = await res.json();
    const lista = await fetch("/api/representantes").then((r) => r.json());
    setRepresentantes(Array.isArray(lista) ? lista : []);
    setResponsavelId(String(novo.id));
    setNovoRepForm({ nome: "", cpf: "", email: "", telefone: "", observacoes: "" });
    setModalNovoRep(false);
    setNovoRepSalvando(false);
  }

  async function salvarEmpresa() {
    setErro("");
    setSalvando(true);
    setConfirmarNaoIndustria(false);

    const url = inicial?.id ? `/api/empresas/${inicial.id}` : "/api/empresas";
    const method = inicial?.id ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        sindicatoId: form.sindicatoId ? Number(form.sindicatoId) : null,
      }),
    });

    if (res.ok) {
      const salvo = await res.json();
      const empresaId = salvo.id ?? inicial?.id;

      const responsavelAnterior = inicial?.responsavelRepresentanteId ? Number(inicial.responsavelRepresentanteId) : null;
      const responsavelNovo = responsavelId ? Number(responsavelId) : null;

      if (responsavelNovo !== responsavelAnterior && empresaId) {
        await fetch(`/api/empresas/${empresaId}/responsavel`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ representanteId: responsavelNovo }),
        });
      }

      onSalvar();
    } else {
      const data = await res.json();
      setErro(data.error ?? "Erro ao salvar empresa");
    }
    setSalvando(false);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.cnae && !ehCnaeIndustria(form.cnae)) {
      setConfirmarNaoIndustria(true);
      return;
    }
    salvarEmpresa();
  }

  const lbl = "block text-sm font-medium text-gray-700 mb-1";
  const inp = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const repFiltrados = representantes.filter((r) => {
    if (String(r.id) === responsavelId) return true;
    return !filtroRep || r.nome.toLowerCase().includes(filtroRep.toLowerCase());
  });

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {erro && (
        <div className="rounded-md bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {confirmarNaoIndustria && (
        <div className="rounded-md bg-yellow-50 border border-yellow-400 px-4 py-3 text-sm text-yellow-800">
          <p className="font-semibold mb-1">Atenção: CNAE não é de indústria</p>
          <p className="mb-3">O CNAE informado não pertence às faixas da indústria (05–33, 35–39, 41–43). Tem certeza que deseja cadastrar assim mesmo?</p>
          <div className="flex gap-3">
            <button type="button" onClick={salvarEmpresa} disabled={salvando}
              className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50">
              {salvando ? "Salvando..." : "Sim, cadastrar assim mesmo"}
            </button>
            <button type="button" onClick={() => setConfirmarNaoIndustria(false)}
              className="rounded-md border border-yellow-500 px-3 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100">
              Não, corrigir CNAE
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={lbl}>CNPJ *</label>
          <input name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" required className={inp} />
        </div>
        <div>
          <label className={lbl}>Tipo</label>
          <select name="tipoUnidade" value={form.tipoUnidade} onChange={handleChange} className={inp}>
            <option value="">Não informado</option>
            <option value="matriz">Matriz</option>
            <option value="filial">Filial</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Status no DRT *</label>
          <select name="status" value={form.status} onChange={handleChange} required className={inp}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Razão Social *</label>
        <input name="razaoSocial" value={form.razaoSocial} onChange={handleChange} placeholder="Nome oficial da empresa" required className={inp} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl}>Perfil da Empresa</label>
          <select name="perfil" value={form.perfil} onChange={handleChange} className={inp}>
            <option value="">Não informado</option>
            <option value="Indústria">Indústria</option>
            <option value="Comércio">Comércio</option>
            <option value="Serviço">Serviço</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Situação RFB</label>
          <select name="situacaoRFB" value={form.situacaoRFB} onChange={handleChange} className={inp}>
            <option value="">Não informado</option>
            <option value="ATIVA">Ativa</option>
            <option value="BAIXADA">Baixada</option>
            <option value="INAPTA">Inapta</option>
            <option value="SUSPENSA">Suspensa</option>
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>CNAE</label>
        <input name="cnae" value={form.cnae} onChange={handleChange} placeholder="Ex: 1113-5/01" className={inp} />
      </div>

      <div>
        <label className={lbl}>Sindicato Vinculado *</label>
        <input
          type="text"
          value={filtroSindicato}
          onChange={(e) => setFiltroSindicato(e.target.value)}
          placeholder="Pesquisar sindicato..."
          className={`${inp} mb-1`}
        />
        <select name="sindicatoId" value={form.sindicatoId} onChange={handleChange} required className={inp}>
          <option value="">Selecione um sindicato...</option>
          {sindicatos
            .filter((s) => !filtroSindicato || s.nome.toLowerCase().includes(filtroSindicato.toLowerCase()))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.tipo})
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className={lbl}>Responsável da Empresa</label>
        <input
          value={filtroRep}
          onChange={(e) => setFiltroRep(e.target.value)}
          placeholder="Filtrar representantes..."
          className={`${inp} mb-1`}
        />
        <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className={inp}>
          <option value="">— Nenhum —</option>
          {repFiltrados.map((r) => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Não encontrou?{" "}
          <button type="button" onClick={() => setModalNovoRep(true)} className="text-blue-500 hover:underline">
            Cadastrar novo representante
          </button>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl}>Data de Sindicalização</label>
          <input type="date" name="dataSindicalizacao" value={form.dataSindicalizacao} onChange={handleChange} className={inp} />
        </div>
        <div>
          <label className={lbl}>Data de Desfiliação</label>
          <input type="date" name="dataVencimento" value={form.dataVencimento} onChange={handleChange} className={inp} />
        </div>
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
          {salvando ? "Salvando..." : inicial?.id ? "Salvar Alterações" : "Cadastrar Empresa"}
        </button>
      </div>
    </form>

    {modalNovoRep && (
      <Modal titulo="Novo Representante" onFechar={() => { setModalNovoRep(false); setNovoRepErro(""); setNovoRepForm({ nome: "", cpf: "", email: "", telefone: "", observacoes: "" }); }}>
        <form onSubmit={salvarNovoRepresentante} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input value={novoRepForm.nome} onChange={(e) => setNovoRepForm({ ...novoRepForm, nome: e.target.value })} required placeholder="Nome completo" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input value={novoRepForm.cpf} onChange={(e) => setNovoRepForm({ ...novoRepForm, cpf: e.target.value })} placeholder="000.000.000-00" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" value={novoRepForm.email} onChange={(e) => setNovoRepForm({ ...novoRepForm, email: e.target.value })} placeholder="email@exemplo.com" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input value={novoRepForm.telefone} onChange={(e) => setNovoRepForm({ ...novoRepForm, telefone: e.target.value })} placeholder="(92) 90000-0000" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={novoRepForm.observacoes} onChange={(e) => setNovoRepForm({ ...novoRepForm, observacoes: e.target.value })} rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          {novoRepErro && <p className="text-sm text-red-600 rounded-md bg-red-50 border border-red-200 px-3 py-2">{novoRepErro}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => { setModalNovoRep(false); setNovoRepErro(""); }} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={novoRepSalvando} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">{novoRepSalvando ? "Salvando..." : "Cadastrar"}</button>
          </div>
        </form>
      </Modal>
    )}
    </>
  );
}
