import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

type Params = { params: Promise<{ id: string }> };

const TIPOS_RELACAO = [
  "dono",
  "socio",
  "representante-legal",
  "diretor",
  "contato-comercial",
  "rh",
  "financeiro",
  "outro",
];

const TIPOS_CONDICAO = [
  "desconto-diferenciado",
  "negociacao-especial",
  "prioridade-atendimento",
  "outro",
];

const vinculoEmpresaSchema = z.object({
  empresaId: z.coerce
    .number({ error: "empresaId deve ser um número válido" })
    .int()
    .positive({ message: "empresaId deve ser um número válido" }),
  tipoRelacao: z
    .string({ error: "Tipo de relação é obrigatório" })
    .refine((v) => TIPOS_RELACAO.includes(v), {
      message: "Tipo de relação inválido",
    }),
  cargoNaEmpresa: z
    .string()
    .nullish()
    .transform((v) => (v === "" || v == null ? null : v)),
  observacao: z
    .string()
    .nullish()
    .transform((v) => (v === "" || v == null ? null : v)),
  aplicaCondicaoComercial: z.boolean().default(false),
  tipoCondicaoComercial: z
    .string()
    .nullish()
    .refine((v) => v == null || v === "" || TIPOS_CONDICAO.includes(v), {
      message: "Tipo de condição comercial inválido",
    })
    .transform((v) => (v === "" || v == null ? null : v)),
  dataInicio: z
    .string()
    .nullish()
    .refine((v) => v == null || v === "" || !isNaN(new Date(v).getTime()), {
      message: "Data de início inválida",
    })
    .transform((v) => (v === "" || v == null ? null : new Date(v))),
  dataFim: z
    .string()
    .nullish()
    .refine((v) => v == null || v === "" || !isNaN(new Date(v).getTime()), {
      message: "Data de fim inválida",
    })
    .transform((v) => (v === "" || v == null ? null : new Date(v))),
  ativo: z.boolean().default(true),
});

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const usuario = await getUsuarioFromRequest(request);
    if (!usuario) {
      return Response.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const representante = await prisma.representante.findUnique({ where: { id: Number(id) } });
    if (!representante) {
      return Response.json({ error: "Representante não encontrado" }, { status: 404 });
    }

    const vinculos = await prisma.representanteEmpresa.findMany({
      where: { representanteId: Number(id) },
      include: {
        empresa: {
          select: { id: true, cnpj: true, razaoSocial: true, situacaoRFB: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(vinculos);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const usuario = await getUsuarioFromRequest(request);
    if (!usuario) {
      return Response.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (!podeAlterar(usuario.perfil)) {
      return Response.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const resultado = vinculoEmpresaSchema.safeParse(body);
    if (!resultado.success) {
      const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
      return Response.json({ error: mensagem }, { status: 400 });
    }

    const {
      empresaId,
      tipoRelacao,
      cargoNaEmpresa,
      observacao,
      aplicaCondicaoComercial,
      tipoCondicaoComercial,
      dataInicio,
      dataFim,
      ativo,
    } = resultado.data;

    const representante = await prisma.representante.findUnique({ where: { id: Number(id) } });
    if (!representante) {
      return Response.json({ error: "Representante não encontrado" }, { status: 404 });
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) {
      return Response.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    const existente = await prisma.representanteEmpresa.findFirst({
      where: { representanteId: Number(id), empresaId, tipoRelacao },
    });
    if (existente) {
      return Response.json(
        { error: "Já existe um vínculo desse tipo com esta empresa" },
        { status: 409 }
      );
    }

    const vinculo = await prisma.representanteEmpresa.create({
      data: {
        representanteId: Number(id),
        empresaId,
        tipoRelacao,
        cargoNaEmpresa: cargoNaEmpresa ?? null,
        observacao: observacao ?? null,
        aplicaCondicaoComercial,
        tipoCondicaoComercial: tipoCondicaoComercial ?? null,
        dataInicio: dataInicio ?? null,
        dataFim: dataFim ?? null,
        ativo,
      },
      include: {
        empresa: {
          select: { id: true, cnpj: true, razaoSocial: true, situacaoRFB: true },
        },
      },
    });

    await registrarAuditoria({
      entidadeNome: representante.nome,
      empresaId: null,
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      acao: "vinculo_adicionado",
      campo: "Vínculo Representante → Empresa",
      valorAnterior: null,
      valorNovo: `${empresa.razaoSocial} / ${tipoRelacao}`,
    });

    return Response.json(vinculo, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return Response.json({ error: msg }, { status: 500 });
  }
}
