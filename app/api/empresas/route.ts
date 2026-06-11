import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

const empresaSchema = z.object({
  cnpj: z
    .string({ error: "CNPJ é obrigatório" })
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 14, { message: "CNPJ deve ter 14 dígitos" }),
  razaoSocial: z
    .string({ error: "Razão social é obrigatória" })
    .min(1, { message: "Razão social não pode ser vazia" }),
  sindicatoId: z.coerce
    .number({ error: "sindicatoId deve ser um número válido" })
    .int()
    .positive({ message: "sindicatoId deve ser um número válido" }),
  dataSindicalizacao: z
    .string({ error: "Data de sindicalização é obrigatória" })
    .refine((v) => !isNaN(new Date(v).getTime()), { message: "Data de sindicalização inválida" }),
  dataVencimento: z
    .string({ error: "Data de vencimento é obrigatória" })
    .refine((v) => !isNaN(new Date(v).getTime()), { message: "Data de vencimento inválida" }),
  tipoUnidade: z.string().nullish(),
  cnae: z.string().nullish(),
  ramoAtividade: z.string().nullish(),
  perfil: z.string().nullish(),
  situacaoRFB: z.string().nullish(),
  afinidade: z.string().nullish(),
  status: z.string().optional().default("ativo"),
  observacoes: z.string().nullish(),
});

export async function GET() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { razaoSocial: "asc" },
    include: {
      sindicato: true,
      representantes: {
        where: { ativo: true },
        include: { representante: { select: { id: true, nome: true } } },
        orderBy: { createdAt: "desc" as const },
      },
    },
  });
  return Response.json(empresas);
}

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const resultado = empresaSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const {
    cnpj, tipoUnidade, razaoSocial, sindicatoId, cnae, ramoAtividade, perfil,
    situacaoRFB, afinidade, dataSindicalizacao, dataVencimento, status, observacoes,
  } = resultado.data;

  const existing = await prisma.empresa.findUnique({ where: { cnpj } });
  if (existing) {
    return Response.json({ error: "CNPJ já cadastrado" }, { status: 409 });
  }

  const empresa = await prisma.empresa.create({
    data: {
      cnpj,
      tipoUnidade: tipoUnidade ?? null,
      razaoSocial,
      cnae: cnae ?? null,
      ramoAtividade: ramoAtividade ?? null,
      perfil: perfil ?? null,
      situacaoRFB: situacaoRFB ?? null,
      afinidade: afinidade ?? null,
      sindicatoId,
      dataSindicalizacao: new Date(dataSindicalizacao),
      dataVencimento: new Date(dataVencimento),
      status,
      observacoes: observacoes ?? null,
    },
    include: { sindicato: true },
  });

  await registrarAuditoria({
    empresaId: empresa.id, entidadeNome: empresa.razaoSocial,
    usuarioId: usuario.id, usuarioNome: usuario.nome,
    acao: "criacao",
  });

  return Response.json(empresa, { status: 201 });
}
