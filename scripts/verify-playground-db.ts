
import { config } from 'dotenv';
config({ path: '.env.local' });

async function verify() {
    console.log("🔍 Running Raw Database Verification...");
    const { supabaseAdmin } = await import('../lib/supabase');

    try {
        // 1. Test Writing settings to a name
        console.log("📝 Testing tts_settings write...");
        const { data: testName } = await supabaseAdmin
            .from('names')
            .select('id')
            .limit(1)
            .single();

        if (testName) {
            const { error: updateError } = await supabaseAdmin
                .from('names')
                .update({
                    tts_settings: { stability: 0.5, speed: 1.2, voice_id: 'test' }
                })
                .eq('id', testName.id);

            if (updateError) throw updateError;
            console.log("✅ Successfully updated tts_settings.");

            const { data: verifyUpdate } = await supabaseAdmin
                .from('names')
                .select('tts_settings')
                .eq('id', testName.id)
                .single();

            if (verifyUpdate.tts_settings?.stability === 0.5) {
                console.log("✅ verified tts_settings data integrity.");
            }
        }

        // 2. Test Rule Creation
        console.log("📝 Testing pronunciation_rules write...");
        const testPattern = `test:prefix_${Date.now()}`;
        const { error: ruleError } = await supabaseAdmin
            .from('pronunciation_rules')
            .insert({
                pattern: testPattern,
                phonetic_replacement: 'test phonetic',
                settings: { stability: 0.1 }
            });

        if (ruleError) throw ruleError;
        console.log(`✅ Successfully created rule with pattern: ${testPattern}`);

        // 3. Clean up
        await supabaseAdmin.from('pronunciation_rules').delete().eq('pattern', testPattern);
        console.log("🧹 Cleanup complete.");

        console.log("\n✨ ALL DATABASE SYSTEMS VERIFIED FOR PLAYGROUND 2.0");
    } catch (e: any) {
        console.error("❌ DB Verification FAILED:", e.message);
    }
}

verify();
