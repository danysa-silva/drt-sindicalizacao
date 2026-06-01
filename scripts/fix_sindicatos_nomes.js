const Database = require('better-sqlite3');
const db = new Database('c:/Users/danielle.sa/Documents/drt-sindicalizacao/dev.db');

const upd = db.prepare('UPDATE Sindicato SET nome = ?, validadeMandato = ?, observacoes = ? WHERE id = ?');
const updPres = db.prepare('UPDATE PresidenteSindicato SET nome = ? WHERE sindicatoId = ?');

const fixes = [
  { id: 73, nome: 'SINDICATO DAS INDÚSTRIAS DE ALIMENTAÇÃO DE MANAUS', validade: 'Início: 08/04/2023', obs: 'Participação ativa, economicamente com a contribuição sindical e mensalidade associativa e institucional', presidente: 'Pedro de Faria e Cunha Monteiro' },
  { id: 74, nome: 'SINDICATO DAS INDÚSTRIAS DE ARTEFATOS DE BORRACHAS E RECAUCHUTAGEM DO AMAZONAS', validade: 'Início: 11/10/2018 – Término: 11/10/2021', obs: 'Participação ativa, economicamente com a contribuição sindical e mensalidade associativa e institucional', presidente: 'Sebastião Montefusco Cavalcante Júnior' },
  { id: 75, nome: 'SINDICATO DAS INDÚSTRIAS DE BEBIDAS EM GERAL DO AMAZONAS', validade: 'Início: 28/09/2023 – Término: 28/09/2026', obs: 'Participação ativa, economicamente com a contribuição sindical e mensalidade associativa e institucional', presidente: 'Lucas Carrapatoso Coelho Simões' },
  { id: 76, nome: 'SINDICATO DAS INDÚSTRIAS DE CONFECÇÕES DE ROUPAS E CHAPÉUS E MATERIAL DE SEGURANÇA', validade: 'Início: 15/12/2020 – Término: 13/12/2023', obs: 'Participação ativa, institucionalmente, durante reuniões e eventos', presidente: 'Davis Benzecry' },
  { id: 77, nome: 'SINDICATO DAS INDÚSTRIAS DE INSTALAÇÕES ELÉTRICAS, GÁS, HIDRÁULICAS E SANITÁRIAS DE MANAUS', validade: 'Início: 05/05/2018 – Término: 25/05/2021', obs: 'Participação ativa, economicamente com a contribuição sindical e mensalidade associativa e institucional', presidente: 'Agostinho de Oliveira Freitas Júnior' },
  { id: 78, nome: 'SINDICATO DA INDÚSTRIA DE MARCENARIAS DE MANAUS', validade: 'Início: 19/10/2018 – Término: 19/10/2021', obs: 'Participação ativa, institucionalmente, durante reuniões e eventos. Na parte econômica o Sindicato não contribui', presidente: 'Roberto Benedito de Almeida' },
  { id: 79, nome: 'SINDICATO DAS INDÚSTRIAS DE MASSAS ALIMENTÍCIAS E BISCOITOS DE MANAUS', validade: 'Início: 03/10/2019 – Término: 03/10/2022', obs: 'Sem participação ativa', presidente: 'Américo Augusto Souto Rodrigues Esteves' },
  { id: 80, nome: 'SINDICATO DA INDÚSTRIA DE OLARIA DO ESTADO DO AMAZONAS', validade: 'Início: 18/04/2019 – Término: 18/04/2024', obs: 'Participação moderada institucionalmente, durante reuniões e eventos', presidente: 'Francisco Alves Belfort' },
  { id: 81, nome: 'SINDICATO DAS INDÚSTRIAS QUÍMICAS E FARMACÊUTICAS DE MANAUS', validade: 'Início: 07/12/2018 – Término: 07/12/2021', obs: 'Participação moderada institucionalmente, durante reuniões e eventos', presidente: 'Antonio Carlos da Silva' },
  { id: 82, nome: 'SINDICATO DA INDÚSTRIA DE SERRARIAS E CARPINTARIAS NO ESTADO DO AMAZONAS', validade: 'Início: 23/04/2019 – Término: 22/04/2022', obs: 'Participação moderada institucionalmente, durante reuniões e eventos', presidente: 'Miron Osmario Fogaça' },
  { id: 83, nome: 'SINDICATO DA CONSTRUÇÃO DO ESTADO DO AMAZONAS', validade: 'Início: 01/11/2018 – Término: 01/11/2021', obs: 'Participação moderada institucionalmente, durante reuniões e eventos', presidente: 'Antônio Otávio Moraes Souza' },
  { id: 84, nome: 'SINDICATO DAS EMPRESAS JORNALÍSTICAS DO ESTADO DO AMAZONAS', validade: 'Início: 01/01/2018 – Término: 31/12/2021', obs: 'Participação moderada institucionalmente, durante reuniões e eventos', presidente: 'Sócrates Bompim Neto' },
  { id: 85, nome: 'SINDICATO DAS INDÚSTRIAS DE CALÇADOS DE MANAUS', validade: 'Início: 24/08/2018 – Término: 24/08/2021', obs: 'Participação moderada institucionalmente, durante reuniões e eventos', presidente: 'Aldimar José Diger Paes' },
  { id: 86, nome: 'SINDICATO DAS INDÚSTRIAS DE GRAVURAS E ENCADERNAÇÃO NO ESTADO DO AMAZONAS', validade: 'Início: 15/11/2018 – Término: 15/11/2021', obs: 'Participação moderada institucionalmente, durante reuniões e eventos', presidente: 'Augusto Valdemar da Silva' },
  { id: 87, nome: 'SINDICATO DAS INDÚSTRIAS DE MADEIRAS COMPENSADAS E LAMINADAS NO ESTADO DO AMAZONAS', validade: null, obs: 'Não tem presidente. Sindicato com suas ações paralisadas (falecimento Dr. Moisés Israel)', presidente: null },
  { id: 88, nome: 'SINDICATO DAS INDÚSTRIAS DE MEIOS MAGNÉTICOS E FOTOGRÁFICOS DO ESTADO DO AMAZONAS', validade: 'Início: 01/07/2020 – Término: 30/06/2023', obs: 'Participação moderada institucionalmente, durante reuniões e eventos', presidente: 'Ammauri Carlos Blanco' },
  { id: 89, nome: 'SINDICATO DE PANIFICAÇÃO E CONFEITARIA DO ESTADO DO AMAZONAS – SINDPAM', validade: 'Início: 17/03/2020 – Término: 17/03/2023', obs: 'Participação ativa, economicamente e institucionalmente, durante reuniões e eventos', presidente: 'Alexandre Russo da Silva' },
  { id: 90, nome: 'SINDICATO DAS INDÚSTRIAS GRÁFICAS DO ESTADO DO AMAZONAS', validade: 'Início: 22/12/2020 – Término: 22/12/2023', obs: 'Participação ativa, economicamente e institucionalmente', presidente: 'Roberto de Lima Carvalha Filho' },
  { id: 91, nome: 'SINDICATO DAS INDÚSTRIAS METALÚRGICAS, MECÂNICAS E DE MATERIAL ELÉTRICO DE MANAUS', validade: 'Início: 14/12/2020 – Término: 14/12/2024', obs: 'Participação ativa, economicamente e institucionalmente, durante reuniões e eventos', presidente: 'Nelson Azevedo dos Santos' },
  { id: 92, nome: 'SINDICATO DAS INDÚSTRIAS DE MATERIAIS PLÁSTICOS', validade: null, obs: 'Participação ativa, institucionalmente', presidente: 'Antônio Carolino Silva de Souza' },
  { id: 93, nome: 'SINDICATO DA INDÚSTRIA DA CONSTRUÇÃO NAVAL, NÁUTICA, OFFSHORE E REPAROS DO AMAZONAS', validade: 'Início: 19/11/2019 – Término: 01/11/2022', obs: 'Participação ativa, economicamente e institucionalmente, durante reuniões e eventos', presidente: 'Irani Bertolini' },
  { id: 94, nome: 'SINDICATO DA INDÚSTRIA DE APARELHOS ELÉTRICOS, ELETRÔNICOS E SIMILARES DE MANAUS', validade: 'Início: 01/11/2020 – Término: 01/11/2023', obs: 'Participação ativa, economicamente com a contribuição sindical e mensalidade associativa e institucional', presidente: 'Aldo Oliveira da Silva' },
  { id: 95, nome: 'SINDICATO DA INDÚSTRIA DE BRINQUEDOS DO ESTADO DO AMAZONAS', validade: null, obs: 'Não tem presidente. Sindicato com suas ações paralisadas. Informação DRT: empresa foi vendida. Sr. Roberto Favero não mora em Manaus', presidente: 'Roberto Favero' },
  { id: 96, nome: 'SINDICATO DA INDÚSTRIA DA EXTRAÇÃO DE BORRACHA DO ESTADO DO AMAZONAS', validade: null, obs: 'Atuação Sindical parada no momento por questões financeiras', presidente: 'Carlos Astrogilo Bernardo Cruz' },
  { id: 97, nome: 'SINDICATO DAS INDÚSTRIAS DE LATICÍNIOS E SIMILARES DO ESTADO DO AMAZONAS', validade: null, obs: null, presidente: 'Wagner de Souza' },
  { id: 98, nome: 'FEDERAÇÃO DAS INDÚSTRIAS DO ESTADO DO AMAZONAS', validade: 'Início: 02/04/2024', obs: 'A FIEAM representa as empresas INORGANIZADAS em SINDICATOS no Amazonas, e atua de forma significativa', presidente: 'Antonio Silva' },
];

const run = db.transaction(() => {
  for (const f of fixes) {
    upd.run(f.nome, f.validade, f.obs, f.id);
    if (f.presidente) updPres.run(f.presidente, f.id);
    console.log('Atualizado:', f.id, '-', f.nome.slice(0, 60));
  }
});
run();
db.close();
