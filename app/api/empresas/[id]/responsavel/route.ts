import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string }> };

async function PUT_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (!podeAlterar(usuario.perfil)) return Response.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const empresaId = idNum;
  const body = await request.json();
  const representanteId: number | null = body.representanteId ? Number(body.representanteId) : null;

  await prisma.representanteEmpresa.deleteMany({
    where: { empresaId, tipoRelacao: "responsavel" },
  });

  if (representanteId) {
    const representante = await prisma.representante.findUnique({ where: { id: representanteId } });
    if (!representante) return Response.json({ error: "Representante não encontrado" }, { status: 404 });
    await prisma.representanteEmpresa.create({
      data: { representanteId, empresaId, tipoRelacao: "responsavel" },
    });
  }

  return Response.json({ ok: true });
}

export const PUT = withErrorHandling(PUT_handler);
