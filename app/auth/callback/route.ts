import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/studio/library';

    // Determine the redirect origin based on the environment
    // Use origin as fallback but prioritize naliproject.org in production
    const isProduction = process.env.NODE_ENV === 'production' || request.headers.get('host')?.includes('naliproject.org');
    const redirectBase = isProduction ? 'https://naliproject.org' : origin;

    const supabase = await createClient();

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // 1. Check if profile exists, if not create it
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (!profile) {
                    await supabase
                        .from('profiles')
                        .insert({ id: user.id, role: 'contributor' });
                }

                // Allow admin/contributor access
                if (!profile || profile.role === 'contributor' || profile.role === 'admin') {
                    return NextResponse.redirect(new URL(next, redirectBase));
                } else {
                    return NextResponse.redirect(new URL('/unauthorized', redirectBase));
                }
            }
        } else {
            // Already have a session? 
            // This happens if the link was pre-fetched or clicked twice.
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                return NextResponse.redirect(new URL(next, redirectBase));
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/auth/auth-code-error', redirectBase));
}
