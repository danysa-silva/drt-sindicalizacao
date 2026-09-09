// scripts/undo-seed-empresas.js
// Remove apenas o que foi criado pelo seed-empresas.js (hoje, 2026-06-16)
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });

async function main() {
  // 1. Remove vínculos responsavel criados hoje
  const rep = await pool.query(`
    DELETE FROM "RepresentanteEmpresa"
    WHERE "tipoRelacao" = 'responsavel'
      AND "createdAt"::date = CURRENT_DATE
    RETURNING id
  `);
  console.log(`Vínculos responsavel removidos: ${rep.rowCount}`);

  // 2. Remove empresas inseridas hoje pelo seed
  //    (dataSindicalizacao = hoje significa que vieram do INSERT do seed,
  //     pois o seed usou NOW() para novas empresas)
  const emp = await pool.query(`
    DELETE FROM "Empresa"
    WHERE "createdAt"::date = CURRENT_DATE
      AND "dataSindicalizacao"::date = CURRENT_DATE
    RETURNING id, "razaoSocial", "cnpj"
  `);
  console.log(`Empresas removidas: ${emp.rowCount}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
