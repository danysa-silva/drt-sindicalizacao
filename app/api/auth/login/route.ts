import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, buildTokenCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { email, senha } = await request.json();

  if (!email || !senha) {
    return Response.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
  if (!usuario) {
    return Response.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  const agora = new Date();

  if (usuario.bloqueadoAte && usuario.bloqueadoAte > agora) {
    return Response.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);

  if (!senhaCorreta) {
    const baseAttempts = usuario.bloqueadoAte && usuario.bloqueadoAte <= agora ? 0 : usuario.loginAttempts;
    const novasAttempts = baseAttempts + 1;
    const novoBloqueio = novasAttempts >= 5 ? new Date(agora.getTime() + 15 * 60 * 1000) : null;

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { loginAttempts: novasAttempts, bloqueadoAte: novoBloqueio },
    });

    return Response.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { loginAttempts: 0, bloqueadoAte: null },
  });

  const token = await signToken({ id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil });

  return Response.json(
    { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil },
    {
      headers: {
        "Set-Cookie": buildTokenCookie(token),
      },
    }
  );
}
