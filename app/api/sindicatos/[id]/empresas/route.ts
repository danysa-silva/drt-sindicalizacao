import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const empresas = await prisma.empresa.findMany({
    where: { sindicatoId: Number(id) },
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
