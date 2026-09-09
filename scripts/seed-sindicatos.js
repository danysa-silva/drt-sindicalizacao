// scripts/seed-sindicatos.js
// Uso: node scripts/seed-sindicatos.js
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(str) {
  const m = str && str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const csvPath = path.join(process.env.USERPROFILE || "", "Downloads", "sindicato sind.csv");
  const buf = fs.readFileSync(csvPath);
  const hasBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  const text = buf.toString(hasBom ? "utf8" : "latin1").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  console.log(`Lendo ${lines.length - 1} sindicatos...\n`);

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);

    const nome       = row[1]?.trim().replace(/\s+/g, " ");
    const presidente = row[2]?.trim();
    const observ     = row[3]?.trim();
    const tel        = row[5]?.trim();
    const validadeStr = row[6]?.trim();
    const alto  = (row[7] || "").trim().toLowerCase();
    const medio = (row[8] || "").trim().toLowerCase();
    const baixo = (row[9] || "").trim().toLowerCase();

    if (!nome) continue;

    let afinidade = null;
    if (alto === "x")       afinidade = "ALTO";
    else if (medio === "x") afinidade = "MÉDIO";
    else if (baixo === "x") afinidade = "BAIXO";

    let dataInicio = null;
    let dataFim    = null;
    if (validadeStr) {
      const mi = validadeStr.match(/início[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
      const mt = validadeStr.match(/término[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
      if (mi) dataInicio = parseDate(mi[1]);
      if (mt) dataFim    = parseDate(mt[1]);
    }

    try {
      // Upsert sindicato
      const res = await pool.query(
        `INSERT INTO "Sindicato" (nome, tipo, "afinidadeFieam", "validadeMandato", observacoes, "createdAt", "updatedAt")
         VALUES ($1, 'patronal', $2, $3, $4, NOW(), NOW())
         ON CONFLICT (nome) DO UPDATE SET
           "afinidadeFieam"  = EXCLUDED."afinidadeFieam",
           "validadeMandato" = EXCLUDED."validadeMandato",
           observacoes       = EXCLUDED.observacoes,
           "updatedAt"       = NOW()
         RETURNING id, xmax`,
        [nome, afinidade, validadeStr || null, observ || null]
      );

      const sindicatoId = res.rows[0].id;
      const foiAtualizado = res.rows[0].xmax !== "0";
      if (foiAtualizado) atualizados++; else criados++;

      // Inserir presidente (se não for "SEM PRESIDENTE")
      const semPresidente = !presidente ||
        /sem presidente|não tem presidente|paraliz|sem recursos/i.test(presidente);

      if (!semPresidente) {
        await pool.query(
          `INSERT INTO "PresidenteSindicato" ("sindicatoId", nome, telefone, "dataInicio", "dataFim", "createdAt", "updatedAt")
           SELECT $1, $2, $3, $4, $5, NOW(), NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM "PresidenteSindicato"
             WHERE "sindicatoId" = $1 AND nome = $2
           )`,
          [sindicatoId, presidente, tel || null, dataInicio, dataFim]
        );
      }

      console.log(`${foiAtualizado ? "↻" : "+"} [${afinidade || "—"}] ${nome}`);
    } catch (e) {
      erros++;
      console.error(`✗ ${nome}: ${e.message}`);
    }
  }

  console.log(`\n✅ Criados: ${criados} | Atualizados: ${atualizados} | Erros: ${erros}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
