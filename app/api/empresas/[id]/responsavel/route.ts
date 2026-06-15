import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (!podeAlterar(usuario.perfil)) return Response.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const empresaId = Number(id);
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
