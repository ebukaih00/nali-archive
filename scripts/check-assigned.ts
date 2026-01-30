
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAssigned(email: string) {
    console.log(`🔍 Checking assignments for: "${email}"`);
    const { data, error } = await supabase
        .from('names')
        .select('name, status, verification_status, ignored')
        .ilike('assigned_to', email);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} assigned names.`);
    console.table(data);
}

checkAssigned('ihuezeebuka5@gmail.com');
