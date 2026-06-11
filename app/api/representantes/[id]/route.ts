import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

type Params = { params: Promise<{ id: string }> };

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

export async function GET(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const representante = await prisma.representante.findUnique({
    where: { id: Number(id) },
    include: {
      sindicatos: {
        include: { sindicato: { select: { id: true, nome: true, tipo: true } } },
        orderBy: { createdAt: "desc" },
      },
      conselhos: {
        include: { conselho: { select: { id: true, nome: true, tipo: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!representante) {
    return Response.json({ error: "Representante não encontrado" }, { status: 404 });
  }

  return Response.json(representante);
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
  const resultado = representanteSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, cpf, email, telefone, observacoes } = resultado.data;

  const atual = await prisma.representante.findUnique({ where: { id: Number(id) } });
  if (!atual) {
    return Response.json({ error: "Representante não encontrado" }, { status: 404 });
  }

  if (cpf) {
    const existente = await prisma.representante.findFirst({
      where: { cpf, NOT: { id: Number(id) } },
    });
    if (existente) {
      return Response.json({ error: "CPF já cadastrado em outro representante" }, { status: 409 });
    }
  }

  const representante = await prisma.representante.update({
    where: { id: Number(id) },
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
    acao: "edicao",
    campo: "Representante",
    valorAnterior: null,
    valorNovo: null,
  });

  return Response.json(representante);
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
  const representante = await prisma.representante.findUnique({ where: { id: Number(id) } });
  if (!representante) {
    return Response.json({ error: "Representante não encontrado" }, { status: 404 });
  }

  await prisma.representante.delete({ where: { id: Number(id) } });

  await registrarAuditoria({
    entidadeNome: representante.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "exclusao",
    campo: "Representante",
    valorAnterior: null,
    valorNovo: null,
  });

  return Response.json({ ok: true });
}
