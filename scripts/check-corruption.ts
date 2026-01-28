import { supabaseAdmin } from '../lib/supabase';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkCorruption() {
    console.log("🔍 Checking for corrupted names in database (targeting '\uFFFD')...");

    const { data: corrupted, count, error } = await supabaseAdmin
        .from('names')
        .select('id, name', { count: 'exact' })
        .ilike('name', '%\uFFFD%');

    if (error) {
        console.error("❌ Error fetching names:", error);
        return;
    }

    console.log(`📊 Found ${count} corrupted names.`);

    if (corrupted && corrupted.length > 0) {
        console.log("Sample corrupted names:");
        corrupted.slice(0, 10).forEach(n => console.log(`- ${n.name} (id: ${n.id})`));
    }
}

checkCorruption();
