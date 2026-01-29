
import { config } from 'dotenv';
config({ path: '.env.local' });
import { searchTuningNames, saveTuningFormula } from '../app/studio/actions';
import { supabaseAdmin } from '../lib/supabase';

async function verify() {
    console.log("🔍 Verifying Playground 2.0 Logic...");

    try {
        // 1. Test Search
        console.log("📡 Testing searchTuningNames('Chukwu')...");
        const results = await searchTuningNames('Chukwu');
        if (results && results.length > 0) {
            console.log(`✅ Search successful! Found ${results.length} names.`);
            const testName = results[0];
            console.log(`📌 Testing with Name: ${testName.name} (ID: ${testName.id})`);

            // 2. Test Save Formula + Rule
            console.log("💾 Testing saveTuningFormula with a prefix rule...");
            await saveTuningFormula({
                nameId: testName.id,
                phonetic: "Choo kwoo",
                settings: { stability: 0.75, speed: 0.85, voice_id: "it5NMxoQQ2INIh4XcO44" },
                ruleType: 'prefix',
                rulePattern: 'Chukwu'
            });

            // 3. Verify Database Updates
            console.log("🛡️ Verifying database state...");

            // Check Name Update
            const { data: nameData } = await supabaseAdmin
                .from('names')
                .select('phonetic_hint, tts_settings, verification_status')
                .eq('id', testName.id)
                .single();

            if (nameData?.phonetic_hint === "Choo kwoo" && nameData.verification_status === 'verified') {
                console.log("✅ Name table updated correctly.");
            } else {
                console.error("❌ Name table update FAILED:", nameData);
            }

            // Check Rule Creation
            const { data: ruleData } = await supabaseAdmin
                .from('pronunciation_rules')
                .select('*')
                .eq('pattern', 'prefix:chukwu')
                .maybeSingle();

            if (ruleData) {
                console.log("✅ Global rule created successfully.");
                console.log("📊 Global Rule Settings:", ruleData.settings);
            } else {
                console.error("❌ Global rule creation FAILED.");
            }

        } else {
            console.warn("⚠️ No names found to test with. Is the database empty?");
        }
    } catch (e: any) {
        console.error("❌ Verification FAILED with error:", e.message);
    }
}

verify();
