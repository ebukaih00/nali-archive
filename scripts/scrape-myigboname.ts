
import { config } from 'dotenv';
config({ path: '.env.local' });
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.myigboname.com';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrape() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('🚀 Starting Refined MyIgboName Scraper...');

    // 1. Cleanup old Igbo data
    console.log('🧹 Cleaning up old Igbo data...');
    const { data: oldIgbo } = await supabaseAdmin.from('names').select('id').eq('origin', 'Igbo');
    if (oldIgbo && oldIgbo.length > 0) {
        const ids = oldIgbo.map((n: any) => n.id);
        await supabaseAdmin.from('audio_submissions').delete().in('name_id', ids);
        await supabaseAdmin.from('names').delete().in('id', ids);
        console.log(`   - Deleted ${ids.length} entries.`);
    }

    let totalScraped = 0;

    for (const letter of LETTERS) {
        console.log(`\n📂 Letter: ${letter}`);
        try {
            const listUrl = `${BASE_URL}/start-with/${letter.toLowerCase()}`;
            const res = await fetch(listUrl);
            if (!res.ok) continue;

            const html = await res.text();
            const $ = cheerio.load(html);

            const entryLinks = new Set<string>();
            $('a[href^="/entries/"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) entryLinks.add(href);
            });

            const links = Array.from(entryLinks);
            console.log(`   -> Found ${links.length} name pointers.`);

            const batch: any[] = [];
            for (const link of links) {
                try {
                    const entryUrl = `${BASE_URL}${link}`;
                    const entryRes = await fetch(entryUrl);
                    if (!entryRes.ok) continue;

                    const entryHtml = await entryRes.text();
                    const $$ = cheerio.load(entryHtml);

                    const name = $$('h1').first().text().trim();
                    let phonetic = '';
                    let meaning = '';

                    $$('div, p, span, h2, h3').each((_, el) => {
                        const t = $$(el).text().trim();
                        if (!phonetic && t.startsWith('/') && t.endsWith('/') && t.length < 50) {
                            phonetic = t.replace(/\//g, '');
                        }
                        if (!meaning && t.toLowerCase().includes('lit:')) {
                            meaning = t.replace(/^lit:\s*/i, '').trim();
                        }
                    });

                    if (name) {
                        const cleanName = name.split(' ')[0];
                        batch.push({
                            name: cleanName,
                            origin: 'Igbo', // Refined schema
                            origin_country: 'Nigeria',
                            phonetic_hint: phonetic || null,
                            meaning: meaning || 'Igbo Name',
                            verification_status: 'verified' // Verification flag
                        });
                        process.stdout.write('.');
                    }
                } catch (err) { }
            }

            if (batch.length > 0) {
                console.log(`\n   💾 Saving ${batch.length} names...`);
                const { error } = await supabaseAdmin.from('names').insert(batch);
                if (error) console.error('   Error:', error.message);
                else totalScraped += batch.length;
            }

        } catch (e) {
            console.error(`   Error for ${letter}:`, e);
        }
        await sleep(1000);
    }

    console.log(`\n\n🎉 Done! Total Igbo Names Added: ${totalScraped}`);
}

scrape();
