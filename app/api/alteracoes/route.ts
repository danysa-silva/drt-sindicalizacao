import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (usuario.perfil !== "admin") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const acao = searchParams.get("acao");

  const desde = new Date();
  desde.setDate(desde.getDate() - 30);

  const alteracoes = await prisma.historicoAlteracao.findMany({
    where: {
      createdAt: { gte: desde },
      ...(acao && acao !== "todos" ? { acao } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return Response.json(alteracoes);
}

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json();
  await registrarAuditoria({
    entidadeNome: body.entidadeNome ?? "—",
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: body.acao,
    campo: body.campo ?? null,
    valorAnterior: body.valorAnterior ?? null,
    valorNovo: body.valorNovo ?? null,
  });

  return Response.json({ ok: true });
}
