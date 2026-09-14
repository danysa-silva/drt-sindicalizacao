import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string; empresaId: string }> };

async function DELETE_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id, empresaId } = await params;
  const conselhoIdNum = parseId(id);
  const empresaIdNum = parseId(empresaId);
  if (conselhoIdNum === null || empresaIdNum === null) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  await prisma.conselhoEmpresa.delete({
    where: {
      empresaId_conselhoId: { empresaId: empresaIdNum, conselhoId: conselhoIdNum },
    },
  });
  return Response.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETE_handler);
