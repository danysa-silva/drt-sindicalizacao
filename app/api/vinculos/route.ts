import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const busca = searchParams.get("busca")?.trim() ?? "";

  if (busca.length < 2) {
    return Response.json(
      { error: "Informe ao menos 2 caracteres para a busca." },
      { status: 400 }
    );
  }

  // --- 1. Vínculos estruturados via PresidenteSindicato (com FK) ---
  const presidentes = await prisma.presidenteSindicato.findMany({
    where: { nome: { contains: busca } },
    include: {
      sindicato: {
        include: {
          empresas: { select: { id: true, cnpj: true, razaoSocial: true } },
        },
      },
      comoTitular: {
        include: {
          empresas: {
            include: {
              empresa: { select: { id: true, cnpj: true, razaoSocial: true } },
            },
          },
        },
      },
      comoSuplente: {
        include: {
          empresas: {
            include: {
              empresa: { select: { id: true, cnpj: true, razaoSocial: true } },
            },
          },
        },
      },
    },
  });

  // --- 2. Vínculos de texto livre nos Conselhos (sem FK vinculada) ---
  const [conselhosTitularTexto, conselhosSuplementeTexto] = await Promise.all([
    prisma.conselho.findMany({
      where: { titular: { contains: busca }, titularId: null },
      include: {
        empresas: {
          include: {
            empresa: { select: { id: true, cnpj: true, razaoSocial: true } },
          },
        },
      },
    }),
    prisma.conselho.findMany({
      where: { suplente: { contains: busca }, suplenteId: null },
      include: {
        empresas: {
          include: {
            empresa: { select: { id: true, cnpj: true, razaoSocial: true } },
          },
        },
      },
    }),
  ]);

  // --- Consolidação dos resultados ---
  type Empresa = { id: number; cnpj: string; razaoSocial: string };
  type Origem = {
    tipo: string;
    sindicato: { id: number; nome: string } | null;
    conselho: { id: number; nome: string; tipo: string } | null;
    empresasPorSindicato: Empresa[];
    empresasPorConselho: Empresa[];
    aviso?: string;
  };
  type Resultado = {
    pessoa: string;
    cargo: string | null;
    email: string | null;
    telefone: string | null;
    origens: Origem[];
  };

  const resultados: Resultado[] = [];

  for (const presidente of presidentes) {
    const origens: Origem[] = [];

    origens.push({
      tipo: "presidente",
      sindicato: { id: presidente.sindicato.id, nome: presidente.sindicato.nome },
      conselho: null,
      empresasPorSindicato: presidente.sindicato.empresas,
      empresasPorConselho: [],
    });

    for (const conselho of presidente.comoTitular) {
      origens.push({
        tipo: "titular_fk",
        sindicato: { id: presidente.sindicato.id, nome: presidente.sindicato.nome },
        conselho: { id: conselho.id, nome: conselho.nome, tipo: conselho.tipo },
        empresasPorSindicato: [],
        empresasPorConselho: conselho.empresas.map((ce) => ce.empresa),
      });
    }

    for (const conselho of presidente.comoSuplente) {
      origens.push({
        tipo: "suplente_fk",
        sindicato: { id: presidente.sindicato.id, nome: presidente.sindicato.nome },
        conselho: { id: conselho.id, nome: conselho.nome, tipo: conselho.tipo },
        empresasPorSindicato: [],
        empresasPorConselho: conselho.empresas.map((ce) => ce.empresa),
      });
    }

    resultados.push({
      pessoa: presidente.nome,
      cargo: presidente.cargo ?? null,
      email: presidente.email ?? null,
      telefone: presidente.telefone ?? null,
      origens,
    });
  }

  for (const conselho of conselhosTitularTexto) {
    resultados.push({
      pessoa: conselho.titular ?? busca,
      cargo: null,
      email: null,
      telefone: null,
      origens: [
        {
          tipo: "titular_texto",
          sindicato: null,
          conselho: { id: conselho.id, nome: conselho.nome, tipo: conselho.tipo },
          empresasPorSindicato: [],
          empresasPorConselho: conselho.empresas.map((ce) => ce.empresa),
          aviso:
            "Pessoa encontrada apenas em campo de texto livre, sem vínculo estruturado no banco.",
        },
      ],
    });
  }

  for (const conselho of conselhosSuplementeTexto) {
    resultados.push({
      pessoa: conselho.suplente ?? busca,
      cargo: null,
      email: null,
      telefone: null,
      origens: [
        {
          tipo: "suplente_texto",
          sindicato: null,
          conselho: { id: conselho.id, nome: conselho.nome, tipo: conselho.tipo },
          empresasPorSindicato: [],
          empresasPorConselho: conselho.empresas.map((ce) => ce.empresa),
          aviso:
            "Pessoa encontrada apenas em campo de texto livre, sem vínculo estruturado no banco.",
        },
      ],
    });
  }

  return Response.json({ total: resultados.length, resultados });
}
