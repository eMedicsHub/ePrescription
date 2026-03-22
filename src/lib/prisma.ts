import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prismaClientSingleton = () => {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
    })
    // Add a listener to set the search path for every new client in the pool
    pool.on('connect', (client) => {
        client.query('SET search_path TO eprescription')
    })
    const adapter = new PrismaPg(pool, { schema: 'eprescription' })
    const client = new PrismaClient({ adapter })
    console.log("Prisma Models:", Object.keys(client).filter(k => !k.startsWith('_') && !k.startsWith('$')))
    return client
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
