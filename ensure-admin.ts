import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
})

pool.on('connect', (client) => {
    client.query('SET search_path TO eprescription')
})

const adapter = new PrismaPg(pool, { schema: 'eprescription' })
const prisma = new PrismaClient({ adapter })

async function main() {
    const email = 'admin@example.com'
    const name = 'Admin User'

    // Check if user exists first to decide whether to create or update
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        const admin = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN', isApproved: true },
        })
        console.log('User promoted to ADMIN:', admin)
    } else {
        const admin = await prisma.user.create({
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
