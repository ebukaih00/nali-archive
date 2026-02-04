
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectRaw(email: string) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    console.log(`Inspecting raw assigned_to for: ${email}`);

    const { data } = await supabase
        .from('names')
        .select('id, name, assigned_to')
        .ilike('assigned_to', `%${email}%`)
        .limit(5);

    if (data) {
        data.forEach(item => {
            console.log(`ID: ${item.id}, Raw: ${JSON.stringify(item.assigned_to)}`);
        });
    }
}

inspectRaw('ihuezeebuka@yahoo.com');
inspectRaw('ihuezeebuka5@gmail.com');
