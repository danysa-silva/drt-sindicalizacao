import { prisma } from "./prisma";

type RegistroParams = {
  entidadeNome: string;
  empresaId?: number | null;
  usuarioId: number | null;
  usuarioNome: string;
  acao: string;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
};

export async function registrarAuditoria(params: RegistroParams) {
  await prisma.historicoAlteracao.create({
    data: {
      empresaId: params.empresaId ?? null,
      empresaNome: params.entidadeNome,
      usuarioId: params.usuarioId,
      usuarioNome: params.usuarioNome,
      acao: params.acao,
      campo: params.campo ?? null,
      valorAnterior: params.valorAnterior ?? null,
      valorNovo: params.valorNovo ?? null,
    },
  });
}

// ── empresas ──────────────────────────────────────────────────────────────────

const LABELS_EMPRESA: Record<string, string> = {
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

type Snapshot = Record<string, string | number | null | undefined>;

export async function registrarEdicaoEmpresa(
  empresaId: number,
  empresaNome: string,
  usuarioId: number | null,
  usuarioNome: string,
  antes: Snapshot,
  depois: Snapshot
) {
  for (const campo of Object.keys(LABELS_EMPRESA)) {
    const vAntes = String(antes[campo] ?? "");
    const vDepois = String(depois[campo] ?? "");
    if (vAntes !== vDepois) {
      await registrarAuditoria({
        entidadeNome: empresaNome,
        empresaId,
        usuarioId,
        usuarioNome,
        acao: "edicao",
        campo: LABELS_EMPRESA[campo] ?? campo,
        valorAnterior: vAntes || null,
        valorNovo: vDepois || null,
      });
    }
  }
}

// mantém compatibilidade com chamadas antigas
export const registrarEdicao = registrarEdicaoEmpresa;
