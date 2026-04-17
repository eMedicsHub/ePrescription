import { prisma } from "./seed-utils.ts";

export async function seedPatientFoundation() {
  const patients = await prisma.patient.findMany({
    select: { id: true, user: { select: { name: true } } },
    take: 25,
  });

  for (const patient of patients) {
    await prisma.patientLifestyleProfile.upsert({
      where: { patientId: patient.id },
      update: {},
      create: {
        patientId: patient.id,
        activityLevel: "Moderate",
        smokingStatus: "Never",
        alcoholUse: "Occasional",
      },
    });

    const contactName = `${patient.user.name} - Emergency`;
    const existingContact = await prisma.patientEmergencyContact.findFirst({
      where: { patientId: patient.id, isPrimary: true },
      select: { id: true },
    });

    if (!existingContact) {
      await prisma.patientEmergencyContact.create({
        data: {
          patientId: patient.id,
          name: contactName,
          relationship: "Family",
          phone: "000-000-0000",
          isPrimary: true,
        },
      });
    }

    const existingVital = await prisma.patientVital.findFirst({
      where: { patientId: patient.id },
      select: { id: true },
    });

    if (!existingVital) {
      await prisma.patientVital.create({
        data: {
          patientId: patient.id,
          heightCm: 170,
          weightKg: 70,
          systolicBp: 120,
          diastolicBp: 80,
          pulseBpm: 72,
          spo2Percent: 98,
          notes: "Baseline seed vital snapshot.",
        },
      });
    }
  }

  console.log(`Patient foundation seed completed for ${patients.length} patient(s)`);
}
