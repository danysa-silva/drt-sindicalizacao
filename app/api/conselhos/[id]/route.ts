import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const conselho = await prisma.conselho.findUnique({
    where: { id: Number(id) },
    include: { empresas: { include: { empresa: true } } },
  });
  if (!conselho) return Response.json({ error: "Conselho não encontrado" }, { status: 404 });
  return Response.json(conselho);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { nome, tipo } = body;

  const existing = await prisma.conselho.findFirst({
    where: { nome, NOT: { id: Number(id) } },
  });
  if (existing) {
    return Response.json({ error: "Conselho com esse nome já cadastrado" }, { status: 409 });
  }

  const conselho = await prisma.conselho.update({
    where: { id: Number(id) },
    data: { nome, tipo },
  });
  return Response.json(conselho);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.conselho.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
