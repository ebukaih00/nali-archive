
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Seeding batches...");

    // Generate 60 names
    const names = Array.from({ length: 60 }, (_, i) => ({
        name: `TestName-${i + 1}`,
        origin: 'Igbo', // All in one batch roughly or split? Dashboard groups by Language. Let's do all Igbo for a big batch.
        verification_status: 'unverified'
    }));

    // 1. Insert Names
    const { data: insertedNames, error: nameError } = await supabase
        .from('names')
        .insert(names)
        .select('id, name');

    if (nameError) {
        console.error("Error inserting names:", nameError);
        return;
    }

    console.log(`Inserted ${insertedNames.length} names.`);

    // 2. Insert Audio Submissions
    const submissions = insertedNames.map(n => ({
        name_id: n.id,
        // contributor_id: ... // Optional? The schema allows null? Let's assume null is fine or we can omit.
        audio_url: 'https://www.soundhelix.com/examples/mp3/Soundhelix-Song-1.mp3', // Dummy URL
        status: 'pending'
    }));

    const { error: subError } = await supabase
        .from('audio_submissions')
        .insert(submissions);

    if (subError) {
        console.error("Error inserting submissions:", subError);
    } else {
        console.log(`Inserted ${submissions.length} pending audio submissions.`);
    }

    console.log("Seeding complete!");
}

seed();
