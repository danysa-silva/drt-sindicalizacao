require("dotenv").config();
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
pool.query(`SELECT nome FROM "Sindicato" ORDER BY nome`)
  .then(r => { r.rows.forEach(x => console.log(x.nome)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
