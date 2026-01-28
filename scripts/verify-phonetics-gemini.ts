
import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function verifyAllPhonetics() {
    const { supabaseAdmin } = await import('../lib/supabase');

    console.log('🚀 Starting LLM Phonetic Audit with Gemini...');

    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    // 1. Fetch names to review
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('id, name, origin, meaning, phonetic_hint')
            .range(from, from + step - 1);

        if (error || !data || data.length === 0) break;
        allData = allData.concat(data);
        from += step;
    }

    console.log(`📋 Total names to process: ${allData.length}`);

    // Processes in batches of 50 for LLM efficiency
    const batchSize = 50;
    for (let i = 0; i < allData.length; i += batchSize) {
        const batch = allData.slice(i, i + batchSize);
        console.log(`\n🧠 Reviewing Batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allData.length / batchSize)}...`);

        const prompt = `
You are an expert in African linguistics. Review the following list of African names and provide the most accurate, ElevenLabs-compatible phonetic spelling for each.
Format: ID|Hyphenated-Phonetic (e.g., 1|AH-mah-rah-CHEE)
Rules:
1. Use capital letters for STRESSED syllables.
2. Use hyphens between all syllables.
3. Base the pronunciation on the provided Origin (e.g., Igbo, Yoruba, Hausa) and Meaning.
4. If the current phonetic hint is already perfect, return it as is.
5. Return ONLY the ID|Phonetic lines, no other text.

Names:
${batch.map(n => `${n.id}|${n.name}|${n.origin}|${n.meaning}|${n.phonetic_hint || 'None'}`).join('\n')}
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const updates = text.split('\n')
                .filter(line => line.includes('|'))
                .map(line => {
                    const [id, hint] = line.trim().split('|');
                    return { id: parseInt(id), phonetic_hint: hint };
                })
                .filter(up => !isNaN(up.id) && up.phonetic_hint);

            if (updates.length > 0) {
                console.log(`✅ Received ${updates.length} verified phonetics. Saving...`);
                for (const update of updates) {
                    const { error } = await supabaseAdmin
                        .from('names')
                        .update({ phonetic_hint: update.phonetic_hint })
                        .eq('id', update.id);
                    if (error) console.error(`❌ Error updating ID ${update.id}:`, error.message);
                }
            }
        } catch (e: any) {
            console.error(`❌ Batch error:`, e.message);
        }
    }

    console.log('\n✨ Gemini Phonetic Audit Complete!');
}

verifyAllPhonetics();
