import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";
import { registrarAuditoria, registrarEdicao } from "@/lib/auditoria";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({
    where: { id: Number(id) },
    include: { sindicato: true, conselhos: { include: { conselho: true } } },
  });
  if (!empresa) return Response.json({ error: "Empresa não encontrada" }, { status: 404 });
  return Response.json(empresa);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    cnpj, razaoSocial, sindicatoId, cnae, ramoAtividade, perfil,
    situacaoRFB, afinidade, dataSindicalizacao, dataVencimento, status, observacoes,
  } = body;

  const antes = await prisma.empresa.findUnique({ where: { id: Number(id) } });
  if (!antes) return Response.json({ error: "Empresa não encontrada" }, { status: 404 });

  const cnpjLimpo = cnpj?.replace(/\D/g, "");
  const existing = await prisma.empresa.findFirst({
    where: { cnpj: cnpjLimpo, NOT: { id: Number(id) } },
  });
  if (existing) {
    return Response.json({ error: "CNPJ já cadastrado em outra empresa" }, { status: 409 });
  }

  const empresa = await prisma.empresa.update({
    where: { id: Number(id) },
    data: {
      cnpj: cnpjLimpo, razaoSocial,
      cnae: cnae ?? null, ramoAtividade: ramoAtividade ?? null,
      perfil: perfil ?? null, situacaoRFB: situacaoRFB ?? null,
      afinidade: afinidade ?? null,
      sindicatoId: sindicatoId ? Number(sindicatoId) : null,
      dataSindicalizacao: new Date(dataSindicalizacao),
      dataVencimento: new Date(dataVencimento),
      status, observacoes: observacoes ?? null,
    },
    include: { sindicato: true },
  });

  await registrarEdicao(
    empresa.id, empresa.razaoSocial,
    usuario.id, usuario.nome,
    {
      cnpj: antes.cnpj, razaoSocial: antes.razaoSocial, cnae: antes.cnae,
      ramoAtividade: antes.ramoAtividade, perfil: antes.perfil, situacaoRFB: antes.situacaoRFB,
      afinidade: antes.afinidade, sindicatoId: antes.sindicatoId,
      dataSindicalizacao: antes.dataSindicalizacao.toISOString().split("T")[0],
      dataVencimento: antes.dataVencimento.toISOString().split("T")[0],
      status: antes.status, observacoes: antes.observacoes,
    },
    { cnpj: cnpjLimpo, razaoSocial, cnae, ramoAtividade, perfil, situacaoRFB, afinidade, sindicatoId, dataSindicalizacao, dataVencimento, status, observacoes }
  );

  return Response.json(empresa);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({ where: { id: Number(id) } });
  if (!empresa) return Response.json({ error: "Empresa não encontrada" }, { status: 404 });

  await registrarAuditoria({
    empresaId: null, empresaNome: empresa.razaoSocial,
    usuarioId: usuario.id, usuarioNome: usuario.nome,
    acao: "exclusao",
  });

  await prisma.empresa.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
