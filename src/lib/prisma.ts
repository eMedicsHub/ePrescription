import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
    const dbSchema = process.env.DB_SCHEMA || 'public'
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
    })

    pool.on('connect', (client) => {
        client.query(`SET search_path TO ${dbSchema}`)
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
