import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const conselhos = await prisma.conselho.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { empresas: true } },
      empresas: { include: { empresa: { select: { id: true, razaoSocial: true, cnpj: true } } } },
    },
  });
  return Response.json(conselhos);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nome, tipo } = body;

  if (!nome) {
    return Response.json({ error: "Nome do conselho é obrigatório" }, { status: 400 });
  }

  const existing = await prisma.conselho.findUnique({ where: { nome } });
  if (existing) {
    return Response.json({ error: "Conselho com esse nome já cadastrado" }, { status: 409 });
  }

  const conselho = await prisma.conselho.create({
    data: { nome, tipo: tipo ?? "conselho" },
  });

  return Response.json(conselho, { status: 201 });
}
