import { PrismaClient, Role } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'
import bcrypt from 'bcrypt'

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
    const email = 'admin'
    const name = 'Super Admin'
    const password = await bcrypt.hash('admin', 10)

    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        console.log('Super Admin user already exists:', existingUser.email)
        // Ensure role and password are correct
        const admin = await prisma.user.update({
            where: { email },
            data: { role: Role.SUPER_ADMIN, password },
        })
        console.log('User guaranteed to be SUPER_ADMIN:', admin.email)
    } else {
        const admin = await prisma.user.create({
            data: {
                email,
                name,
                password,
                role: Role.SUPER_ADMIN,
            },
        })
        console.log('Super Admin user created:', admin.email)
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
