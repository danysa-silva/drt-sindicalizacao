// scripts/seed-faltantes.js
// Cadastra os 31 representantes ausentes e vincula como responsavel da empresa
const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });

const CSV_PATH = "C:/Users/danielle.sa/Downloads/sindicato.csv";

function normalizar(s) {
  if (!s) return "";
  return s.toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

function limparCnpj(s) {
  return (s || "").toString().replace(/\s/g, "").trim();
}

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

  return rows.slice(1).filter((r) => r.trim()).map((r) => {
    const cols = r.split(";");
    return {
      razaoSocial: (cols[0] || "").trim(),
      cnpj:        limparCnpj(cols[1]),
      responsavel: (cols[5] || "").trim(),
    };
  }).filter((r) => r.razaoSocial && r.cnpj && r.responsavel);
}

async function main() {
  const content = fs.readFileSync(CSV_PATH, { encoding: "latin1" });
  const dados = parseCsv(content);

  // Carrega representantes existentes
  const { rows: repsExistentes } = await pool.query('SELECT id, nome FROM "Representante"');
  const repMap = {};
  repsExistentes.forEach((r) => { repMap[normalizar(r.nome)] = r.id; });

  let criados = 0, vinculados = 0, jaExistiam = 0;
  const erros = [];

  for (const row of dados) {
    const normNome = normalizar(row.responsavel);

    // Pula quem já estava no BD (já foi vinculado pelo seed-empresas.js)
    if (repMap[normNome]) { jaExistiam++; continue; }

    // Busca empresa pelo CNPJ
    const empRes = await pool.query('SELECT id FROM "Empresa" WHERE cnpj = $1', [row.cnpj]);
    if (!empRes.rows.length) {
      erros.push(`Empresa não encontrada para CNPJ ${row.cnpj} (${row.razaoSocial})`);
      continue;
    }
    const empresaId = empRes.rows[0].id;

    // Insere o representante
    const repRes = await pool.query(
      `INSERT INTO "Representante" ("nome", "createdAt", "updatedAt")
       VALUES ($1, NOW(), NOW())
       RETURNING id`,
      [row.responsavel.trim()]
    );
    const representanteId = repRes.rows[0].id;
    repMap[normNome] = representanteId;
    criados++;

    // Vincula como responsavel da empresa
    await pool.query(
      `INSERT INTO "RepresentanteEmpresa"
         ("representanteId", "empresaId", "tipoRelacao", "ativo", "createdAt", "updatedAt")
       VALUES ($1, $2, 'responsavel', true, NOW(), NOW())
       ON CONFLICT ("representanteId", "empresaId", "tipoRelacao") DO NOTHING`,
      [representanteId, empresaId]
    );
    vinculados++;
  }

  console.log(`Representantes criados:  ${criados}`);
  console.log(`Vínculos criados:        ${vinculados}`);
  console.log(`Já existiam (ignorados): ${jaExistiam}`);

  if (erros.length) {
    console.log(`\nErros (${erros.length}):`);
    erros.forEach((e) => console.log("  -", e));
  }

  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
