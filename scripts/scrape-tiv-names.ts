
import { config } from 'dotenv';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
config({ path: '.env.local' });

async function start() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('🚀 Starting Tiv Names Scraping...');

    const url = 'https://benuexclusive.com.ng/popular-tiv-names-and-their-meaning-in-english/';
    console.log(`📡 Fetching ${url}...`);

    let html = '';
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        html = await response.text();
    } catch (error) {
        console.error('❌ Fetch error:', error);
        return;
    }

    const $ = cheerio.load(html);
    // Usually lists are in <p> or <li>
    // Name - Meaning format often

    const names: any[] = [];
    const nameRegex = /^([A-Za-z]+)\s*[:–-]\s*(.+)$/;

    $('p, li').each((i, el) => {
        const text = $(el).text().trim();
        // Look for patterns like "Aondoakura: Let God protect"
        const match = text.match(nameRegex);
        if (match) {
            const name = match[1].trim();
            const meaning = match[2].trim();

            if (name.length > 2 && meaning.length > 2) {
                names.push({
                    name,
                    meaning,
                    origin: 'Tiv',
                    origin_country: 'Nigeria',
                    phonetic_hint: '',
                    verification_status: 'verified'
                });
            }
        }
    });

    console.log(`🔍 Found ${names.length} potential Tiv names.`);

    // De-duplicate
    const uniqueNames = Array.from(new Map(names.map(item => [item.name, item])).values());
    console.log(`✨ Unique names: ${uniqueNames.length}`);

    if (uniqueNames.length === 0) {
        console.warn('⚠️ No names found. Cheerio selector might be wrong. Dumping sample paragraphs:');
        $('p').slice(0, 5).each((i, el) => console.log($(el).text()));
        return;
    }

    // Check for existing
    const { data: existingData } = await supabaseAdmin.from('names').select('name');
    const existingSet = new Set(existingData?.map((n: any) => n.name.toLowerCase()));

    const newNames = uniqueNames.filter(n => !existingSet.has(n.name.toLowerCase()));
    console.log(`✨ New names to insert: ${newNames.length}`);

    if (newNames.length === 0) return;

    if (process.argv.includes('--dry-run')) {
        console.log('🚧 DRY RUN MODE');
        console.log(JSON.stringify(newNames.slice(0, 5), null, 2));
        return;
    }

    // Insert
    const { error } = await supabaseAdmin.from('names').insert(newNames).select();

    if (error) {
        console.error(`❌ Error inserting:`, error.message);
    } else {
        console.log(`✅ Inserted ${newNames.length} Tiv names.`);
    }
}

start();
