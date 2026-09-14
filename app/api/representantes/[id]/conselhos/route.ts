import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";
import { withErrorHandling } from "@/lib/api-handler";
import { parseId } from "@/lib/parse-id";

type Params = { params: Promise<{ id: string }> };

const PAPEIS_CONSELHO = ["titular", "suplente", "membro", "outro"];

const vinculoConselhoSchema = z.object({
  conselhoId: z.coerce
    .number({ error: "conselhoId deve ser um número válido" })
    .int()
    .positive({ message: "conselhoId deve ser um número válido" }),
  papel: z
    .string({ error: "Papel é obrigatório" })
    .refine((v) => PAPEIS_CONSELHO.includes(v), {
      message: "Papel inválido. Use: titular, suplente, membro ou outro",
    }),
});

async function GET_handler(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const idNum = parseId(id);

  if (idNum === null) return Response.json({ error: "ID inválido" }, { status: 400 });
  const representante = await prisma.representante.findUnique({ where: { id: idNum } });
  if (!representante) {
    return Response.json({ error: "Representante não encontrado" }, { status: 404 });
  }

  const vinculos = await prisma.representanteConselho.findMany({
    where: { representanteId: idNum },
    include: { conselho: { select: { id: true, nome: true, tipo: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(vinculos);
}

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
  const body = await request.json();
  const resultado = vinculoConselhoSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { conselhoId, papel } = resultado.data;

  const representante = await prisma.representante.findUnique({ where: { id: idNum } });
  if (!representante) {
    return Response.json({ error: "Representante não encontrado" }, { status: 404 });
  }

  const conselho = await prisma.conselho.findUnique({ where: { id: conselhoId } });
  if (!conselho) {
    return Response.json({ error: "Conselho não encontrado" }, { status: 404 });
  }

  const existente = await prisma.representanteConselho.findFirst({
    where: { representanteId: idNum, conselhoId, papel },
  });
  if (existente) {
    return Response.json({ error: "Vínculo já existe com esse papel neste conselho" }, { status: 409 });
  }

  const vinculo = await prisma.representanteConselho.create({
    data: {
      representanteId: idNum,
      conselhoId,
      papel,
    },
    include: { conselho: { select: { id: true, nome: true, tipo: true } } },
  });

  await registrarAuditoria({
    entidadeNome: representante.nome,
    empresaId: null,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    acao: "vinculo_adicionado",
    campo: "Vínculo Representante → Conselho",
    valorAnterior: null,
    valorNovo: `${conselho.nome} / ${papel}`,
  });

  return Response.json(vinculo, { status: 201 });
}

export const GET = withErrorHandling(GET_handler);
export const POST = withErrorHandling(POST_handler);
