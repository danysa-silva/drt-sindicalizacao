import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeDate(raw: string): Date | null {
  if (!raw) return null;
  const parts = raw.includes("/") ? raw.split("/").reverse() : raw.split("-");
  if (parts.length !== 3) return null;
  const d = new Date(`${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`);
  return isNaN(d.getTime()) ? null : d;
}

type LinhaErro = {
  linha: number;
  cnpj: string;
  razaoSocial: string;
  motivo: string;
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    return Response.json({ error: "Arquivo vazio ou sem dados" }, { status: 400 });
  }

  const headers = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_")
  );

  const col = (row: string[], name: string) => {
    const i = headers.indexOf(name);
    return i >= 0 ? row[i] ?? "" : "";
  };

  let criados = 0;
  let atualizados = 0;
  const linhasComErro: LinhaErro[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.every((c) => !c)) continue;

    const cnpjRaw = col(row, "cnpj");
    const cnpjLimpo = cnpjRaw.replace(/\D/g, "");
    const razaoSocial = col(row, "razao_social") || col(row, "empresa");

    if (!cnpjLimpo || cnpjLimpo.length < 11) {
      linhasComErro.push({ linha: i + 1, cnpj: cnpjRaw || "(vazio)", razaoSocial, motivo: "CNPJ inválido ou ausente" });
      continue;
    }

    if (!razaoSocial) {
      linhasComErro.push({ linha: i + 1, cnpj: cnpjRaw, razaoSocial: "(vazio)", motivo: "Razão social ausente" });
      continue;
    }

    try {
      const sindicatoNome = col(row, "sindicato") || col(row, "sindicato_vinculado");
      let sindicatoId: number | null = null;

      if (sindicatoNome) {
        let sindicato = await prisma.sindicato.findUnique({ where: { nome: sindicatoNome } });
        if (!sindicato) {
          sindicato = await prisma.sindicato.create({ data: { nome: sindicatoNome, tipo: "patronal" } });
        }
        sindicatoId = sindicato.id;
      }

      const dataSind = normalizeDate(col(row, "data_sindicalizacao") || col(row, "data"));
      const dataVenc = normalizeDate(col(row, "data_vencimento") || col(row, "vencimento"));

      const data = {
        razaoSocial,
        cnae: col(row, "cnae") || null,
        ramoAtividade: col(row, "ramo") || col(row, "ramo_de_atividade") || col(row, "ramo_atividade") || null,
        perfil: col(row, "perfil") || null,
        situacaoRFB: col(row, "situacao") || col(row, "situacao_rfb") || null,
        afinidade: col(row, "afinidade") || null,
        sindicatoId,
        dataSindicalizacao: dataSind ?? new Date(),
        dataVencimento: dataVenc ?? new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        status: col(row, "status") || "ativo",
        observacoes: col(row, "observacoes") || null,
      };

      const existing = await prisma.empresa.findUnique({ where: { cnpj: cnpjLimpo } });
      if (existing) {
        await prisma.empresa.update({ where: { cnpj: cnpjLimpo }, data });
        atualizados++;
      } else {
        await prisma.empresa.create({ data: { cnpj: cnpjLimpo, ...data } });
        criados++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      linhasComErro.push({ linha: i + 1, cnpj: cnpjRaw, razaoSocial, motivo: msg.includes("Unique") ? "CNPJ duplicado no arquivo" : msg.slice(0, 80) });
    }
  }

  return Response.json({ criados, atualizados, erros: linhasComErro.length, linhasComErro });
}
