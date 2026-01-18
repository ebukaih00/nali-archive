
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
config({ path: '.env.local' });

const RAW_FILE_PATH = path.join(__dirname, '../data/middle_belt_names_raw.txt');

async function start() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('🚀 Starting Middle Belt Names Import...');

    if (!fs.existsSync(RAW_FILE_PATH)) {
        console.error(`❌ File not found: ${RAW_FILE_PATH}`);
        return;
    }

    const fileContent = fs.readFileSync(RAW_FILE_PATH, 'utf-8');
    const lines = fileContent.split('\n');

    const namesToInsert: any[] = [];

    // Format: Name,Tribe,Meaning,Phonetic Hint
    // Skip header line if exists

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.toLowerCase().startsWith('name,tribe')) continue; // Skip header

        const parts = line.split(',');
        if (parts.length < 4) {
            console.warn(`⚠️ Skipping invalid line: ${line}`);
            continue;
        }

        // Handle commas in meaning?
        // Simple split might fail if meaning has comma. 
        // But assumed simple CSV for now.
        const name = parts[0].trim();
        const tribe = parts[1].trim(); // Tiv or Idoma
        const meaning = parts[2].trim();
        const phonetic = parts[3].trim();

        namesToInsert.push({
            name,
            meaning,
            origin: tribe, // e.g. Tiv or Idoma
            origin_country: 'Nigeria',
            phonetic_hint: phonetic
        });
    }

    console.log(`🔍 Found ${namesToInsert.length} names to import.`);

    // Check against DB
    const { data: existingData, error: fetchError } = await supabaseAdmin
        .from('names')
        .select('name');

    if (fetchError) {
        console.error('❌ Error fetching existing names:', fetchError.message);
        return;
    }

    const existingNamesSet = new Set(existingData?.map((n: any) => n.name.toLowerCase()));
    const finalNames = namesToInsert.filter(n => !existingNamesSet.has(n.name.toLowerCase()));

    console.log(`✨ New names to insert: ${finalNames.length} (Skipped ${namesToInsert.length - finalNames.length} duplicates)`);

    if (finalNames.length === 0) {
        console.log('✅ No new names to insert.');
        return;
    }

    if (process.argv.includes('--dry-run')) {
        console.log('🚧 DRY RUN MODE');
        console.log(JSON.stringify(finalNames, null, 2));
        return;
    }

    // Insert
    const { error } = await supabaseAdmin.from('names').insert(finalNames).select();

    if (error) {
        console.error(`❌ Error inserting:`, error.message);
    } else {
        console.log(`✅ Inserted ${finalNames.length} names.`);
    }
}

start();
