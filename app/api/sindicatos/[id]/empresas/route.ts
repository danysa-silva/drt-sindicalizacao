import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string }> };

async function GET_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const empresas = await prisma.empresa.findMany({
    where: { sindicatoId: idNum },
    orderBy: { razaoSocial: "asc" },
    select: {
      id: true,
      cnpj: true,
      razaoSocial: true,
      cnae: true,
      perfil: true,
      situacaoRFB: true,
      afinidade: true,
      status: true,
    },
  });
  return Response.json(empresas);
}

export const GET = withErrorHandling(GET_handler);
