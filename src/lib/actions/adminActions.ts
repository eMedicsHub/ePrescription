'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcrypt'

export async function createAdminUser(formData: FormData) {
    // ensure only a super-admin can call this action
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
        return { error: 'Unauthorized' }
    }

    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const password = formData.get('password') as string

    if (!email || !name || !password) {
        return { error: 'All fields are required' }
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10)

        const admin = await prisma.admin.create({
            data: {
                email: email.trim().toLowerCase(),
                name: name.trim(),
                password: hashedPassword,
                role: 'ADMIN',
                isApproved: true,
            },
        })

        revalidatePath('/dashboard/admin')
        return { success: `Admin user "${admin.name}" (${admin.email}) created successfully` }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { error: 'Email or username already exists' }
        }
        return { error: 'Failed to create admin user' }
    }
}
