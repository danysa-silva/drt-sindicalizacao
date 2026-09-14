/**
 * Converte um parâmetro de rota dinâmica (ex: [id]) em número inteiro,
 * retornando null quando o valor não é um ID válido (ex: "abc", "-1", "1.5").
 */
export function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
