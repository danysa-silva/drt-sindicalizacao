import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string }> };

const sindicatoSchema = z.object({
  nome: z
    .string({ error: "Nome do sindicato é obrigatório" })
    .trim()
    .min(1, { message: "Nome do sindicato não pode ser vazio" }),
  tipo: z.string().optional().nullable().transform((v) => (v == null || v === "" ? "externo" : v)),
  cnpj: z
    .string()
    .nullish()
    .transform((v) => (v ? v.replace(/\D/g, "") : null))
    .refine((v) => v === null || v === undefined || v.length === 14, {
      message: "CNPJ deve ter 14 dígitos",
    }),
  validadeMandato: z
    .string()
    .nullish()
    .refine(
      (v) => v == null || v === "" || !isNaN(new Date(v).getTime()),
      { message: "Data de validade do mandato inválida" }
    )
    .transform((v) => (v === "" || v == null ? null : v)),
  afinidadeFieam: z.string().nullish(),
  observacoes: z.string().nullish(),
});

async function GET_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const sindicato = await prisma.sindicato.findUnique({
    where: { id: idNum },
    include: { presidentes: { orderBy: { createdAt: "desc" } }, empresas: true },
  });
  if (!sindicato) return Response.json({ error: "Sindicato não encontrado" }, { status: 404 });
  return Response.json(sindicato);
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
  const resultado = sindicatoSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, tipo, cnpj, afinidadeFieam, validadeMandato, observacoes } = resultado.data;

  const existing = await prisma.sindicato.findFirst({
    where: { nome, NOT: { id: idNum } },
  });
  if (existing) {
    return Response.json({ error: "Sindicato com esse nome já cadastrado" }, { status: 409 });
  }

  const sindicato = await prisma.sindicato.update({
    where: { id: idNum },
    data: {
      nome,
      tipo,
      cnpj: cnpj ?? null,
      afinidadeFieam: afinidadeFieam ?? null,
      validadeMandato: validadeMandato ?? null,
      observacoes: observacoes ?? null,
    },
  });

  await registrarAuditoria({
    entidadeNome: sindicato.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "edicao",
    campo: "Sindicato",
    valorAnterior: null,
    valorNovo: null,
  });

  return Response.json(sindicato);
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
  const sindicato = await prisma.sindicato.findUnique({ where: { id: idNum } });
  if (!sindicato) {
    return Response.json({ error: "Sindicato não encontrado" }, { status: 404 });
  }

  await prisma.sindicato.delete({ where: { id: idNum } });

  await registrarAuditoria({
    entidadeNome: sindicato.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "exclusao",
    campo: "Sindicato",
    valorAnterior: null,
    valorNovo: null,
  });

  return Response.json({ ok: true });
}

export const GET = withErrorHandling(GET_handler);
export const PUT = withErrorHandling(PUT_handler);
export const DELETE = withErrorHandling(DELETE_handler);
