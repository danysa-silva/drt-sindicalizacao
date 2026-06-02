# RELATÓRIO TÉCNICO
## Correções de Segurança, Validação e Dependências
### Sistema drt-sindicalizacao

| Campo | Descrição |
|---|---|
| **Projeto** | drt-sindicalizacao |
| **Tecnologias** | Next.js 16 (App Router), Prisma 7, SQLite/Supabase, JWT |
| **Escopo** | Segurança de rotas, autenticação, validação de dados, importação CSV e dependências |
| **Data** | 02/06/2026 |
| **Responsável técnico** | Danielle Sá — DRT/FIEAM |

> Documento revisado e formatado para registro técnico interno, com ajustes de clareza, atualização do status do npm audit e organização executiva das entregas.

---

## Sumário

- [1. Resumo executivo](#1-resumo-executivo)
- [2. Vulnerabilidades e riscos tratados](#2-vulnerabilidades-e-riscos-tratados)
- [3. Correções implementadas por frente](#3-correções-implementadas-por-frente)
- [4. Benefícios técnicos alcançados](#4-benefícios-técnicos-alcançados)
- [5. Resultado do npm audit](#5-resultado-do-npm-audit)
- [6. Commits relevantes](#6-commits-relevantes)
- [7. Recomendações para próximas etapas](#7-recomendações-para-próximas-etapas)
- [8. Observações de governança técnica](#8-observações-de-governança-técnica)

---

## 1. Resumo executivo

Este relatório registra a rodada de correções técnicas aplicadas ao sistema `drt-sindicalizacao`, com foco em segurança, integridade de dados, validação de entradas e saneamento de dependências. O sistema apoia a gestão de empresas sindicalizadas, sindicatos, conselhos, presidentes e usuários, utilizando Next.js 16, Prisma 7, autenticação JWT e banco SQLite/Supabase.

As alterações foram conduzidas de forma incremental, com commits separados por tema, validação por build e revisão do status do Git a cada etapa. O pacote entregue reduz riscos de acesso indevido, melhora a consistência dos dados e remove a vulnerabilidade de severidade alta associada à biblioteca `xlsx`.

| Frente | Resultado consolidado |
|---|---|
| **Autorização** | Rotas de mutação protegidas com autenticação e regra de perfil; padrão 401/403 aplicado. |
| **JWT** | Fallback hardcoded removido; `JWT_SECRET` passa a ser obrigatório. |
| **Cookies** | Cookies centralizados e com `Secure` em produção. |
| **Login** | Bloqueio por 5 tentativas inválidas e janela de 15 minutos. |
| **Validação** | Zod v4 aplicado nas principais rotas de entrada e mutação. |
| **Importação CSV** | Validação de extensão, tamanho, CNPJ e datas. |
| **Dependências** | `xlsx` removido e exportação migrada para CSV nativo. |

---

## 2. Vulnerabilidades e riscos tratados

| Risco tratado | Impacto mitigado |
|---|---|
| Autorização frágil em rotas sensíveis | Rotas de criação, edição, exclusão e importação possuíam proteção ausente ou incompleta, permitindo risco de alteração indevida de dados. |
| Fallback inseguro de `JWT_SECRET` | Existia segredo previsível no código, usado caso a variável de ambiente não estivesse configurada. |
| Cookies sem configuração suficiente | Cookies não incluíam `Secure` em produção e havia risco de inconsistência entre criação e logout. |
| Ausência de bloqueio de login | A rota de login não limitava tentativas, expondo o sistema a força bruta e credential stuffing. |
| Entradas sem validação robusta | Campos como CNPJ, datas, e-mails e IDs podiam chegar inválidos ao Prisma, causando erro 500 ou dados inconsistentes. |
| Importação CSV vulnerável | Arquivo sem limite de tamanho, sem validação de extensão e com CNPJ/datas tratados de forma permissiva. |
| Biblioteca `xlsx` vulnerável | Uso de `xlsx` gerava vulnerabilidade alta no `npm audit` e poderia ser substituído por CSV nativo. |

---

## 3. Correções implementadas por frente

### 3.1 Autorização

Foi criada a função auxiliar `podeAlterar(perfil)`, centralizando a regra de escrita para os perfis `admin` e `editor`. A validação normaliza o perfil com `trim().toLowerCase()` e tolera valores nulos ou indefinidos.

- **401** quando não há usuário autenticado — mensagem: `"Não autenticado"`
- **403** quando há usuário autenticado sem permissão — mensagem: `"Acesso negado"`
- A rota `api/usuarios/[id]` permaneceu restrita ao perfil `admin`, por alterar dados sensíveis de acesso.

| Frente | Arquivos envolvidos |
|---|---|
| Autorização | `lib/auth.ts`; rotas de sindicatos, conselhos, empresas, presidentes, importação e `usuarios/[id]` |

---

### 3.2 JWT

Foi removido o fallback hardcoded do segredo JWT. O sistema agora falha de forma explícita quando `JWT_SECRET` não estiver configurado, impedindo a operação silenciosa com segredo previsível.

- **Arquivos alterados:** `lib/auth.ts` e `lib/verify-token.ts`
- **Resultado:** redução de risco de forja de tokens e melhoria na governança de variáveis de ambiente

---

### 3.3 Cookies de autenticação

A montagem dos cookies foi centralizada em funções auxiliares, evitando strings duplicadas e divergências entre login, cadastro e logout.

| Função | Finalidade |
|---|---|
| `buildTokenCookie(token)` | Cria o cookie de autenticação com `HttpOnly`, `Path=/`, `Max-Age=604800`, `SameSite=Lax` e `Secure` em produção. |
| `buildLogoutCookie()` | Remove o cookie com `Max-Age=0` e mantém os mesmos atributos, incluindo `Secure` em produção. |

---

### 3.4 Bloqueio por tentativas de login

Foi implementado controle persistente por banco de dados, compatível com ambientes serverless e multi-instância. A solução evita depender de memória local do processo.

| Campo | Uso |
|---|---|
| `loginAttempts` | Contador de falhas consecutivas. |
| `bloqueadoAte` | Data/hora até quando o usuário permanece bloqueado. |

- Bloqueio após **5 tentativas inválidas**
- Janela de bloqueio de **15 minutos**
- Retorno **429** quando o bloqueio está ativo
- Reset de tentativas após login bem-sucedido

---

### 3.5 Validação com Zod

Foi instalado Zod v4 e aplicado um padrão de `safeParse` nas rotas de mutação, com retorno 400 e mensagens claras quando os dados recebidos não atendem às regras esperadas.

```typescript
const resultado = schema.safeParse(body);
if (!resultado.success) {
  const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
  return Response.json({ error: mensagem }, { status: 400 });
}
```

| Entidade | Validações implementadas |
|---|---|
| Empresa | CNPJ 14 dígitos; razão social; `sindicatoId` positivo; datas válidas; opcionais tratados. |
| Sindicato | Nome com `.trim()`; tipo `"patronal"` por padrão; CNPJ opcional 14 dígitos; mandato válido. |
| Conselho | Nome com `.trim()`; tipo padrão; IDs opcionais normalizados; e-mail validado. |
| Presidente | Nome com `.trim()`; e-mail validado; datas opcionais validadas e convertidas para `Date`. |
| Cadastro | Nome com `.trim()`; e-mail normalizado e validado; senha mínima; regra de domínio preservada. |

---

### 3.6 Importação CSV

A rota de importação manteve o processamento linha a linha com acumulação de erros, mas passou a rejeitar arquivos e registros com falhas críticas antes de persistir dados inconsistentes.

| Correção | Resultado |
|---|---|
| Extensão `.csv` obrigatória | Arquivos com outra extensão retornam 400 antes do `arrayBuffer()`. |
| Limite de 5 MB | Redução de risco de consumo excessivo de memória. |
| CNPJ com 14 dígitos | Registros com CNPJ inválido são registrados como erro de linha. |
| Datas inválidas | Campos preenchidos e inválidos geram erro de linha; campos ausentes mantêm o comportamento padrão. |

---

### 3.7 Remoção do `xlsx` e exportação CSV nativa

A exportação de empresas foi migrada de `.xlsx` para `.csv` nativo, sem dependência externa. A mudança preserva a capacidade de abertura no Excel e elimina a dependência vulnerável.

- Função `exportarCSV()` substituiu `exportarExcel()`
- Separador `;` adotado para compatibilidade com Excel em PT-BR
- Campos escapados conforme padrão CSV, com duplicação de aspas internas
- BOM UTF-8 incluído para preservar acentuação no Excel
- `xlsx` removido do código e das dependências do projeto

---

## 4. Benefícios técnicos alcançados

| Benefício | Descrição |
|---|---|
| Redução de acesso indevido | Rotas de mutação exigem autenticação válida e perfil adequado; gerenciamento de usuários sob controle exclusivo de `admin`. |
| Melhoria da integridade dos dados | Campos críticos passam a ser validados antes de chegar ao Prisma, reduzindo inconsistências. |
| Prevenção de erros 500 | Entradas inválidas retornam 400 com mensagens claras, evitando exceções não tratadas. |
| Autenticação mais segura | JWT sem fallback, cookies com `Secure` em produção e bloqueio por tentativas de login. |
| Redução de vulnerabilidade alta | `xlsx` foi removido e substituído por CSV nativo. |
| Rastreabilidade | Correções foram separadas por commits temáticos, facilitando auditoria e rollback seletivo. |

---

## 5. Resultado do npm audit

Após a remoção do `xlsx`, a vulnerabilidade de severidade alta foi eliminada do relatório de auditoria. Permanecem vulnerabilidades moderadas associadas a dependências transitivas internas de Next.js/PostCSS e Prisma/@hono.

| Item | Status |
|---|---|
| `xlsx` | Removido do código, do `package.json` e do `package-lock.json`; vulnerabilidade alta eliminada. |
| Next.js / PostCSS | Vulnerabilidade moderada transitiva; `npm audit fix --force` sugeria alteração incompatível de versão. |
| Prisma / `@hono` | Vulnerabilidade moderada transitiva; correção automática sugeria breaking change/downgrade. |
| `npm audit fix --force` | **Não executado** por risco técnico superior ao benefício imediato. |

> **Decisão técnica:** manter as vulnerabilidades moderadas em observação e aguardar atualização segura dos pacotes principais, evitando downgrade ou troca de versões incompatíveis.

---

## 6. Commits relevantes

| Commit | Descrição |
|---|---|
| `fix: adiciona autorização nas rotas de alteração` | Criação de `podeAlterar` e aplicação do padrão 401/403 em rotas de mutação. |
| `fix: remove fallback inseguro do JWT secret` | `JWT_SECRET` passa a ser obrigatório, sem fallback hardcoded. |
| `fix: configura cookies seguros de autenticação` | Centralização dos cookies e `Secure` em produção. |
| `fix: adiciona bloqueio por tentativas de login` | Campos no Prisma e lógica de bloqueio na rota de login. |
| `chore: adiciona zod para validação de dados` | Instalação do Zod v4. |
| `fix: valida dados das rotas de empresas` | Schemas Zod em empresas POST/PUT. |
| `fix: valida dados das rotas de sindicatos` | Schemas Zod em sindicatos POST/PUT. |
| `fix: valida dados das rotas de conselhos` | Schemas Zod em conselhos POST/PUT. |
| `fix: valida dados das rotas de presidentes` | Schemas Zod em presidentes POST/PUT. |
| `fix: valida dados da rota de cadastro` | Schema Zod em `auth/register`. |
| `fix: valida arquivo e dados da importacao csv` | Validação de extensão, tamanho, CNPJ e datas na importação. |
| `fix: remove xlsx e exporta empresas em csv` | Remoção do `xlsx` e exportação CSV nativa. |

---

## 7. Recomendações para próximas etapas

1. **Revisar vulnerabilidades moderadas** somente quando houver atualização segura e estável de Next.js e Prisma, sem uso de `npm audit fix --force`.
2. **Criar testes automatizados** para autenticação, autorização, bloqueio de login e validações críticas.
3. **Validar manualmente a importação CSV** com arquivos reais do Excel, cobrindo CNPJ inválido, datas inválidas e linhas parcialmente preenchidas.
4. **Revisar a regra de criação automática de sindicatos** durante a importação, avaliando se deve gerar aviso ou exigir correspondência prévia.
5. **Avaliar centralização futura dos schemas Zod** em uma pasta dedicada, como `lib/schemas/`, para reduzir duplicidade entre rotas POST e PUT.
6. **Garantir `JWT_SECRET` criptograficamente seguro em produção**, gerado com 32 bytes aleatórios em base64.

---

## 8. Observações de governança técnica

A rodada de correções adotou estratégia incremental e conservadora: cada mudança foi limitada a um escopo específico, validada com `npm run build`, registrada em commit próprio e enviada à branch `main` após confirmação do working tree limpo. Esse processo aumenta a rastreabilidade, reduz risco de regressão e facilita comunicação com gestão e auditoria interna.

Para futuras correções de dependências, recomenda-se priorizar atualizações compatíveis e evitar comandos automáticos com `--force` sem análise prévia, especialmente em projetos com versões recentes de Next.js e Prisma.

---

> **Conclusão:** o pacote entregue reduz riscos críticos de segurança e fortalece a confiabilidade operacional do sistema, mantendo estabilidade técnica comprovada por builds bem-sucedidos e histórico de commits organizado.
