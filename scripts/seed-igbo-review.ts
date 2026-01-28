
import { config } from 'dotenv';
config({ path: '.env.local' });

async function seedIgboReview() {
    const { supabaseAdmin } = await import('../lib/supabase');

    // 1. Get 20 Igbo names
    const { data: names } = await supabaseAdmin
        .from('names')
        .select('id, name, phonetic_hint')
        .eq('origin', 'Igbo')
        .limit(20);

    if (!names) return;

    console.log(`🚀 Seeding ${names.length} Igbo names for review...`);

    for (const nameEntry of names) {
        // Use a generic audio URL for now so they show up
        const dummyUrl = "https://gcqsuvpydbgpvvwgaifi.supabase.co/storage/v1/object/public/name-audio/placeholder.mp3";

        // 2. Insert into audio_submissions
        const { error: subError } = await supabaseAdmin
            .from('audio_submissions')
            .insert({
                name_id: nameEntry.id,
                audio_url: dummyUrl,
                status: 'pending',
                phonetic_hint: nameEntry.phonetic_hint
            });

        if (subError) {
            console.error(`  ❌ DB error for ${nameEntry.name}:`, subError.message);
        } else {
            console.log(`  ✅ Seeded into Studio: ${nameEntry.name}`);
        }
    }

    console.log('\n✨ Seeding Complete!');
}

seedIgboReview();
