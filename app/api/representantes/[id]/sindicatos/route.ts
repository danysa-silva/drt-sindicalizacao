import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

type Params = { params: Promise<{ id: string }> };

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

const vinculoSindicatoSchema = z.object({
  sindicatoId: z.coerce
    .number({ error: "sindicatoId deve ser um número válido" })
    .int()
    .positive({ message: "sindicatoId deve ser um número válido" }),
  papel: z
    .string({ error: "Papel é obrigatório" })
    .refine((v) => PAPEIS_SINDICATO.includes(v), {
      message: "Papel inválido. Use: presidente, vice-presidente, diretor ou outro",
    }),
  dataInicio: z
    .string()
    .nullish()
    .refine((v) => v == null || v === "" || !isNaN(new Date(v).getTime()), {
      message: "Data de início inválida",
    })
    .transform((v) => (v === "" || v == null ? null : new Date(v))),
  dataFim: z
    .string()
    .nullish()
    .refine((v) => v == null || v === "" || !isNaN(new Date(v).getTime()), {
      message: "Data de fim inválida",
    })
    .transform((v) => (v === "" || v == null ? null : new Date(v))),
});

export async function GET(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const representante = await prisma.representante.findUnique({ where: { id: Number(id) } });
  if (!representante) {
    return Response.json({ error: "Representante não encontrado" }, { status: 404 });
  }

  const vinculos = await prisma.representanteSindicato.findMany({
    where: { representanteId: Number(id) },
    include: { sindicato: { select: { id: true, nome: true, tipo: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(vinculos);
}

export async function POST(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const resultado = vinculoSindicatoSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { sindicatoId, papel, dataInicio, dataFim } = resultado.data;

  const representante = await prisma.representante.findUnique({ where: { id: Number(id) } });
  if (!representante) {
    return Response.json({ error: "Representante não encontrado" }, { status: 404 });
  }

  const sindicato = await prisma.sindicato.findUnique({ where: { id: sindicatoId } });
  if (!sindicato) {
    return Response.json({ error: "Sindicato não encontrado" }, { status: 404 });
  }

  const existente = await prisma.representanteSindicato.findFirst({
    where: {
      representanteId: Number(id),
      sindicatoId,
      papel,
      dataInicio: dataInicio ?? null,
    },
  });
  if (existente) {
    return Response.json({ error: "Vínculo já existe com esse papel e data de início" }, { status: 409 });
  }

  const vinculo = await prisma.representanteSindicato.create({
    data: {
      representanteId: Number(id),
      sindicatoId,
      papel,
      dataInicio: dataInicio ?? null,
      dataFim: dataFim ?? null,
    },
    include: { sindicato: { select: { id: true, nome: true, tipo: true } } },
  });

  await registrarAuditoria({
    entidadeNome: representante.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "vinculo_adicionado",
    campo: "Vínculo Representante → Sindicato",
    valorAnterior: null,
    valorNovo: `${sindicato.nome} / ${papel}`,
  });

  return Response.json(vinculo, { status: 201 });
}
