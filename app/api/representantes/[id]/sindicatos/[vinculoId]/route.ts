import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string; vinculoId: string }> };

async function DELETE_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { vinculoId } = await params;
  const vinculoIdNum = parseId(vinculoId);
  if (vinculoIdNum === null) {
    return Response.json({ error: "ID inválido" }, { status: 400 });
  }

  const vinculo = await prisma.representanteSindicato.findUnique({
    where: { id: vinculoIdNum },
    include: {
      representante: { select: { nome: true } },
      sindicato: { select: { nome: true } },
    },
  });
  if (!vinculo) {
    return Response.json({ error: "Vínculo não encontrado" }, { status: 404 });
  }

  await prisma.representanteSindicato.delete({ where: { id: vinculoIdNum } });

  await registrarAuditoria({
    entidadeNome: vinculo.representante.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "vinculo_removido",
    campo: "Vínculo Representante → Sindicato",
    valorAnterior: `${vinculo.sindicato.nome} / ${vinculo.papel}`,
    valorNovo: null,
  });

  return Response.json({ ok: true });
}

export const DELETE = withErrorHandling(DELETE_handler);
