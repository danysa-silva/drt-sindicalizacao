const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(process.cwd(), 'dev.db'));
db.pragma('foreign_keys = ON');

const sindicatos = db.prepare('SELECT id, nome FROM Sindicato').all();
console.log(`Sindicatos no banco: ${sindicatos.length}`);

function normalizar(str) {
  if (!str) return '';
  return str.trim().toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

function findSindicato(nome) {
  if (!nome) return null;
  const nomNorm = normalizar(nome);
  for (const s of sindicatos) {
    if (normalizar(s.nome) === nomNorm) return s.id;
  }
  for (const s of sindicatos) {
    const sNorm = normalizar(s.nome);
    if (sNorm.includes(nomNorm) || nomNorm.includes(sNorm)) return s.id;
  }
  return null;
}

function cleanCNPJ(cnpj) {
  if (!cnpj) return null;
  const digits = cnpj.replace(/[^\d]/g, '');
  if (digits.length < 11) return null;
  return digits.slice(0, 14);
}

function normalizePerfil(perfil) {
  if (!perfil) return null;
  const p = normalizar(perfil);
  if (p.includes('NAO INDUSTRIA')) return null;
  if (p.includes('INDUSTRIA')) return 'Indústria';
  return null;
}

function parseAfinidade(alto, medio, baixo, afinidade) {
  const a = normalizar(afinidade);
  if (normalizar(alto) === 'X' || a === 'ALTO') return 'ALTO';
  if (normalizar(medio) === 'X' || a.includes('MEDIO')) return 'MÉDIO';
  if (normalizar(baixo) === 'X' || a === 'BAIXO') return 'BAIXO';
  return null;
}

function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = i + 1 < content.length ? content[i + 1] : null;

    if (ch === '"') {
      if (inQuotes && next === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ';' && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(field.trim());
      if (row.some(f => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (row.length > 0 || field !== '') {
    row.push(field.trim());
    if (row.some(f => f !== '')) rows.push(row);
  }
  return rows;
}

const csvContent = fs.readFileSync('temp_import.csv', 'utf8');
const rows = parseCSV(csvContent);
console.log(`Linhas no CSV: ${rows.length}`);

const dataRows = rows.slice(1);

const insertEmpresa = db.prepare(`
  INSERT OR IGNORE INTO Empresa (
    cnpj, razaoSocial, cnae, perfil, situacaoRFB,
    afinidade, sindicatoId, dataSindicalizacao, dataVencimento,
    status, observacoes, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const updateEmpresa = db.prepare(`
  UPDATE Empresa SET
    sindicatoId = ?, cnae = ?, perfil = ?, situacaoRFB = ?,
    afinidade = ?, status = ?, observacoes = ?, updatedAt = datetime('now')
  WHERE cnpj = ?
`);

const defaultSind = '2024-01-01T00:00:00.000Z';
const defaultVenc = '2025-12-31T00:00:00.000Z';

let inserted = 0, updated = 0, skipped = 0, semSind = 0;

const importAll = db.transaction(() => {
  for (const row of dataRows) {
    const nome = (row[0] || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!nome) { skipped++; continue; }

    const cnpj = cleanCNPJ(row[1]);
    if (!cnpj) { skipped++; continue; }

    const avaliacao = (row[2] || '').trim() || null;
    const perfil = normalizePerfil(row[3]);
    const cnaeRaw = (row[4] || '').trim().replace(/\s+/g, '');
    const cnae = cnaeRaw && /^\d/.test(cnaeRaw) ? cnaeRaw : null;
    const sindicatoNome = (row[6] || '').trim();
    const situacaoRFB = (row[7] || '').trim() || null;

    const afinidade = parseAfinidade(row[13], row[14], row[15], row[17]);
    const status = (situacaoRFB || '').toUpperCase() === 'ATIVA' ? 'ativo' : 'inativo';

    const sindicatoId = findSindicato(sindicatoNome);
    if (!sindicatoId && sindicatoNome) {
      semSind++;
      console.log(`  Sindicato não encontrado: "${sindicatoNome}"`);
    }

    try {
      const ins = insertEmpresa.run(cnpj, nome, cnae, perfil, situacaoRFB, afinidade, sindicatoId, defaultSind, defaultVenc, status, avaliacao);
      if (ins.changes > 0) {
        inserted++;
      } else {
        // CNPJ já existe — atualiza sindicatoId e outros campos
        const upd = updateEmpresa.run(sindicatoId, cnae, perfil, situacaoRFB, afinidade, status, avaliacao, cnpj);
        if (upd.changes > 0) updated++; else skipped++;
      }
    } catch (e) {
      skipped++;
    }
  }
});

importAll();
console.log(`\nNovas: ${inserted}`);
console.log(`Atualizadas: ${updated}`);
console.log(`Ignoradas: ${skipped}`);
console.log(`Sem sindicato vinculado: ${semSind}`);
db.close();
