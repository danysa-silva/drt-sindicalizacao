import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
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
