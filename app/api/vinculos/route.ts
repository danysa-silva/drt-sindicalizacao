import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest } from "@/lib/auth";

type Empresa = { id: number; cnpj: string; razaoSocial: string };

type Origem = {
  tipo: string;
  papel?: string;
  dataInicio?: string | null;
  dataFim?: string | null;
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
  origem: "representante" | "presidente_legado" | "titular_texto" | "suplente_texto";
  origens: Origem[];
};

function normalizarNome(nome: string): string {
  return nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

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

  // --- Todas as consultas em paralelo ---
  const [representantes, presidentes, conselhosTitularTexto, conselhosSuplementeTexto] =
    await Promise.all([

      // 1. Modelo oficial Representante
      prisma.representante.findMany({
        where: { nome: { contains: busca } },
        include: {
          sindicatos: {
            include: {
              sindicato: {
                include: {
                  empresas: { select: { id: true, cnpj: true, razaoSocial: true } },
                },
              },
            },
          },
          conselhos: {
            include: {
              conselho: {
                include: {
                  empresas: {
                    include: {
                      empresa: { select: { id: true, cnpj: true, razaoSocial: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),

      // 2. Legado: PresidenteSindicato
      prisma.presidenteSindicato.findMany({
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
      }),

      // 3. Legado: titular texto livre (sem FK)
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

      // 4. Legado: suplente texto livre (sem FK)
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

  // Nomes já cobertos pelo modelo oficial — usados para sinalizar possível duplicata no legado
  const nomesOficiais = new Set(representantes.map((r) => normalizarNome(r.nome)));

  const resultados: Resultado[] = [];

  // --- Resultados do modelo oficial ---
  for (const r of representantes) {
    const origens: Origem[] = [];

    for (const vs of r.sindicatos) {
      origens.push({
        tipo: "representante_sindicato",
        papel: vs.papel,
        dataInicio: vs.dataInicio?.toISOString().split("T")[0] ?? null,
        dataFim:    vs.dataFim?.toISOString().split("T")[0] ?? null,
        sindicato: { id: vs.sindicato.id, nome: vs.sindicato.nome },
        conselho: null,
        empresasPorSindicato: vs.sindicato.empresas,
        empresasPorConselho: [],
      });
    }

    for (const vc of r.conselhos) {
      origens.push({
        tipo: "representante_conselho",
        papel: vc.papel,
        sindicato: null,
        conselho: { id: vc.conselho.id, nome: vc.conselho.nome, tipo: vc.conselho.tipo },
        empresasPorSindicato: [],
        empresasPorConselho: vc.conselho.empresas.map((ce) => ce.empresa),
      });
    }

    if (origens.length === 0) {
      origens.push({
        tipo: "representante_sem_vinculo",
        sindicato: null,
        conselho: null,
        empresasPorSindicato: [],
        empresasPorConselho: [],
        aviso: "Representante cadastrado sem vínculos ativos.",
      });
    }

    resultados.push({
      pessoa: r.nome,
      cargo: null,
      email: r.email ?? null,
      telefone: r.telefone ?? null,
      origem: "representante",
      origens,
    });
  }

  // --- Resultados legados: PresidenteSindicato ---
  for (const presidente of presidentes) {
    const origens: Origem[] = [];

    const possivelDuplicata = nomesOficiais.has(normalizarNome(presidente.nome));
    const avisoLegado = possivelDuplicata
      ? "Este dado está no cadastro legado. Uma entrada com nome similar já existe no cadastro oficial de Representantes."
      : undefined;

    origens.push({
      tipo: "presidente",
      sindicato: { id: presidente.sindicato.id, nome: presidente.sindicato.nome },
      conselho: null,
      empresasPorSindicato: presidente.sindicato.empresas,
      empresasPorConselho: [],
      aviso: avisoLegado,
    });

    for (const conselho of presidente.comoTitular) {
      origens.push({
        tipo: "titular_fk",
        sindicato: { id: presidente.sindicato.id, nome: presidente.sindicato.nome },
        conselho: { id: conselho.id, nome: conselho.nome, tipo: conselho.tipo },
        empresasPorSindicato: [],
        empresasPorConselho: conselho.empresas.map((ce) => ce.empresa),
        aviso: avisoLegado,
      });
    }

    for (const conselho of presidente.comoSuplente) {
      origens.push({
        tipo: "suplente_fk",
        sindicato: { id: presidente.sindicato.id, nome: presidente.sindicato.nome },
        conselho: { id: conselho.id, nome: conselho.nome, tipo: conselho.tipo },
        empresasPorSindicato: [],
        empresasPorConselho: conselho.empresas.map((ce) => ce.empresa),
        aviso: avisoLegado,
      });
    }

    resultados.push({
      pessoa: presidente.nome,
      cargo: presidente.cargo ?? null,
      email: presidente.email ?? null,
      telefone: presidente.telefone ?? null,
      origem: "presidente_legado",
      origens,
    });
  }

  // --- Resultados legados: titular texto livre ---
  for (const conselho of conselhosTitularTexto) {
    resultados.push({
      pessoa: conselho.titular ?? busca,
      cargo: null,
      email: null,
      telefone: null,
      origem: "titular_texto",
      origens: [
        {
          tipo: "titular_texto",
          sindicato: null,
          conselho: { id: conselho.id, nome: conselho.nome, tipo: conselho.tipo },
          empresasPorSindicato: [],
          empresasPorConselho: conselho.empresas.map((ce) => ce.empresa),
          aviso: "Pessoa encontrada apenas em campo de texto livre, sem vínculo estruturado no banco.",
        },
      ],
    });
  }

  // --- Resultados legados: suplente texto livre ---
  for (const conselho of conselhosSuplementeTexto) {
    resultados.push({
      pessoa: conselho.suplente ?? busca,
      cargo: null,
      email: null,
      telefone: null,
      origem: "suplente_texto",
      origens: [
        {
          tipo: "suplente_texto",
          sindicato: null,
          conselho: { id: conselho.id, nome: conselho.nome, tipo: conselho.tipo },
          empresasPorSindicato: [],
          empresasPorConselho: conselho.empresas.map((ce) => ce.empresa),
          aviso: "Pessoa encontrada apenas em campo de texto livre, sem vínculo estruturado no banco.",
        },
      ],
    });
  }

  return Response.json({ total: resultados.length, resultados });
}
