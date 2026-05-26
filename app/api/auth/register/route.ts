import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

const DOMINIO_PERMITIDO = "@fieam.org.br";
const ADMINS_INICIAIS = ["danielle.sa@fieam.org.br"];

export async function POST(request: NextRequest) {
  const { email, nome, senha } = await request.json();

  if (!email || !nome || !senha) {
    return Response.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
  }

  if (!email.toLowerCase().endsWith(DOMINIO_PERMITIDO)) {
    return Response.json(
      { error: `Somente e-mails ${DOMINIO_PERMITIDO} são permitidos` },
      { status: 403 }
    );
  }

  if (senha.length < 6) {
    return Response.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 });
  }

  const existente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
  if (existente) {
    return Response.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const perfil = ADMINS_INICIAIS.includes(email.toLowerCase()) ? "admin" : "visualizador";
  const usuario = await prisma.usuario.create({
    data: { email: email.toLowerCase(), nome, senhaHash, perfil },
  });

  const token = await signToken({ id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil });

  return Response.json(
    { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil },
    {
      status: 201,
      headers: {
        "Set-Cookie": `token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`,
      },
    }
  );
}
