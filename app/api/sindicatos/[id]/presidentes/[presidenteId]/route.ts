import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

type Params = { params: Promise<{ id: string; presidenteId: string }> };

const presidenteSchema = z.object({
  nome: z
    .string({ error: "Nome do presidente é obrigatório" })
    .trim()
    .min(1, { message: "Nome do presidente não pode ser vazio" }),
  cargo: z.string().nullish(),
  email: z
    .string()
    .nullish()
    .refine(
      (v) => v == null || v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      { message: "E-mail inválido" }
    )
    .transform((v) => (v === "" ? null : v ?? null)),
  telefone: z.string().nullish(),
  dataInicio: z
    .string()
    .nullish()
    .refine(
      (v) => v == null || v === "" || !isNaN(new Date(v).getTime()),
      { message: "Data de início inválida" }
    )
    .transform((v) => (v === "" || v == null ? null : new Date(v))),
  dataFim: z
    .string()
    .nullish()
    .refine(
      (v) => v == null || v === "" || !isNaN(new Date(v).getTime()),
      { message: "Data de fim inválida" }
    )
    .transform((v) => (v === "" || v == null ? null : new Date(v))),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { presidenteId } = await params;
  const body = await request.json();
  const resultado = presidenteSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, cargo, email, telefone, dataInicio, dataFim } = resultado.data;

  const presidente = await prisma.presidenteSindicato.update({
    where: { id: Number(presidenteId) },
    data: {
      nome,
      cargo: cargo ?? null,
      email,
      telefone: telefone ?? null,
      dataInicio,
      dataFim,
    },
  });
  return Response.json(presidente);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { presidenteId } = await params;
  await prisma.presidenteSindicato.delete({ where: { id: Number(presidenteId) } });
  return Response.json({ ok: true });
}
