import { disconnectSeedDb } from "./seed-utils";
import { seedAdminUsers } from "./seed-super-admin";
import { seedMedicines } from "./seed-medicines";

async function main() {
  await seedAdminUsers();
  await seedMedicines();
  console.log("All seeds completed");
}

main()
  .then(async () => {
    await disconnectSeedDb();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await disconnectSeedDb();
    process.exit(1);
  });
