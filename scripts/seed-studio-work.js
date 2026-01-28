
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedWork() {
    try {
        console.log("🔍 Finding work to seed...");

        // 1. Find names that are verified but have no audio (Targeting Igbo for the contributor)
        const { data: names, error: fetchError } = await supabase
            .from('names')
            .select('id, name, origin, phonetic_hint')
            .eq('verification_status', 'verified')
            .eq('origin', 'Igbo')
            .is('verified_audio_url', null)
            .limit(250);

        if (fetchError) throw fetchError;

        if (!names || names.length === 0) {
            console.log("✅ No names found needing audio verification.");
            return;
        }

        console.log(`🚀 Found ${names.length} names to seed into the Studio.`);

        // 2. Reset their status to unverified
        const nameIds = names.map(n => n.id);
        const { error: resetError } = await supabase
            .from('names')
            .update({ verification_status: 'unverified' })
            .in('id', nameIds);

        if (resetError) throw resetError;

        // 3. Create audio submissions
        const submissions = names.map(n => ({
            name_id: n.id,
            status: 'pending',
            audio_url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c352358fb4.mp3', // Generic placeholder audio
            phonetic_hint: n.phonetic_hint || ''
        }));

        const { error: subError } = await supabase
            .from('audio_submissions')
            .insert(submissions);

        if (subError) throw subError;

        console.log(`✨ Successfully seeded ${names.length} names into the Contributor Studio.`);
        console.log(`Batch breakdown: ${Math.ceil(names.length / 50)} new batches created.`);

    } catch (e) {
        console.error("❌ Seeding failed:", e);
    }
}

seedWork();
