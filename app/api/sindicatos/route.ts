import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

const sindicatoSchema = z.object({
  nome: z
    .string({ error: "Nome do sindicato é obrigatório" })
    .trim()
    .min(1, { message: "Nome do sindicato não pode ser vazio" }),
  tipo: z.string().optional().nullable().transform((v) => (v == null || v === "" ? "patronal" : v)),
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

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const sindicatos = await prisma.sindicato.findMany({
    orderBy: { nome: "asc" },
    include: {
      representantes: {
        include: { representante: { select: { id: true, nome: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { empresas: true } },
    },
  });
  return Response.json(sindicatos);
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
  const resultado = sindicatoSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, tipo, cnpj, afinidadeFieam, validadeMandato, observacoes } = resultado.data;

  const existing = await prisma.sindicato.findUnique({ where: { nome } });
  if (existing) {
    return Response.json({ error: "Sindicato com esse nome já cadastrado" }, { status: 409 });
  }

  const sindicato = await prisma.sindicato.create({
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
    acao: "criacao",
    campo: "Sindicato",
    valorAnterior: null,
    valorNovo: null,
  });

  return Response.json(sindicato, { status: 201 });
}
