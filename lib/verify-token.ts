import { jwtVerify } from "jose";

export type TokenPayload = {
  id: number;
  email: string;
  nome: string;
  perfil: string;
};

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "drt-fieam-sindicalizacao-2026"
);

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
