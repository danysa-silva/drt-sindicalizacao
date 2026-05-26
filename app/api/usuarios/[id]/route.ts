import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario || usuario.perfil !== "admin") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const { perfil } = await request.json();

  if (perfil !== "admin" && perfil !== "visualizador") {
    return Response.json({ error: "Perfil inválido" }, { status: 400 });
  }

  const atualizado = await prisma.usuario.update({
    where: { id: Number(id) },
    data: { perfil },
    select: { id: true, email: true, nome: true, perfil: true },
  });

  return Response.json(atualizado);
}
