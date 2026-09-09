// scripts/seed-empresas.js
// Uso: node scripts/seed-empresas.js
// Fonte: C:/Users/danielle.sa/Downloads/sindicato.csv
const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });

const CSV_PATH = "C:/Users/danielle.sa/Downloads/sindicato.csv";

function normalizar(s) {
  if (!s) return "";
  return s
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function limparCnpj(s) {
  return (s || "").toString().replace(/\s/g, "").trim();
}

// Parse CSV com suporte a campos entre aspas e separador ";"
function parseCsv(content) {
  const rows = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') { inQuote = !inQuote; }
    else if (c === "\n" && !inQuote) { rows.push(current.trim()); current = ""; continue; }
    current += c;
  }
  if (current.trim()) rows.push(current.trim());

  return rows
    .slice(1) // remove cabeçalho
    .filter((r) => r.trim())
    .map((r) => {
      const cols = r.split(";");
      return {
        razaoSocial: (cols[0] || "").trim(),
        cnpj:        limparCnpj(cols[1]),
        observacoes: (cols[2] || "").trim(),
        cnae:        (cols[3] || "").trim(),
        sindicato:   (cols[4] || "").trim(),
        responsavel: (cols[5] || "").trim(),
        cargo:       (cols[6] || "").trim(),
      };
    })
    .filter((r) => r.razaoSocial && r.cnpj);
}

// Correções manuais para nomes de sindicato que diferem entre o CSV e o BD
const CORRECOES_SINDICATO = {
  "SINDICATO DAS INDUSTRIAS DE CONFECCOES DE ROUPAS E CHAPEUS MATERIAL DE SEGURANCA":
    "SINDICATO DAS INDUSTRIAS DE CONFECCOES DE ROUPAS E CHAPEUS E MATERIAL DE SEGURANCA",
};

function resolverSindicato(nome, sindMap) {
  if (!nome) return null;
  const norm = normalizar(nome);
  if (sindMap[norm]) return sindMap[norm];
  const corrigido = CORRECOES_SINDICATO[norm];
  if (corrigido && sindMap[corrigido]) return sindMap[corrigido];
  return null;
}

async function main() {
  const content = fs.readFileSync(CSV_PATH, { encoding: "latin1" });
  const dados = parseCsv(content);
  console.log(`Linhas no CSV: ${dados.length}`);

  // Carrega sindicatos do BD
  const { rows: sindicatos } = await pool.query('SELECT id, nome FROM "Sindicato"');
  const sindMap = {};
  sindicatos.forEach((s) => { sindMap[normalizar(s.nome)] = s.id; });

  // Carrega representantes do BD
  const { rows: representantes } = await pool.query('SELECT id, nome FROM "Representante"');
  const repMap = {};
  representantes.forEach((r) => { repMap[normalizar(r.nome)] = r.id; });

  let inseridos = 0, atualizados = 0, repVinculados = 0;
  const errosSind = new Set();
  const errosRep = new Set();

  for (const row of dados) {
    const sindicatoId = resolverSindicato(row.sindicato, sindMap);
    if (row.sindicato && !sindicatoId) errosSind.add(row.sindicato);

    const res = await pool.query(
      `INSERT INTO "Empresa" (
        "razaoSocial", "cnpj", "sindicatoId",
        "cnae", "observacoes",
        "dataSindicalizacao", "dataVencimento", "status",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '1 year', 'ativo', NOW(), NOW())
      ON CONFLICT ("cnpj") DO UPDATE SET
        "razaoSocial" = EXCLUDED."razaoSocial",
        "sindicatoId" = COALESCE(EXCLUDED."sindicatoId", "Empresa"."sindicatoId"),
        "cnae"        = COALESCE(EXCLUDED."cnae",        "Empresa"."cnae"),
        "observacoes" = COALESCE(EXCLUDED."observacoes", "Empresa"."observacoes"),
        "updatedAt"   = NOW()
      RETURNING id, xmax`,
      [row.razaoSocial, row.cnpj, sindicatoId, row.cnae || null, row.observacoes || null]
    );

    const empresaId = res.rows[0].id;
    const wasInsert = res.rows[0].xmax === "0";
    if (wasInsert) inseridos++; else atualizados++;

    if (row.responsavel) {
      const repId = repMap[normalizar(row.responsavel)];
      if (!repId) {
        errosRep.add(row.responsavel);
      } else {
        await pool.query(
          `INSERT INTO "RepresentanteEmpresa"
             ("representanteId", "empresaId", "tipoRelacao", "ativo", "createdAt", "updatedAt")
           VALUES ($1, $2, 'responsavel', true, NOW(), NOW())
           ON CONFLICT ("representanteId", "empresaId", "tipoRelacao") DO NOTHING`,
          [repId, empresaId]
        );
        repVinculados++;
      }
    }
  }

  console.log(`\nEmpresas inseridas:      ${inseridos}`);
  console.log(`Empresas atualizadas:    ${atualizados}`);
  console.log(`Responsáveis vinculados: ${repVinculados}`);

  if (errosSind.size > 0) {
    console.log(`\nSindicatos não encontrados (${errosSind.size}):`);
    [...errosSind].sort().forEach((s) => console.log("  -", s));
  }
  if (errosRep.size > 0) {
    console.log(`\nResponsáveis não encontrados no BD (${errosRep.size}):`);
    [...errosRep].sort().forEach((r) => console.log("  -", r));
  }

  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
