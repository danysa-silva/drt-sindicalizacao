import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const sindicato = await prisma.sindicato.findUnique({
    where: { id: Number(id) },
    include: { presidentes: { orderBy: { createdAt: "desc" } }, empresas: true },
  });
  if (!sindicato) return Response.json({ error: "Sindicato não encontrado" }, { status: 404 });
  return Response.json(sindicato);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { nome, tipo, cnpj, afinidadeFieam, validadeMandato, observacoes } = body;

  const existing = await prisma.sindicato.findFirst({
    where: { nome, NOT: { id: Number(id) } },
  });
  if (existing) {
    return Response.json({ error: "Sindicato com esse nome já cadastrado" }, { status: 409 });
  }

  const sindicato = await prisma.sindicato.update({
    where: { id: Number(id) },
    data: {
      nome,
      tipo,
      cnpj: cnpj ? cnpj.replace(/\D/g, "") : null,
      afinidadeFieam: afinidadeFieam ?? null,
      validadeMandato: validadeMandato ?? null,
      observacoes: observacoes ?? null,
    },
  });
  return Response.json(sindicato);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.sindicato.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
