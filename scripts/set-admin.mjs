import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

const EMAIL = "danielle.silva.sa@fieam.org.br";

const existente = await prisma.usuario.findUnique({ where: { email: EMAIL } });

if (existente) {
  await prisma.usuario.update({ where: { email: EMAIL }, data: { perfil: "admin" } });
  console.log(`✓ Usuário ${EMAIL} atualizado para admin.`);
} else {
  console.log(`Usuário ${EMAIL} ainda não tem conta. Ao criar a conta, vou garantir que seja admin automaticamente.`);
}

await prisma.$disconnect();
