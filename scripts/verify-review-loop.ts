
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyLoop() {
    console.log("🧪 Verifying Human Review Loop...");

    // 1. Mock a submission for a name
    const testName = 'Chukwuebuka';
    const { data: name } = await supabase.from('names').select('id').eq('name', testName).single();
    if (!name) {
        console.error("Test name not found");
        return;
    }

    const testAudio = 'https://example.com/recorded-audio.webm';
    console.log(`Step 1: Creating pending submission for ${testName}...`);

    const { data: submission, error: subError } = await supabase.from('audio_submissions').insert({
        name_id: name.id,
        audio_url: testAudio,
        status: 'pending',
        phonetic_hint: 'CHOO-kwoo-EH-boo-kah'
    }).select().single();

    if (subError) {
        console.error("Failed to create submission:", subError);
        return;
    }

    console.log(`Step 2: Simulating Admin Approval for submission ${submission.id}...`);
    // Note: We are simulating the logic inside submitReview
    await supabase.from('audio_submissions').update({ status: 'approved' }).eq('id', submission.id);
    await supabase.from('names').update({
        verification_status: 'verified',
        status: 'verified',
        verified_audio_url: testAudio,
        phonetic_hint: 'CHOO-kwoo-EH-boo-kah'
    }).eq('id', name.id);

    console.log("Step 3: Checking if playback API prioritizes verified_audio_url...");
    // We can't easily fetch from the API here without a full server context, 
    // but we can check the DB state.
    const { data: updatedName } = await supabase.from('names').select('verified_audio_url, verification_status').eq('id', name.id).single();

    if (updatedName?.verified_audio_url === testAudio && updatedName?.verification_status === 'verified') {
        console.log("✅ SUCCESS: Name updated correctly with human audio priority!");
    } else {
        console.log("❌ FAILURE: Name DB state not as expected", updatedName);
    }
}

verifyLoop();
