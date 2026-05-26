import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
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
