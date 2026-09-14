type Handler = (...args: never[]) => Promise<Response>;

/**
 * Envolve um handler de rota para nunca deixar uma exceção não tratada
 * (JSON inválido, ID malformado, erro do Prisma etc.) vazar como 500 cru.
 * Erros de sintaxe no corpo da requisição viram 400; qualquer outro erro
 * inesperado vira 500 genérico, sem detalhes internos, e é logado no servidor.
 */
export function withErrorHandling<T extends Handler>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return Response.json({ error: "Corpo da requisição inválido" }, { status: 400 });
      }
      console.error("Erro não tratado em rota de API:", error);
      return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
  }) as T;
}
