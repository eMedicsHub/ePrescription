import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Navbar from "@/components/ui/Navbar";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const { email, role, id } = session.user as any;

    const user = await prisma.user.findUnique({
        where: { id }
    });

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col">
            <Navbar />

            {/* Main content centered vertically and horizontally */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-8 border border-slate-100 w-full max-w-lg">
                    
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 m-0">{user.name}</h2>
                            <p className="text-slate-500 font-medium text-sm mt-1">{role}</p>
                        </div>
                    </div>

                    {/* View Details / Fake Form Area */}
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                            <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 shadow-sm">
                                {user.name}
                            </div>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                            <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 shadow-sm">
                                {user.email}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Role</label>
                            <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 shadow-sm flex items-center justify-between">
                                <span>{role} Portal Access</span>
                                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full uppercase tracking-wider">Active</span>
                            </div>
                        </div>

                        <div className="pt-4 mt-2">
                            <div className="p-4 bg-sky-50 text-sky-800 rounded-xl text-sm font-medium border border-sky-100/50">
                                Profile editing functionality coming soon. Please contact system admin for role changes or email updates.
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}
