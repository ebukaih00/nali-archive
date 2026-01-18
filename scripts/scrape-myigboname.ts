
import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabaseAdmin } from '../lib/supabase';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.myigboname.com';
// Letters to scrape (A-Z)
// Note: Igbo alphabet has special characters like Ị, Ọ, Ụ. 
// Standard site might just use A-Z or special links. 
// Based on homepage, it listed A-Z.
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrape() {
    console.log('🚀 Starting MyIgboName Scraper...');

    for (const letter of LETTERS) {
        console.log(`\n📂 Scraping Letter: ${letter}`);

        try {
            // 1. Fetch List Page
            const listUrl = `${BASE_URL}/start-with/${letter.toLowerCase()}`;
            const res = await fetch(listUrl);
            if (!res.ok) {
                console.error(`   ❌ Failed to fetch list ${listUrl}: ${res.status}`);
                continue;
            }

            const html = await res.text();
            const $ = cheerio.load(html);

            // 2. Extract Entry Links
            // Look for links starting with /entries/
            const entryLinks = new Set<string>();
            $('a[href^="/entries/"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) entryLinks.add(href);
            });

            const links = Array.from(entryLinks);
            console.log(`   -> Found ${links.length} names.`);

            const batch: any[] = [];

            // 3. Visit each Entry
            for (const link of links) {
                // Sleep small amount between pages
                await sleep(50);

                try {
                    const entryUrl = `${BASE_URL}${link}`;
                    const entryRes = await fetch(entryUrl);
                    if (!entryRes.ok) continue;

                    const entryHtml = await entryRes.text();
                    const $$ = cheerio.load(entryHtml);

                    // Extract Data
                    const name = $$('h1').first().text().trim();
                    let phonetic = '';
                    let meaning = '';

                    // Heuristic Search
                    $$('div, p, span, h2, h3').each((_, el) => {
                        const t = $$(el).text().trim();
                        // Phonetic: enclosed in slashes, reasonably short
                        if (!phonetic && t.startsWith('/') && t.endsWith('/') && t.length < 50) {
                            phonetic = t.replace(/\//g, ''); // Remove slashes
                        }
                        // Meaning: starts with 'lit:'
                        if (!meaning && t.toLowerCase().includes('lit:')) {
                            // Clean up "lit:" prefix
                            meaning = t.replace(/^lit:\s*/i, '').trim();
                        }
                    });

                    if (name) {
                        const cleanName = name.split(' ')[0]; // Handle "Akamnonu details" etc if h1 is messy
                        // Actually probe showed "Name: Akamnonu", so perfectly clean usually.

                        batch.push({
                            name: cleanName,
                            origin_country: 'Nigeria',
                            language: 'Igbo',
                            phonetic_hint: phonetic || null,
                            meaning: meaning || 'Igbo Name'
                        });
                    }

                } catch (err) {
                    // ignore single page error
                }

                if (batch.length >= 10) {
                    // Upsert batch occasionally
                    // ...
                }
            }

            // Upsert Batch for this letter
            if (batch.length > 0) {
                console.log(`   -> Upserting ${batch.length} names...`);
                const { error } = await supabaseAdmin.from('names').insert(batch).select(); // Using insert to enable auto-id. 
                // If conflicts? 'names' table likely doesn't have unique constraint on name yet.
                // Ideally we check existence or allow duplicates? 
                // Master import filtered duplicates. 
                // Let's rely on cleaning later or insert.
                if (error) console.error('   Batch Insert Error:', error.message);
                else console.log('   ✅ Success.');
            }

        } catch (e) {
            console.error(`Error scraping letter ${letter}:`, e);
        }

        // 4. Letter Delay
        console.log('   💤 Waiting 2 seconds...');
        await sleep(2000);
    }
}

scrape();
