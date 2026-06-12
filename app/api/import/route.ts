import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioFromRequest, podeAlterar } from "@/lib/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
  const usuario = await getUsuarioFromRequest(request);
  if (!usuario) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!podeAlterar(usuario.perfil)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return Response.json({ error: "O arquivo deve ter extensão .csv" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "O arquivo não pode ultrapassar 5 MB" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Detecta UTF-8 BOM (EF BB BF); caso contrário assume Windows-1252 (padrão Excel/Brasil)
  const hasUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
  const text = new TextDecoder(hasUtf8Bom ? "utf-8" : "windows-1252").decode(buffer);
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

    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      linhasComErro.push({ linha: i + 1, cnpj: cnpjRaw || "(vazio)", razaoSocial, motivo: "CNPJ inválido ou ausente (deve ter 14 dígitos)" });
      continue;
    }

    if (!razaoSocial) {
      linhasComErro.push({ linha: i + 1, cnpj: cnpjRaw, razaoSocial: "(vazio)", motivo: "Razão social ausente" });
      continue;
    }

    const rawDataSind = col(row, "data_sindicalizacao") || col(row, "data");
    const rawDataVenc = col(row, "data_vencimento") || col(row, "vencimento");

    const dataSind = rawDataSind ? normalizeDate(rawDataSind) : null;
    const dataVenc = rawDataVenc ? normalizeDate(rawDataVenc) : null;

    if (rawDataSind && dataSind === null) {
      linhasComErro.push({ linha: i + 1, cnpj: cnpjRaw, razaoSocial, motivo: "Data de sindicalização inválida" });
      continue;
    }

    if (rawDataVenc && dataVenc === null) {
      linhasComErro.push({ linha: i + 1, cnpj: cnpjRaw, razaoSocial, motivo: "Data de vencimento inválida" });
      continue;
    }

    try {
      const sindicatoNome = col(row, "sindicato") || col(row, "sindicato_vinculado");
      let sindicatoId: number | null = null;

      if (sindicatoNome) {
        let sindicato = await prisma.sindicato.findUnique({ where: { nome: sindicatoNome } });
        if (!sindicato) {
          sindicato = await prisma.sindicato.create({ data: { nome: sindicatoNome, tipo: "externo" } });
        }
        sindicatoId = sindicato.id;
      }

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
