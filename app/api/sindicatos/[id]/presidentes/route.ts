import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const presidentes = await prisma.presidenteSindicato.findMany({
    where: { sindicatoId: Number(id) },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(presidentes);
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
  const { nome, cargo, email, telefone, dataInicio, dataFim } = body;

  if (!nome) {
    return Response.json({ error: "Nome do presidente é obrigatório" }, { status: 400 });
  }

  const presidente = await prisma.presidenteSindicato.create({
    data: {
      sindicatoId: Number(id),
      nome,
      cargo: cargo ?? null,
      email: email ?? null,
      telefone: telefone ?? null,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFim: dataFim ? new Date(dataFim) : null,
    },
  });

  return Response.json(presidente, { status: 201 });
}
