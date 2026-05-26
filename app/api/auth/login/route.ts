import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { email, senha } = await request.json();

  if (!email || !senha) {
    return Response.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
  if (!usuario) {
    return Response.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaCorreta) {
    return Response.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  const token = await signToken({ id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil });

  return Response.json(
    { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil },
    {
      headers: {
        "Set-Cookie": `token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`,
      },
    }
  );
}
