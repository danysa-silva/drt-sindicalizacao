import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

const includePresidentes = {
  _count: { select: { empresas: true } },
  empresas: { include: { empresa: { select: { id: true, razaoSocial: true, cnpj: true } } } },
  titularRef:  { include: { sindicato: { select: { id: true, nome: true } } } },
  suplenteRef: { include: { sindicato: { select: { id: true, nome: true } } } },
};

export async function GET() {
  const conselhos = await prisma.conselho.findMany({
    orderBy: { nome: "asc" },
    include: includePresidentes,
  });
  return Response.json(conselhos);
}

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const { nome, tipo, titular, suplente, titularId, suplenteId, telefone, email } = body;

  if (!nome) {
    return Response.json({ error: "Nome do conselho é obrigatório" }, { status: 400 });
  }

  const existing = await prisma.conselho.findUnique({ where: { nome } });
  if (existing) {
    return Response.json({ error: "Conselho com esse nome já cadastrado" }, { status: 409 });
  }

  const conselho = await prisma.conselho.create({
    data: {
      nome, tipo: tipo ?? "conselho",
      titular: titular ?? null, suplente: suplente ?? null,
      titularId: titularId ? Number(titularId) : null,
      suplenteId: suplenteId ? Number(suplenteId) : null,
      telefone: telefone ?? null, email: email ?? null,
    },
    include: includePresidentes,
  });

  return Response.json(conselho, { status: 201 });
}
