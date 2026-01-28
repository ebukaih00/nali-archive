
import { config } from 'dotenv';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
config({ path: '.env.local' });

async function start() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('🚀 Starting Urhobo Names Scraping...');

    const url = 'https://urhobotoday.com/names-and-meaning-of-urhobo-names/';
    console.log(`📡 Fetching ${url}...`);

    let html = '';
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        html = await response.text();
    } catch (error) {
        console.error('❌ Fetch error:', error);
        return;
    }

    const $ = cheerio.load(html);
    const textContent = $('body').text();
    // The previous chunk showed names are just text lines like "Abavo - Equal."
    // But scraping body text might include headers.
    // Let's try to target paragraph tags or split the raw text carefully.

    // Better strategy: Look for lines that match "Name – Meaning" or "Name - Meaning"
    // The chunk output showed: "Abavo - Equal."
    // There are different hyphens: "-", "–"

    const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);
    const names = [];

    const nameRegex = /^([A-Za-z\u00C0-\u024F\u1E00-\u1EFF]+)\s*[-–]\s*(.+)$/;

    for (const line of lines) {
        // Skip obvious junk
        if (line.includes('Comment')) continue;
        if (line.includes('Author')) continue;

        const match = line.match(nameRegex);
        if (match) {
            const name = match[1].trim();
            const meaning = match[2].trim();

            // Skip short names or weird matches
            if (name.length < 2) continue;

            names.push({
                name,
                meaning,
                origin: 'Urhobo',
                origin_country: 'Nigeria',
                phonetic_hint: '', // No auto-gen for now
                verification_status: 'verified'
            });
        }
    }

    console.log(`🔍 Found ${names.length} potential Urhobo names.`);

    // Remove duplicates
    const uniqueNames = Array.from(new Map(names.map(item => [item.name, item])).values());
    console.log(`✨ Unique names: ${uniqueNames.length}`);

    if (uniqueNames.length === 0) {
        console.warn('⚠️ No names found. Cheerio selector or regex might be wrong. Dumping raw sample:');
        console.log(lines.slice(100, 120));
        return;
    }

    if (process.argv.includes('--dry-run')) {
        console.log('🚧 DRY RUN MODE');
        console.log(JSON.stringify(uniqueNames.slice(0, 10), null, 2));
        return;
    }

    // Check for existing names to avoid duplicates (since no unique constraint yet)
    // For large datasets, we might do this in batches or differently, but for 200 names this is fine.
    const { data: existingData, error: fetchError } = await supabaseAdmin
        .from('names')
        .select('name');

    if (fetchError) {
        console.error('❌ Error fetching existing names:', fetchError.message);
        return;
    }

    const existingNamesSet = new Set(existingData?.map((n: any) => n.name.toLowerCase()));

    const newNames = uniqueNames.filter(n => !existingNamesSet.has(n.name.toLowerCase()));
    console.log(`✨ New names to insert: ${newNames.length} (Skipped ${uniqueNames.length - newNames.length} duplicates)`);

    if (newNames.length === 0) {
        console.log('✅ No new names to insert.');
        return;
    }

    // Insert
    const batchSize = 100;
    for (let i = 0; i < newNames.length; i += batchSize) {
        const batch = newNames.slice(i, i + batchSize);
        // Use simple insert now
        const { error } = await supabaseAdmin.from('names').insert(batch).select();

        if (error) {
            console.error(`❌ Error inserting batch ${i}:`, error.message);
        } else {
            console.log(`✅ Inserted batch ${i} - ${i + batch.length}`);
        }
    }
}

start();
