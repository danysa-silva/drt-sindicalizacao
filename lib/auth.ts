import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("JWT_SECRET não configurado");
const SECRET = new TextEncoder().encode(jwtSecret);

export type TokenPayload = {
  id: number;
  email: string;
  nome: string;
  perfil: string;
};

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function buildTokenCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`;
}

export function buildLogoutCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function podeAlterar(perfil: string | null | undefined): boolean {
  const p = perfil?.trim().toLowerCase() ?? "";
  return p === "admin" || p === "editor";
}

export async function getUsuarioFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  // Busca perfil atualizado do banco para não depender do token antigo
  const { prisma } = await import("./prisma");
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, nome: true, perfil: true },
  });
  if (!usuario) return null;
  return usuario as TokenPayload;
}
