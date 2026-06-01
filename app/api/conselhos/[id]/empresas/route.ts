import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const { empresaId } = await request.json();

  if (!empresaId) {
    return Response.json({ error: "empresaId é obrigatório" }, { status: 400 });
  }

  const existing = await prisma.conselhoEmpresa.findUnique({
    where: { empresaId_conselhoId: { empresaId: Number(empresaId), conselhoId: Number(id) } },
  });
  if (existing) {
    return Response.json({ error: "Empresa já participa deste conselho" }, { status: 409 });
  }

  const entry = await prisma.conselhoEmpresa.create({
    data: { empresaId: Number(empresaId), conselhoId: Number(id) },
    include: { empresa: true },
  });
  return Response.json(entry, { status: 201 });
}
