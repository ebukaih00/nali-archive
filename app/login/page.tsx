'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Mail, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { validateLoginEmail } from '@/app/auth/actions';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/studio/library');
            }
        };
        checkAuth();
    }, [router, supabase]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // 1. Pre-authentication check
            const { allowed, message: authMessage } = await validateLoginEmail(email);

            if (!allowed) {
                setMessage({
                    type: 'error',
                    text: authMessage || 'Your account is not approved for login.'
                });
                setLoading(false);
                return;
            }

            // 2. Clear to send magic link
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/studio/library`,
                },
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: 'Magic link sent! Check your email to log in.'
            });
        } catch (err: any) {
            setMessage({
                type: 'error',
                text: err.message || 'An error occurred. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F7F5] flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-primary/10"
            >
                <div className="bg-primary/5 p-8 border-b border-primary/10 text-center">
                    <h1 className="text-3xl font-serif text-primary font-medium mb-2">Contributor Login</h1>
                    <p className="text-secondary">Access the Nali Contributor Dashboard</p>
                </div>

                <div className="p-8">
                    {message?.type === 'success' ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">Check your email</h3>
                            <p className="text-secondary mb-6">{message.text}</p>
                            <button
                                onClick={() => setMessage(null)}
                                className="text-primary hover:underline text-sm"
                            >
                                Try again
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary/50 w-5 h-5" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-background border border-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            {message?.type === 'error' && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#4e3629] text-white font-medium text-lg rounded-xl hover:bg-[#3d2b21] transition-colors shadow-lg shadow-[#4e3629]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Magic Link'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
