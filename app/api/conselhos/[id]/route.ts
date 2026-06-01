import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

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

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const conselho = await prisma.conselho.findUnique({
    where: { id: Number(id) },
    include: { empresas: { include: { empresa: true } } },
  });
  if (!conselho) return Response.json({ error: "Conselho não encontrado" }, { status: 404 });
  return Response.json(conselho);
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
  const resultado = conselhoSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, tipo, titular, suplente, titularId, suplenteId, telefone, email } = resultado.data;

  const existing = await prisma.conselho.findFirst({
    where: { nome, NOT: { id: Number(id) } },
  });
  if (existing) {
    return Response.json({ error: "Conselho com esse nome já cadastrado" }, { status: 409 });
  }

  const conselho = await prisma.conselho.update({
    where: { id: Number(id) },
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
  return Response.json(conselho);
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
  await prisma.conselho.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
