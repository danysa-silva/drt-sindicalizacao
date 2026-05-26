import { prisma } from "./prisma";

type RegistroParams = {
  empresaId: number | null;
  empresaNome: string;
  usuarioId: number | null;
  usuarioNome: string;
  acao: "criacao" | "edicao" | "exclusao";
  campo?: string;
  valorAnterior?: string | null;
  valorNovo?: string | null;
};

export async function registrarAuditoria(params: RegistroParams) {
  await prisma.historicoAlteracao.create({ data: params });
}

const LABELS: Record<string, string> = {
  razaoSocial: "Razão Social",
  cnpj: "CNPJ",
  cnae: "CNAE",
  ramoAtividade: "Ramo de Atividade",
  perfil: "Perfil",
  situacaoRFB: "Situação RFB",
  afinidade: "Afinidade",
  sindicatoId: "Sindicato",
  dataSindicalizacao: "Data Sindicalização",
  dataVencimento: "Data Vencimento",
  status: "Status",
  observacoes: "Observações",
};

type EmpresaSnapshot = Record<string, string | number | null | undefined>;

export async function registrarEdicao(
  empresaId: number,
  empresaNome: string,
  usuarioId: number | null,
  usuarioNome: string,
  antes: EmpresaSnapshot,
  depois: EmpresaSnapshot
) {
  const campos = Object.keys(LABELS);
  for (const campo of campos) {
    const vAntes = String(antes[campo] ?? "");
    const vDepois = String(depois[campo] ?? "");
    if (vAntes !== vDepois) {
      await registrarAuditoria({
        empresaId,
        empresaNome,
        usuarioId,
        usuarioNome,
        acao: "edicao",
        campo: LABELS[campo] ?? campo,
        valorAnterior: vAntes || null,
        valorNovo: vDepois || null,
      });
    }
  }
}
