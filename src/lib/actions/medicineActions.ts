'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addMedicine(formData: FormData) {
    // ensure only admins can add medicines
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    if (!session || !( (session.user as any).role === 'ADMIN' || (session.user as any).role === 'SUPER_ADMIN')) {
        return { error: 'Unauthorized' }
    }

    const name = formData.get('name') as string

    if (!name) {
        return { error: 'Medicine name is required' }
    }

    try {
        const medicine = await prisma.medicine.create({
            data: {
                name: name.trim(),
            },
        })
        revalidatePath('/dashboard/admin')
        return { success: `Medicine "${medicine.name}" added successfully` }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { error: 'Medicine already exists' }
        }
        return { error: 'Failed to add medicine' }
    }
}
