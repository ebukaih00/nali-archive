import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/studio/library';

    // Determine the redirect origin based on the environment
    const isProduction = process.env.NODE_ENV === 'production' || request.headers.get('host')?.includes('naliproject.org');
    const redirectOrigin = isProduction ? 'https://naliproject.org' : origin;

    if (code) {
        const supabase = await createClient();
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
                    return NextResponse.redirect(`${redirectOrigin}${next}`);
                }

                if (profile.role === 'contributor' || profile.role === 'admin') {
                    return NextResponse.redirect(`${redirectOrigin}${next}`);
                } else {
                    return NextResponse.redirect(`${redirectOrigin}/unauthorized`);
                }
            }
            return NextResponse.redirect(`${redirectOrigin}${next}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${redirectOrigin}/auth/auth-code-error`);
}
