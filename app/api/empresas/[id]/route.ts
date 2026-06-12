import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria, registrarEdicao } from "@/lib/auditoria";

type Params = { params: Promise<{ id: string }> };

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
    .string()
    .nullish()
    .refine((v) => !v || !isNaN(new Date(v).getTime()), { message: "Data de sindicalização inválida" })
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  dataVencimento: z
    .string()
    .nullish()
    .refine((v) => !v || !isNaN(new Date(v).getTime()), { message: "Data de desfiliação inválida" })
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  tipoUnidade: z.string().nullish(),
  cnae: z.string().nullish(),
  ramoAtividade: z.string().nullish(),
  perfil: z.string().nullish(),
  situacaoRFB: z.string().nullish(),
  afinidade: z.string().nullish(),
  status: z.string().optional().default("ativo"),
  observacoes: z.string().nullish(),
});

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({
    where: { id: Number(id) },
    include: { sindicato: true, conselhos: { include: { conselho: true } } },
  });
  if (!empresa) return Response.json({ error: "Empresa não encontrada" }, { status: 404 });
  return Response.json(empresa);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
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

  const antes = await prisma.empresa.findUnique({ where: { id: Number(id) } });
  if (!antes) return Response.json({ error: "Empresa não encontrada" }, { status: 404 });

  const existing = await prisma.empresa.findFirst({
    where: { cnpj, NOT: { id: Number(id) } },
  });
  if (existing) {
    return Response.json({ error: "CNPJ já cadastrado em outra empresa" }, { status: 409 });
  }

  const empresa = await prisma.empresa.update({
    where: { id: Number(id) },
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
      dataSindicalizacao: dataSindicalizacao ? new Date(dataSindicalizacao) : antes.dataSindicalizacao,
      dataVencimento: dataVencimento ? new Date(dataVencimento) : antes.dataVencimento,
      status,
      observacoes: observacoes ?? null,
    },
    include: { sindicato: true },
  });

  await registrarEdicao(
    empresa.id, empresa.razaoSocial,
    usuario.id, usuario.nome,
    {
      cnpj: antes.cnpj, razaoSocial: antes.razaoSocial, cnae: antes.cnae,
      ramoAtividade: antes.ramoAtividade, perfil: antes.perfil, situacaoRFB: antes.situacaoRFB,
      afinidade: antes.afinidade, sindicatoId: antes.sindicatoId,
      dataSindicalizacao: antes.dataSindicalizacao.toISOString().split("T")[0],
      dataVencimento: antes.dataVencimento.toISOString().split("T")[0],
      status: antes.status, observacoes: antes.observacoes,
    },
    { cnpj, razaoSocial, cnae, ramoAtividade, perfil, situacaoRFB, afinidade, sindicatoId, dataSindicalizacao, dataVencimento, status, observacoes }
  );

  return Response.json(empresa);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({ where: { id: Number(id) } });
  if (!empresa) return Response.json({ error: "Empresa não encontrada" }, { status: 404 });

  await registrarAuditoria({
    empresaId: null, entidadeNome: empresa.razaoSocial,
    usuarioId: usuario.id, usuarioNome: usuario.nome,
    acao: "exclusao",
  });

  await prisma.empresa.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
