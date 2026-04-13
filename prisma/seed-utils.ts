import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const dbSchema = process.env.DB_SCHEMA || "public";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("connect", (client) => {
  client.query(`SET search_path TO ${dbSchema}`);
});

const adapter = new PrismaPg(pool, { schema: dbSchema });
export const prisma = new PrismaClient({ adapter });

export async function upsertUser(params: {
  email: string;
  name: string;
  rawPassword: string;
  role: Role;
}) {
  const password = await bcrypt.hash(params.rawPassword, 10);
  await prisma.user.upsert({
    where: { email: params.email },
    update: { name: params.name, password, role: params.role, isApproved: true },
    create: {
      email: params.email,
      name: params.name,
      password,
      role: params.role,
      isApproved: true,
    },
  });
}

export async function disconnectSeedDb() {
  await prisma.$disconnect();
  await pool.end();
}
