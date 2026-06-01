import { prisma } from "@/lib/prisma";

export async function GET() {
  const presidentes = await prisma.presidenteSindicato.findMany({
    orderBy: [{ sindicato: { nome: "asc" } }, { nome: "asc" }],
    include: { sindicato: { select: { id: true, nome: true } } },
  });
  return Response.json(presidentes);
}
