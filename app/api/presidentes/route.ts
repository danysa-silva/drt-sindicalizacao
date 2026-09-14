import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";

async function GET_handler(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const presidentes = await prisma.presidenteSindicato.findMany({
    orderBy: [{ sindicato: { nome: "asc" } }, { nome: "asc" }],
    include: { sindicato: { select: { id: true, nome: true } } },
  });
  return Response.json(presidentes);
}

export const GET = withErrorHandling(GET_handler);
