import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const medicine = await prisma.medicine.upsert({
        where: { name: 'Paracetamol' },
        update: {},
        create: {
            name: 'Paracetamol',
        },
    })
    console.log({ medicine })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
