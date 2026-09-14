import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string }> };

async function POST_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const { empresaId } = await request.json();

  const empresaIdNum = parseId(String(empresaId ?? ""));
  if (empresaIdNum === null) {
    return Response.json({ error: "empresaId é obrigatório" }, { status: 400 });
  }

  const existing = await prisma.conselhoEmpresa.findUnique({
    where: { empresaId_conselhoId: { empresaId: empresaIdNum, conselhoId: idNum } },
  });
  if (existing) {
    return Response.json({ error: "Empresa já participa deste conselho" }, { status: 409 });
  }

  const entry = await prisma.conselhoEmpresa.create({
    data: { empresaId: empresaIdNum, conselhoId: idNum },
    include: { empresa: true },
  });
  return Response.json(entry, { status: 201 });
}

export const POST = withErrorHandling(POST_handler);
