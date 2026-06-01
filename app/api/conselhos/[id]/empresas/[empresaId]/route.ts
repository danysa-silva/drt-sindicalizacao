import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

type Params = { params: Promise<{ id: string; empresaId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id, empresaId } = await params;
  await prisma.conselhoEmpresa.delete({
    where: {
      empresaId_conselhoId: { empresaId: Number(empresaId), conselhoId: Number(id) },
    },
  });
  return Response.json({ ok: true });
}
