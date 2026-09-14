import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string }> };

const conselhoSchema = z.object({
  nome: z
    .string({ error: "Nome do conselho é obrigatório" })
    .trim()
    .min(1, { message: "Nome do conselho não pode ser vazio" }),
  tipo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? "conselho" : v)),
  titular: z.string().nullish(),
  suplente: z.string().nullish(),
  titularId: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number({ error: "titularId deve ser um número válido" }).int().positive({ message: "titularId deve ser um número válido" }).nullable()
  ),
  suplenteId: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number({ error: "suplenteId deve ser um número válido" }).int().positive({ message: "suplenteId deve ser um número válido" }).nullable()
  ),
  telefone: z.string().nullish(),
  email: z
    .string()
    .nullish()
    .refine(
      (v) => v == null || v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      { message: "E-mail inválido" }
    )
    .transform((v) => (v === "" ? null : v ?? null)),
});

async function GET_handler(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const idNum = parseId(id);
  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const conselho = await prisma.conselho.findUnique({
    where: { id: idNum },
    include: { empresas: { include: { empresa: true } } },
  });
  if (!conselho) return Response.json({ error: "Conselho não encontrado" }, { status: 404 });
  return Response.json(conselho);
}

async function PUT_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const body = await request.json();
  const resultado = conselhoSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, tipo, titular, suplente, titularId, suplenteId, telefone, email } = resultado.data;

  const existing = await prisma.conselho.findFirst({
    where: { nome, NOT: { id: idNum } },
  });
  if (existing) {
    return Response.json({ error: "Conselho com esse nome já cadastrado" }, { status: 409 });
  }

  const conselho = await prisma.conselho.update({
    where: { id: idNum },
    data: {
      nome,
      tipo,
      titular: titular ?? null,
      suplente: suplente ?? null,
      titularId: titularId ?? null,
      suplenteId: suplenteId ?? null,
      telefone: telefone ?? null,
      email,
    },
  });

  await registrarAuditoria({
    entidadeNome: conselho.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "edicao",
    campo: "Conselho",
    valorAnterior: null,
    valorNovo: null,
  });

  return Response.json(conselho);
}

async function DELETE_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const conselho = await prisma.conselho.findUnique({ where: { id: idNum } });
  if (!conselho) {
    return Response.json({ error: "Conselho não encontrado" }, { status: 404 });
  }

  await prisma.conselho.delete({ where: { id: idNum } });

  await registrarAuditoria({
    entidadeNome: conselho.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "exclusao",
    campo: "Conselho",
    valorAnterior: null,
    valorNovo: null,
  });

  return Response.json({ ok: true });
}

export const GET = withErrorHandling(GET_handler);
export const PUT = withErrorHandling(PUT_handler);
export const DELETE = withErrorHandling(DELETE_handler);
