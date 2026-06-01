import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

type Params = { params: Promise<{ id: string; presidenteId: string }> };

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
  const { nome, cargo, email, telefone, dataInicio, dataFim } = body;

  const presidente = await prisma.presidenteSindicato.update({
    where: { id: Number(presidenteId) },
    data: {
      nome,
      cargo: cargo ?? null,
      email: email ?? null,
      telefone: telefone ?? null,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFim: dataFim ? new Date(dataFim) : null,
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
