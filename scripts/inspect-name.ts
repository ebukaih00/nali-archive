
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspect(searchName: string) {
    console.log(`🔍 Inspecting name: "${searchName}"`);
    const { data, error } = await supabase
        .from('names')
        .select('*')
        .ilike('name', searchName);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} entries:`);
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log("No entries found.");
    }
}

const nameArg = process.argv[2] || 'Chukwuebuka';
inspect(nameArg);
