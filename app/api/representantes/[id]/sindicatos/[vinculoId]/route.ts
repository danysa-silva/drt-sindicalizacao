import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

type Params = { params: Promise<{ id: string; vinculoId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { vinculoId } = await params;
  const vinculo = await prisma.representanteSindicato.findUnique({
    where: { id: Number(vinculoId) },
  });
  if (!vinculo) {
    return Response.json({ error: "Vínculo não encontrado" }, { status: 404 });
  }

  await prisma.representanteSindicato.delete({ where: { id: Number(vinculoId) } });
  return Response.json({ ok: true });
}
