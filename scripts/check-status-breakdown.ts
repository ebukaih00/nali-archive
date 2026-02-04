
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkStatusBreakdown(email: string) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await supabase
        .from('names')
        .select('status')
        .ilike('assigned_to', `%${email}%`);

    const breakdown: Record<string, number> = {};
    data?.forEach(item => {
        const s = item.status || 'null';
        breakdown[s] = (breakdown[s] || 0) + 1;
    });

    console.log(`Status breakdown for ${email}:`);
    console.table(breakdown);
}

checkStatusBreakdown('ihuezeebuka@yahoo.com');
