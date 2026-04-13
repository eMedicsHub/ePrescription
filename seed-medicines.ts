import { disconnectSeedDb, prisma } from "./prisma/seed-utils.ts";

export async function seedMedicines() {
  const medicineNames = ["Paracetamol", "Ibuprofen", "Amoxicillin"];
  for (const name of medicineNames) {
    await prisma.medicine.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded medicines: ${medicineNames.join(", ")}`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || 
    import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  seedMedicines()
    .then(async () => {
      await disconnectSeedDb();
    })
    .catch(async (error) => {
      console.error("Medicine seed failed:", error);
      await disconnectSeedDb();
      process.exit(1);
    });
}
