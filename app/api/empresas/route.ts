import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { razaoSocial: "asc" },
    include: { sindicato: true },
  });
  return Response.json(empresas);
}

export async function POST(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario || usuario.perfil !== "admin") {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const {
    cnpj, razaoSocial, sindicatoId, cnae, ramoAtividade, perfil,
    situacaoRFB, afinidade, dataSindicalizacao, dataVencimento, status, observacoes,
  } = body;

  if (!cnpj || !razaoSocial || !dataSindicalizacao || !dataVencimento) {
    return Response.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const cnpjLimpo = cnpj.replace(/\D/g, "");
  const existing = await prisma.empresa.findUnique({ where: { cnpj: cnpjLimpo } });
  if (existing) {
    return Response.json({ error: "CNPJ já cadastrado" }, { status: 409 });
  }

  const empresa = await prisma.empresa.create({
    data: {
      cnpj: cnpjLimpo, razaoSocial,
      cnae: cnae ?? null, ramoAtividade: ramoAtividade ?? null,
      perfil: perfil ?? null, situacaoRFB: situacaoRFB ?? null,
      afinidade: afinidade ?? null,
      sindicatoId: sindicatoId ? Number(sindicatoId) : null,
      dataSindicalizacao: new Date(dataSindicalizacao),
      dataVencimento: new Date(dataVencimento),
      status: status ?? "ativo",
      observacoes: observacoes ?? null,
    },
    include: { sindicato: true },
  });

  await registrarAuditoria({
    empresaId: empresa.id, empresaNome: empresa.razaoSocial,
    usuarioId: usuario.id, usuarioNome: usuario.nome,
    acao: "criacao",
  });

  return Response.json(empresa, { status: 201 });
}
