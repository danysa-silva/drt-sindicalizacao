import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario || usuario.perfil !== "admin") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, email: true, nome: true, perfil: true, createdAt: true },
  });

  return Response.json(usuarios);
}
