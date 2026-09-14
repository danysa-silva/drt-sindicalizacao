import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, buildTokenCookie } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api-handler";

const ADMINS_INICIAIS = ["danielle.sa@fieam.org.br"];

const DOMINIOS_PERMITIDOS = [
  "@fieam.org.br",
  "@sesi.org.br",
  "@senai.org.br",
];

function dominioPermitido(email: string): boolean {
  const e = email.toLowerCase();
  return DOMINIOS_PERMITIDOS.some((d) => e.endsWith(d));
}

const registerSchema = z.object({
  nome: z
    .string({ error: "Nome é obrigatório" })
    .trim()
    .min(1, { message: "Nome não pode ser vazio" }),
  email: z
    .string({ error: "E-mail é obrigatório" })
    .trim()
    .toLowerCase()
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Formato de e-mail inválido",
    }),
  senha: z
    .string({ error: "Senha é obrigatória" })
    .min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

async function POST_handler(request: NextRequest) {
  const body = await request.json();
  const resultado = registerSchema.safeParse(body);
  if (!resultado.success) {
    const mensagem = resultado.error.issues[0]?.message ?? "Dados inválidos";
    return Response.json({ error: mensagem }, { status: 400 });
  }

  const { nome, email, senha } = resultado.data;

  if (!dominioPermitido(email)) {
    return Response.json(
      { error: "Somente e-mails @fieam.org.br, @sesi.org.br ou @senai.org.br são aceitos" },
      { status: 403 }
    );
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return Response.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const ehAdminInicial = ADMINS_INICIAIS.includes(email);
  const perfil = ehAdminInicial ? "admin" : "visualizador";
  const status = ehAdminInicial ? "aprovado" : "pendente";
  const usuario = await prisma.usuario.create({
    data: { email, nome, senhaHash, perfil, status },
  });

  if (usuario.status === "pendente") {
    return Response.json(
      {
        pendente: true,
        message: "Cadastro realizado com sucesso. Aguarde a aprovação de um administrador para acessar o sistema.",
      },
      { status: 201 }
    );
  }

  const token = await signToken({ id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil });

  return Response.json(
    { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil },
    {
      status: 201,
      headers: {
        "Set-Cookie": buildTokenCookie(token),
      },
    }
  );
}

export const POST = withErrorHandling(POST_handler);
