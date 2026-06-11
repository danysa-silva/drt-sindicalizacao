import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

type Params = { params: Promise<{ id: string; vinculoId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { vinculoId } = await params;
  const vinculo = await prisma.representanteConselho.findUnique({
    where: { id: Number(vinculoId) },
    include: {
      representante: { select: { nome: true } },
      conselho: { select: { nome: true } },
    },
  });
  if (!vinculo) {
    return Response.json({ error: "Vínculo não encontrado" }, { status: 404 });
  }

  await prisma.representanteConselho.delete({ where: { id: Number(vinculoId) } });

  await registrarAuditoria({
    entidadeNome: vinculo.representante.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "vinculo_removido",
    campo: "Vínculo Representante → Conselho",
    valorAnterior: `${vinculo.conselho.nome} / ${vinculo.papel}`,
    valorNovo: null,
  });

  return Response.json({ ok: true });
}
