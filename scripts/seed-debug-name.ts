
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function seed() {
    const name = "Eze_Debug_" + Date.now();
    console.log(`Seeding test name: ${name}`);

    const { data, error } = await supabase
        .from('names')
        .insert({
            name: name,
            origin: 'Igbo',
            meaning: 'King / Debug Entry',
            phonetic_hint: 'eh-ZEH',
            status: 'pending',
            verification_status: 'unverified'
        })
        .select()
        .single();

    if (error) {
        console.error('Error seeding name:', error);
    } else {
        console.log('Successfully seeded name:', data);
    }
}

seed();
