'use client';

import Link from 'next/link';
import { AlertCircle, RefreshCcw, Home, Info } from 'lucide-react';

export default function AuthCodeError() {
    return (
        <main className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 font-sans text-[#2C2420]">
            <div className="max-w-md w-full bg-white p-12 rounded-3xl shadow-xl shadow-[#4e3629]/5 border border-[#F0EBE6] text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>

                <h1 className="text-3xl font-serif font-bold text-[#4e3629] mb-4">Authentication Error</h1>
                <p className="text-[#6B6661] mb-8 leading-relaxed">
                    The sign-in link has expired or has already been used. Magic links can only be used once.
                </p>

                <div className="bg-[#f8f6f4] p-5 rounded-2xl mb-8 text-left border border-[#E9E4DE]">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[#4e3629] mb-2">
                        <Info className="w-4 h-4" />
                        Common Fixes:
                    </h3>
                    <ul className="text-xs text-[#6B6661] space-y-2 list-disc pl-4">
                        <li>Use the <strong>same browser</strong> to request and open the link.</li>
                        <li>Avoid using <strong>Incognito/Private</strong> windows.</li>
                        <li>Ensure you are clicking the <strong>most recent</strong> link in your inbox.</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <Link
                        href="/login"
                        className="w-full flex items-center justify-center gap-2 py-4 bg-[#4e3629] hover:bg-[#3d2a20] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#4e3629]/20"
                    >
                        <RefreshCcw className="w-5 h-5" />
                        Try Signing In Again
                    </Link>

                    <Link
                        href="/"
                        className="w-full flex items-center justify-center gap-2 py-4 bg-[#F5F2EF] hover:bg-[#E9E4DE] text-[#4e3629] rounded-xl font-bold transition-all"
                    >
                        <Home className="w-5 h-5" />
                        Return Home
                    </Link>
                </div>

                <div className="mt-8 pt-8 border-t border-[#F0EBE6]">
                    <p className="text-xs text-[#9E958F]">
                        If you continue to have issues, please contact the administrator.
                    </p>
                </div>
            </div>
        </main>
    );
}
