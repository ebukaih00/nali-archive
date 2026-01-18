
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
config({ path: '.env.local' });

const RAW_FILE_PATH = path.join(__dirname, '../data/edo_names_raw.txt');

async function start() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('🚀 Starting Edo Names Import...');

    if (!fs.existsSync(RAW_FILE_PATH)) {
        console.error(`❌ File not found: ${RAW_FILE_PATH}`);
        return;
    }

    const fileContent = fs.readFileSync(RAW_FILE_PATH, 'utf-8');
    const lines = fileContent.split('\n');

    const namesToInsert: any[] = [];
    const nameRegex = /^([A-Za-z]+)\s*[–-]\s*(.+)$/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.match(/Female Edo Names/i)) continue;
        if (trimmed.match(/Unisex/i)) continue;

        const match = trimmed.match(nameRegex);
        if (match) {
            const name = match[1].trim();
            const phonetic = match[2].trim();

            namesToInsert.push({
                name,
                meaning: '', // No meaning provided in user input
                origin: 'Edo',
                origin_country: 'Nigeria',
                phonetic_hint: phonetic
            });
        }
    }

    console.log(`🔍 Found ${namesToInsert.length} names to import.`);

    // De-duplicate within the new list
    const uniqueMap = new Map();
    for (const n of namesToInsert) {
        uniqueMap.set(n.name.toLowerCase(), n);
    }
    const uniqueNames = Array.from(uniqueMap.values());

    // Check against DB
    const { data: existingData, error: fetchError } = await supabaseAdmin
        .from('names')
        .select('name');

    if (fetchError) {
        console.error('❌ Error fetching existing names:', fetchError.message);
        return;
    }

    const existingNamesSet = new Set(existingData?.map((n: any) => n.name.toLowerCase()));
    const finalNames = uniqueNames.filter(n => !existingNamesSet.has(n.name.toLowerCase()));

    console.log(`✨ New names to insert: ${finalNames.length} (Skipped ${uniqueNames.length - finalNames.length} duplicates)`);

    if (finalNames.length === 0) {
        console.log('✅ No new names to insert.');
        return;
    }

    if (process.argv.includes('--dry-run')) {
        console.log('🚧 DRY RUN MODE');
        console.log(JSON.stringify(finalNames.slice(0, 10), null, 2));
        return;
    }

    // Insert
    const batchSize = 100;
    for (let i = 0; i < finalNames.length; i += batchSize) {
        const batch = finalNames.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('names').insert(batch).select();

        if (error) {
            console.error(`❌ Error inserting batch ${i}:`, error.message);
        } else {
            console.log(`✅ Inserted batch ${i} - ${i + batch.length}`);
        }
    }
}

start();
