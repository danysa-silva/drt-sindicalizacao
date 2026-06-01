import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

export async function GET() {
  const sindicatos = await prisma.sindicato.findMany({
    orderBy: { nome: "asc" },
    include: {
      presidentes: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { empresas: true } },
    },
  });
  return Response.json(sindicatos);
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
  const { nome, tipo, cnpj, afinidadeFieam, validadeMandato, observacoes } = body;

  if (!nome) {
    return Response.json({ error: "Nome do sindicato é obrigatório" }, { status: 400 });
  }

  const existing = await prisma.sindicato.findUnique({ where: { nome } });
  if (existing) {
    return Response.json({ error: "Sindicato com esse nome já cadastrado" }, { status: 409 });
  }

  const sindicato = await prisma.sindicato.create({
    data: {
      nome,
      tipo: tipo ?? "patronal",
      cnpj: cnpj ? cnpj.replace(/\D/g, "") : null,
      afinidadeFieam: afinidadeFieam ?? null,
      validadeMandato: validadeMandato ?? null,
      observacoes: observacoes ?? null,
    },
  });

  return Response.json(sindicato, { status: 201 });
}
