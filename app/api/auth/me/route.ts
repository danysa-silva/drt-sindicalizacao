import { NextRequest } from "next/server";
import { getUsuarioFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const payload = await getUsuarioFromRequest(request);
  if (!payload) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Busca perfil atualizado do banco (pode ter sido promovido a admin)
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, nome: true, perfil: true },
  });

  if (!usuario) {
    return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  return Response.json(usuario);
}
