import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string }> };

async function PUT_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (usuario.perfil?.trim().toLowerCase() !== "admin") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const { perfil, status } = await request.json();

  if (perfil === undefined && status === undefined) {
    return Response.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const data: { perfil?: string; status?: string } = {};

  if (perfil !== undefined) {
    if (perfil !== "admin" && perfil !== "editor" && perfil !== "visualizador") {
      return Response.json({ error: "Perfil inválido" }, { status: 400 });
    }
    data.perfil = perfil;
  }

  if (status !== undefined) {
    if (status !== "aprovado" && status !== "pendente" && status !== "rejeitado") {
      return Response.json({ error: "Status inválido" }, { status: 400 });
    }
    if (idNum === usuario.id && status !== "aprovado") {
      return Response.json({ error: "Você não pode alterar seu próprio status" }, { status: 400 });
    }
    data.status = status;
  }

  const atualizado = await prisma.usuario.update({
    where: { id: idNum },
    data,
    select: { id: true, email: true, nome: true, perfil: true, status: true },
  });

  return Response.json(atualizado);
}

export const PUT = withErrorHandling(PUT_handler);
