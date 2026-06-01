const Database = require('better-sqlite3');
const db = new Database('c:/Users/danielle.sa/Documents/drt-sindicalizacao/dev.db');

const insertSind = db.prepare(`INSERT INTO Sindicato (nome, tipo, afinidadeFieam, validadeMandato, observacoes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`);
const insertPres = db.prepare(`INSERT INTO PresidenteSindicato (sindicatoId, nome, cargo, createdAt, updatedAt) VALUES (?, ?, 'Presidente', datetime('now'), datetime('now'))`);

const dados = [
  { nome: 'SINDICATO DAS INDUSTRIAS DE ALIMENTACAO DE MANAUS', afinidade: 'ALTO', validade: 'Inicio: 08/04/2023', obs: 'Participacao ativa, economicamente com a contribuicao sindical e mensalidade associativa e institucional', presidente: 'Pedro de Faria e Cunha Monteiro' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE ARTEFATOS DE BORRACHAS E RECAUCHUTAGEM DO AMAZONAS', afinidade: null, validade: 'Inicio: 11/10/2018 - Termino: 11/10/2021', obs: 'Participacao ativa, economicamente com a contribuicao sindical e mensalidade associativa e institucional', presidente: 'Sebastiao Montefusco Cavalcante Junior' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE BEBIDAS EM GERAL DO AMAZONAS', afinidade: null, validade: 'Inicio: 28/09/2023 - Termino: 28/09/2026', obs: 'Participacao ativa, economicamente com a contribuicao sindical e mensalidade associativa e institucional', presidente: 'Lucas Carrapatoso Coelho Simoes' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE CONFECCOES DE ROUPAS E CHAPEUS E MATERIAL DE SEGURANCA', afinidade: null, validade: 'Inicio: 15/12/2020 - Termino: 13/12/2023', obs: 'Participacao ativa, institucionalmente, durante reunioes e eventos', presidente: 'Davis Benzecry' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE INSTALACOES ELETRICAS, GAS, HIDRAULICAS E SANITARIAS DE MANAUS', afinidade: null, validade: 'Inicio: 05/05/2018 - Termino: 25/05/2021', obs: 'Participacao ativa, economicamente com a contribuicao sindical e mensalidade associativa e institucional', presidente: 'Agostinho de Oliveira Freitas Junior' },
  { nome: 'SINDICATO DA INDUSTRIA DE MARCENARIAS DE MANAUS', afinidade: null, validade: 'Inicio: 19/10/2018 - Termino: 19/10/2021', obs: 'Participacao ativa, institucionalmente, durante reunioes e eventos. Na parte economica o Sindicato nao contribui', presidente: 'Roberto Benedito de Almeida' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE MASSAS ALIMENTICIAS E BISCOITOS DE MANAUS', afinidade: null, validade: 'Inicio: 03/10/2019 - Termino: 03/10/2022', obs: 'Sem participacao ativa', presidente: 'Americo Augusto Souto Rodrigues Esteves' },
  { nome: 'SINDICATO DA INDUSTRIA DE OLARIA DO ESTADO DO AMAZONAS', afinidade: null, validade: 'Inicio: 18/04/2019 - Termino: 18/04/2024', obs: 'Participacao moderada institucionalmente, durante reunioes e eventos', presidente: 'Francisco Alves Belfort' },
  { nome: 'SINDICATO DAS INDUSTRIAS QUIMICAS E FARMACEUTICAS DE MANAUS', afinidade: null, validade: 'Inicio: 07/12/2018 - Termino: 07/12/2021', obs: 'Participacao moderada institucionalmente, durante reunioes e eventos', presidente: 'Antonio Carlos da Silva' },
  { nome: 'SINDICATO DA INDUSTRIA DE SERRARIAS E CARPINTARIAS NO ESTADO DO AMAZONAS', afinidade: null, validade: 'Inicio: 23/04/2019 - Termino: 22/04/2022', obs: 'Participacao moderada institucionalmente, durante reunioes e eventos', presidente: 'Miron Osmario Fogaca' },
  { nome: 'SINDICATO DA CONSTRUCAO DO ESTADO DO AMAZONAS', afinidade: null, validade: 'Inicio: 01/11/2018 - Termino: 01/11/2021', obs: 'Participacao moderada institucionalmente, durante reunioes e eventos', presidente: 'Antonio Otavio Moraes Souza' },
  { nome: 'SINDICATO DAS EMPRESAS JORNALISTICAS DO ESTADO DO AMAZONAS', afinidade: null, validade: 'Inicio: 01/01/2018 - Termino: 31/12/2021', obs: 'Participacao moderada institucionalmente, durante reunioes e eventos', presidente: 'Socrates Bompim Neto' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE CALCADOS DE MANAUS', afinidade: null, validade: 'Inicio: 24/08/2018 - Termino: 24/08/2021', obs: 'Participacao moderada institucionalmente, durante reunioes e eventos', presidente: 'Aldimar Jose Diger Paes' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE GRAVURAS E ENCADERNACAO NO ESTADO DO AMAZONAS', afinidade: null, validade: 'Inicio: 15/11/2018 - Termino: 15/11/2021', obs: 'Participacao moderada institucionalmente, durante reunioes e eventos', presidente: 'Augusto Valdemar da Silva' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE MADEIRAS COMPENSADAS E LAMINADAS NO ESTADO DO AMAZONAS', afinidade: null, validade: null, obs: 'Nao tem presidente. Sindicato com suas acoes paralisadas (falecimento Dr. Moises Israel)', presidente: null },
  { nome: 'SINDICATO DAS INDUSTRIAS DE MEIOS MAGNETICOS E FOTOGRAFICOS DO ESTADO DO AMAZONAS', afinidade: null, validade: 'Inicio: 01/07/2020 - Termino: 30/06/2023', obs: 'Participacao moderada institucionalmente, durante reunioes e eventos', presidente: 'Ammauri Carlos Blanco' },
  { nome: 'SINDICATO DE PANIFICACAO E CONFEITARIA DO ESTADO DO AMAZONAS - SINDPAM', afinidade: null, validade: 'Inicio: 17/03/2020 - Termino: 17/03/2023', obs: 'Participacao ativa, economicamente e institucionalmente, durante reunioes e eventos', presidente: 'Alexandre Russo da Silva' },
  { nome: 'SINDICATO DAS INDUSTRIAS GRAFICAS DO ESTADO DO AMAZONAS', afinidade: null, validade: 'Inicio: 22/12/2020 - Termino: 22/12/2023', obs: 'Participacao ativa, economicamente e institucionalmente', presidente: 'Roberto de Lima Carvalha Filho' },
  { nome: 'SINDICATO DAS INDUSTRIAS METALURGICAS, MECANICAS E DE MATERIAL ELETRICO DE MANAUS', afinidade: null, validade: 'Inicio: 14/12/2020 - Termino: 14/12/2024', obs: 'Participacao ativa, economicamente e institucionalmente, durante reunioes e eventos', presidente: 'Nelson Azevedo dos Santos' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE MATERIAIS PLASTICOS', afinidade: null, validade: null, obs: 'Participacao ativa, institucionalmente', presidente: 'Antonio Carolino Silva de Souza' },
  { nome: 'SINDICATO DA INDUSTRIA DA CONSTRUCAO NAVAL, NAUTICA, OFFSHORE E REPAROS DO AMAZONAS', afinidade: null, validade: 'Inicio: 19/11/2019 - Termino: 01/11/2022', obs: 'Participacao ativa, economicamente e institucionalmente, durante reunioes e eventos', presidente: 'Irani Bertolini' },
  { nome: 'SINDICATO DA INDUSTRIA DE APARELHOS ELETRICOS, ELETRONICOS E SIMILARES DE MANAUS', afinidade: null, validade: 'Inicio: 01/11/2020 - Termino: 01/11/2023', obs: 'Participacao ativa, economicamente com a contribuicao sindical e mensalidade associativa e institucional', presidente: 'Aldo Oliveira da Silva' },
  { nome: 'SINDICATO DA INDUSTRIA DE BRINQUEDOS DO ESTADO DO AMAZONAS', afinidade: null, validade: null, obs: 'Nao tem presidente. Sindicato com suas acoes paralisadas. Informacao DRT: empresa foi vendida. Sr. Roberto Favero nao mora em Manaus', presidente: 'Roberto Favero' },
  { nome: 'SINDICATO DA INDUSTRIA DA EXTRACAO DE BORRACHA DO ESTADO DO AMAZONAS', afinidade: null, validade: null, obs: 'Atuacao Sindical parada no momento por questoes financeiras', presidente: 'Carlos Astrogilo Bernardo Cruz' },
  { nome: 'SINDICATO DAS INDUSTRIAS DE LATICINIOS E SIMILARES DO ESTADO DO AMAZONAS', afinidade: null, validade: null, obs: null, presidente: 'Wagner de Souza' },
  { nome: 'FEDERACAO DAS INDUSTRIAS DO ESTADO DO AMAZONAS', afinidade: 'ALTO', validade: 'Inicio: 02/04/2024', obs: 'A FIEAM representa as empresas INORGANIZADAS em SINDICATOS no Amazonas, e atua de forma significativa', presidente: 'Antonio Silva' },
];

const run = db.transaction(() => {
  for (const d of dados) {
    const r = insertSind.run(d.nome, 'patronal', d.afinidade, d.validade, d.obs);
    if (d.presidente) insertPres.run(r.lastInsertRowid, d.presidente);
    console.log('OK:', r.lastInsertRowid, '-', d.nome.slice(0, 60));
  }
});
run();
db.close();
