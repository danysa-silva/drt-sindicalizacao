import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; empresaId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, empresaId } = await params;
  await prisma.conselhoEmpresa.delete({
    where: {
      empresaId_conselhoId: { empresaId: Number(empresaId), conselhoId: Number(id) },
    },
  });
  return Response.json({ ok: true });
}
