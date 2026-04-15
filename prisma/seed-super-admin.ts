import { AdminRole } from "@prisma/client";
import { disconnectSeedDb, upsertAdmin } from "./seed-utils.ts";

export async function seedAdminUsers() {
  await upsertAdmin({
    email: process.env.SUPER_ADMIN_EMAIL ?? "admin",
    name: process.env.SUPER_ADMIN_NAME ?? "Super Admin",
    rawPassword: process.env.SUPER_ADMIN_PASSWORD ?? "admin",
    role: AdminRole.SUPER_ADMIN,
  });

  await upsertAdmin({
    email: process.env.ADMIN_EMAIL ?? "admin@example.com",
    name: process.env.ADMIN_NAME ?? "Admin User",
    rawPassword: process.env.ADMIN_PASSWORD ?? "admin123",
    role: AdminRole.ADMIN,
  });

  console.log("Seeded admin users (SUPER_ADMIN + ADMIN)");
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || 
    import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  seedAdminUsers()
    .then(async () => {
      await disconnectSeedDb();
    })
    .catch(async (error) => {
      console.error("Admin user seed failed:", error);
      await disconnectSeedDb();
      process.exit(1);
    });
}
