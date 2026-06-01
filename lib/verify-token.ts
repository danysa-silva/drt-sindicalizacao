import { jwtVerify } from "jose";

export type TokenPayload = {
  id: number;
  email: string;
  nome: string;
  perfil: string;
};

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("JWT_SECRET não configurado");
const SECRET = new TextEncoder().encode(jwtSecret);

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
