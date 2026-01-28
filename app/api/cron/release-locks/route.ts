import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Unlock pending items that are expired
    const { error, count } = await supabaseAdmin
        .from('audio_submissions')
        .update({ locked_by: null, locked_at: null })
        .lt('locked_at', twoHoursAgo) // Older than 2 hours
        .eq('status', 'pending')
        .select('id', { count: 'exact' });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, unlocked: count });
}
