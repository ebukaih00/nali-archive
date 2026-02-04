
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testRLS(userId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
        console.error('Missing Supabase environment variables');
        return;
    }

    // Use the ANON key client (not service role)
    const supabase = createClient(supabaseUrl, anonKey);

    console.log(`--- Testing RLS for User ID: ${userId} ---`);

    // Note: We can't easily "log in" as the user without their password/link,
    // but we can check if the row is visible to the public or if it errors.

    // Try to fetch the profile as anon
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error) {
        console.log('❌ RLS Check Failed (as expected for anon):', error.message);
    } else {
        console.log('⚠️ RLS Check Succeeded (Wait, anon can see profiles?):', data);
    }
}

// Check the Yahoo user ID from the previous diagnostic
const yahooUserId = 'f01fbd80-0ec2-43e3-91ad-05b0bf3d3999';
testRLS(yahooUserId);
