import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
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
    const client = new PrismaClient({ adapter })
    return client
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
