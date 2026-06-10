import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

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

const includePresidentes = {
  _count: { select: { empresas: true } },
  empresas: { include: { empresa: { select: { id: true, razaoSocial: true, cnpj: true } } } },
  titularRef:  { include: { sindicato: { select: { id: true, nome: true } } } },
  suplenteRef: { include: { sindicato: { select: { id: true, nome: true } } } },
  representantes: {
    include: { representante: { select: { id: true, nome: true } } },
    orderBy: { createdAt: "desc" as const },
  },
};

export async function GET() {
  const conselhos = await prisma.conselho.findMany({
    orderBy: { nome: "asc" },
    include: includePresidentes,
  });
  return Response.json(conselhos);
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
  const resultado = conselhoSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, tipo, titular, suplente, titularId, suplenteId, telefone, email } = resultado.data;

  const existing = await prisma.conselho.findUnique({ where: { nome } });
  if (existing) {
    return Response.json({ error: "Conselho com esse nome já cadastrado" }, { status: 409 });
  }

  const conselho = await prisma.conselho.create({
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
    include: includePresidentes,
  });

  return Response.json(conselho, { status: 201 });
}
