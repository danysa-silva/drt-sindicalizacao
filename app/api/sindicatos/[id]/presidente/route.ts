import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string }> };

async function PUT_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const sindicatoId = idNum;
  const body = await request.json();
  const representanteId: number | null = body.representanteId ? Number(body.representanteId) : null;

  await prisma.representanteSindicato.deleteMany({
    where: { sindicatoId, papel: "presidente" },
  });

  if (representanteId) {
    const representante = await prisma.representante.findUnique({ where: { id: representanteId } });
    if (!representante) {
      return Response.json({ error: "Representante não encontrado" }, { status: 404 });
    }
    await prisma.representanteSindicato.create({
      data: { representanteId, sindicatoId, papel: "presidente" },
    });
  }

  return Response.json({ ok: true });
}

export const PUT = withErrorHandling(PUT_handler);
