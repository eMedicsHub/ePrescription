import { disconnectSeedDb } from "./seed-utils.ts";
import { seedAdminUsers } from "./seed-super-admin.ts";
import { seedMedicines } from "./seed-medicines.ts";
import { seedPatientFoundation } from "./seed-patient-foundation.ts";

async function main() {
  await seedAdminUsers();
  await seedMedicines();
  await seedPatientFoundation();
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
