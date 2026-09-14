import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { withErrorHandling } from "@/lib/api-handler";

const representanteSchema = z.object({
  nome: z
    .string({ error: "Nome é obrigatório" })
    .trim()
    .min(1, { message: "Nome não pode ser vazio" }),
  cpf: z
    .string()
    .nullish()
    .transform((v) => (v ? v.replace(/\D/g, "") : null))
    .refine((v) => v === null || v === undefined || v.length === 11, {
      message: "CPF deve ter 11 dígitos",
    }),
  email: z
    .string()
    .nullish()
    .refine(
      (v) => v == null || v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      { message: "E-mail inválido" }
    )
    .transform((v) => (v === "" ? null : v ?? null)),
  telefone: z.string().nullish(),
  observacoes: z.string().nullish(),
});

async function GET_handler(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const representantes = await prisma.representante.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { sindicatos: true, conselhos: true, empresas: true } },
    },
  });

  return Response.json(representantes);
}

async function DELETE_handler(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (usuario.perfil !== "admin") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return Response.json({ error: "Nenhum ID informado" }, { status: 400 });

  const { count } = await prisma.representante.deleteMany({ where: { id: { in: ids } } });
  return Response.json({ excluidos: count });
}

async function POST_handler(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const resultado = representanteSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, cpf, email, telefone, observacoes } = resultado.data;

  if (cpf) {
    const existente = await prisma.representante.findUnique({ where: { cpf } });
    if (existente) {
      return Response.json({ error: "CPF já cadastrado" }, { status: 409 });
    }
  }

  const representante = await prisma.representante.create({
    data: {
      nome,
      cpf: cpf ?? null,
      email,
      telefone: telefone ?? null,
      observacoes: observacoes ?? null,
    },
  });

  await registrarAuditoria({
    entidadeNome: representante.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "criacao",
    campo: "Representante",
    valorAnterior: null,
    valorNovo: null,
  });

  return Response.json(representante, { status: 201 });
}

export const GET = withErrorHandling(GET_handler);
export const DELETE = withErrorHandling(DELETE_handler);
export const POST = withErrorHandling(POST_handler);
