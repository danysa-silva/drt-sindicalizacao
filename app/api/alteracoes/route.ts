import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
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
