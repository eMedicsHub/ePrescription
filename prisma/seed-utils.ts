import { PrismaClient, AdminRole, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const rawSchema = process.env.TENANT_ID || "public";
const dbSchema = rawSchema.toLowerCase().replace(/[^a-z0-9_]/g, "_");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("connect", async (client) => {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`);
  await client.query(`SET search_path TO "${dbSchema}"`);
});

const adapter = new PrismaPg(pool, { schema: dbSchema });
export const prisma = new PrismaClient({ adapter });

export async function upsertAdmin(params: {
  email: string;
  name: string;
  rawPassword: string;
  role: AdminRole;
}) {
  const password = await bcrypt.hash(params.rawPassword, 10);
  const email = params.email.toLowerCase();
  const existingAdmin = await prisma.admin.findFirst({
    where: { email, role: params.role },
  });

  if (existingAdmin) {
    await prisma.admin.update({
      where: { id: existingAdmin.id },
      data: { name: params.name, password, role: params.role, isApproved: true },
    });
    return;
  }

  await prisma.admin.create({
    data: {
      email,
      name: params.name,
      password,
      role: params.role,
      isApproved: true,
    },
  });
}

export async function upsertUser(params: {
  email: string;
  name: string;
  rawPassword: string;
  role: Role;
}) {
  const password = await bcrypt.hash(params.rawPassword, 10);
  const email = params.email.toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: { email, role: params.role },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { name: params.name, password, role: params.role, isApproved: true },
    });
    return;
  }

  await prisma.user.create({
    data: {
      email,
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
