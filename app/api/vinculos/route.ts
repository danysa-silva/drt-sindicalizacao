import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const busca = searchParams.get("busca")?.trim() ?? "";
  const tipo = searchParams.get("tipo") ?? "pessoa";

  if (busca.length < 2) {
    return Response.json({ error: "Informe ao menos 2 caracteres." }, { status: 400 });
  }

  if (tipo === "pessoa") {
    const resultados = await prisma.representante.findMany({
      where: { nome: { contains: busca, mode: "insensitive" } },
      include: {
        sindicatos: {
          include: { sindicato: { select: { id: true, nome: true, tipo: true } } },
          orderBy: { createdAt: "asc" },
        },
        conselhos: {
          include: { conselho: { select: { id: true, nome: true, tipo: true } } },
          orderBy: { createdAt: "asc" },
        },
        empresas: {
          where: { ativo: true },
          include: { empresa: { select: { id: true, razaoSocial: true, cnpj: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { nome: "asc" },
    });
    return Response.json({ tipo, total: resultados.length, resultados });
  }

  if (tipo === "sindicato") {
    const resultados = await prisma.sindicato.findMany({
      where: { nome: { contains: busca, mode: "insensitive" } },
      include: {
        representantes: {
          include: { representante: { select: { id: true, nome: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { empresas: true } },
      },
      orderBy: { nome: "asc" },
    });
    return Response.json({ tipo, total: resultados.length, resultados });
  }

  if (tipo === "conselho") {
    const resultados = await prisma.conselho.findMany({
      where: { nome: { contains: busca, mode: "insensitive" } },
      include: {
        representantes: {
          include: { representante: { select: { id: true, nome: true } } },
          orderBy: { createdAt: "asc" },
        },
        empresas: {
          include: { empresa: { select: { id: true, razaoSocial: true, cnpj: true } } },
        },
      },
      orderBy: { nome: "asc" },
    });
    return Response.json({ tipo, total: resultados.length, resultados });
  }

  if (tipo === "empresa") {
    const termoNumerico = busca.replace(/\D/g, "");
    const resultados = await prisma.empresa.findMany({
      where: {
        OR: [
          { razaoSocial: { contains: busca, mode: "insensitive" } },
          ...(termoNumerico.length >= 4 ? [{ cnpj: { contains: termoNumerico } }] : []),
        ],
      },
      include: {
        sindicato: { select: { id: true, nome: true, tipo: true } },
        representantes: {
          where: { ativo: true },
          include: { representante: { select: { id: true, nome: true } } },
        },
      },
      orderBy: { razaoSocial: "asc" },
      take: 50,
    });
    return Response.json({ tipo, total: resultados.length, resultados });
  }

  return Response.json({ error: "Tipo de busca inválido." }, { status: 400 });
}
