
import { config } from 'dotenv';
config({ path: '.env.local' });

async function seedMixReview() {
    const { supabaseAdmin } = await import('../lib/supabase');

    // 1. Get 15 Igbo names
    const { data: igboNames } = await supabaseAdmin
        .from('names')
        .select('id, name, phonetic_hint')
        .eq('origin', 'Igbo')
        .limit(15);

    // 2. Get 15 Yoruba names
    const { data: yorubaNames } = await supabaseAdmin
        .from('names')
        .select('id, name, phonetic_hint')
        .eq('origin', 'Yoruba')
        .limit(15);

    const allNames = [...(igboNames || []), ...(yorubaNames || [])];

    if (allNames.length === 0) {
        console.log("No names found to seed.");
        return;
    }

    console.log(`🚀 Seeding ${allNames.length} mixed names for review...`);

    for (const nameEntry of allNames) {
        // Use a generic audio URL for now so they show up
        const dummyUrl = "https://gcqsuvpydbgpvvwgaifi.supabase.co/storage/v1/object/public/name-audio/placeholder.mp3";

        // Check if already in audio_submissions to avoid duplicates (simplified)
        const { data: exists } = await supabaseAdmin
            .from('audio_submissions')
            .select('id')
            .eq('name_id', nameEntry.id)
            .single();

        if (exists) {
            console.log(`  ⏩ Skipping ${nameEntry.name} (already exists)`);
            continue;
        }

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

seedMixReview();
