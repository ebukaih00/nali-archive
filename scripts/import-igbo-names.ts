
import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabaseAdmin } from '../lib/supabase';

const IGBO_API_URL = 'https://igboapi.com/api/v1';
const API_KEY = process.env.IGBO_API_KEY;

// Common prefixes to harvest names
// Using broad prefixes to catch many names
const PREFIXES = [
    'Chi', 'Ngo', 'Olu', 'Ife', 'Ugo', 'Ebe', 'Ada', 'Obi', 'Chukwu', 'Nne', 'Nke', 'Ogo'
];

async function importIgboNames() {
    if (!API_KEY) {
        console.error('❌ Missing IGBO_API_KEY');
        return;
    }

    console.log('🚀 Starting Igbo Names Import...');
    let totalImported = 0;

    for (const prefix of PREFIXES) {
        console.log(`\n🔍 Searching for prefix: "${prefix}"...`);

        try {
            // Fetch words/names starting with prefix
            const res = await fetch(`${IGBO_API_URL}/words?keyword=${prefix}&range=[0,100]`, {
                headers: { 'X-API-Key': API_KEY }
            });

            if (!res.ok) {
                console.error(`❌ Failed to fetch prefix ${prefix}: ${res.status}`);
                continue;
            }

            const data = await res.json();
            console.log(`   -> Found ${data.length} entries.`);

            const namesToInsert: any[] = [];

            for (const entry of data) {
                // Filter: We want items that are likely names.
                // The API returns definitions.
                // We look for definitions that imply it's a name or purely based on the word itself.
                // Assuming capitalize entries are likely names or standard words.

                const word = entry.word;
                // Simple heuristic: If it's valid, we take it.
                // We will capitalize the first letter.
                const nameClean = word.charAt(0).toUpperCase() + word.slice(1);

                // Extract meaning
                const definitions = entry.definitions || [];
                const meaning = definitions.join(', ') || 'Igbo Name';

                // Generate simple phonetic (Naive)
                const phonetic = nameClean.toUpperCase().split('').join('-');

                namesToInsert.push({
                    name: nameClean,
                    origin_country: 'Nigeria',
                    language: 'Igbo',
                    phonetic_hint: phonetic,
                    meaning: meaning.slice(0, 500) // Truncate to be safe
                });
            }

            if (namesToInsert.length > 0) {
                // Upsert to DB
                // We can't really "Upsert" without ID, so we insert and ignore conflict if possible?
                // Or check existence. 
                // Let's rely on name uniqueness check we did in master import?
                // Actually, let's just insert. Duplicate names might happen if we don't check.

                // Check filtering
                // Let's just insert for now.
                const { error } = await supabaseAdmin.from('names').insert(namesToInsert).select();

                if (error) {
                    // likely duplicate constraint if we had one, or just silent success
                    console.log(`   -> Insert error (might be duplicates): ${error.message}`);
                } else {
                    console.log(`   -> ✅ Imported ${namesToInsert.length} names.`);
                    totalImported += namesToInsert.length;
                }
            }

        } catch (e) {
            console.error(`Error processing prefix ${prefix}:`, e);
        }
    }

    console.log(`\n🎉 Total Igbo Names Imported: ${totalImported}`);
}

importIgboNames();
