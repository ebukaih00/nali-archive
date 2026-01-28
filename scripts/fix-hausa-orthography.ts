
import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

async function fixHausaOrthography() {
    const { supabaseAdmin } = await import('../lib/supabase');

    console.log('🚀 Starting Hausa Orthography Fix with Gemini...');

    // 1. Fetch Hausa names with potential issues
    const { data: names, error } = await supabaseAdmin
        .from('names')
        .select('id, name')
        .eq('origin', 'Hausa');

    if (error || !names) {
        console.error('Error fetching Hausa names:', error);
        return;
    }

    const problematicNames = names.filter(n => /[?\[\]{}()!@#$%\^&*]/.test(n.name));
    console.log(`📋 Found ${problematicNames.length} names requiring repair.`);

    if (problematicNames.length === 0) {
        console.log("✅ No names found with obvious corruption.");
        return;
    }

    // Processes in batches
    const batchSize = 30;
    for (let i = 0; i < problematicNames.length; i += batchSize) {
        const batch = problematicNames.slice(i, i + batchSize);
        console.log(`\n🧠 Fixing Batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(problematicNames.length / batchSize)}...`);

        const prompt = `
You are an expert in Hausa linguistics and orthography. The following Hausa names have been corrupted, usually replacing special hooked letters (ɓ, ɗ, ƙ, ƴ) with characters like '?'.
Recover the correct, standard Hausa orthography for these names.

Format: ID|CorrectName (e.g., 9321|Ɗankaka)
Rules:
1. Use the correct Hausa hooked letters: ɓ, ɗ, ƙ, ƴ (and their uppercase counterparts Ɓ, Ɗ, Ƙ, Ƴ).
2. For names starting with ?, it is almost always Ɗ, Ƙ, or Ɓ. Examine the rest of the name to decide.
3. Return ONLY the ID|CorrectName lines, one per line. No other text.

Names to fix:
${batch.map(n => `${n.id}|${n.name}`).join('\n')}
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const updates = text.split('\n')
                .filter(line => line.includes('|'))
                .map(line => {
                    const [id, corrected] = line.trim().split('|');
                    return { id: parseInt(id), name: corrected };
                })
                .filter(up => !isNaN(up.id) && up.name);

            if (updates.length > 0) {
                console.log(`✅ Received ${updates.length} corrections. Updating database...`);
                for (const update of updates) {
                    const { error } = await supabaseAdmin
                        .from('names')
                        .update({
                            name: update.name,
                            verification_status: 'verified'
                        })
                        .eq('id', update.id);

                    if (error) {
                        console.error(`❌ Error updating ID ${update.id}:`, error.message);
                    } else {
                        console.log(`  ✨ Fixed: ${update.name}`);
                    }
                }
            }
        } catch (e: any) {
            console.error(`❌ Batch error:`, e.message);
        }
    }

    console.log('\n✨ Hausa Orthography Fix Complete!');
}

fixHausaOrthography();
