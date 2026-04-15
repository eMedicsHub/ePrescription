import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const rawSchema = process.env.TENANT_ID || 'public'
const dbSchema = rawSchema.toLowerCase().replace(/[^a-z0-9_]/g, '_')

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
})

pool.on('connect', async (client) => {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${dbSchema}"`)
    await client.query(`SET search_path TO "${dbSchema}"`)
})

const adapter = new PrismaPg(pool, { schema: dbSchema })
const prisma = new PrismaClient({ adapter })

async function main() {
    const email = 'admin@example.com'
    const name = 'Admin User'

    // Check if an admin exists first
    const existingAdmin = await prisma.admin.findFirst({
        where: { email }
    })

    if (existingAdmin) {
        const admin = await prisma.admin.update({
            where: { id: existingAdmin.id },
            data: { role: 'ADMIN', isApproved: true },
        })
        console.log('Admin promoted/updated:', admin)
    } else {
        const admin = await prisma.admin.create({
            data: {
                email,
                name,
                password: 'adminpassword', // In a real app, this should be hashed
                role: 'ADMIN',
                isApproved: true,
            },
        })
        console.log('Admin user created:', admin)
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
        pool.end()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        pool.end()
        process.exit(1)
    })
