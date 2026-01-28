
import { config } from 'dotenv';
config({ path: '.env.local' });

const IGBO_API_URL = 'https://igboapi.com/api/v1';
const API_KEY = process.env.IGBO_API_KEY;

// Using lowercase for broadest API matching
const PREFIXES = [
    'chi', 'chukwu', 'ada', 'obi', 'olu', 'ife', 'ugo', 'nne', 'nke', 'ogo', 'ngo',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'v', 'w', 'y', 'z'
];

async function importIgboNames() {
    const { supabaseAdmin } = await import('../lib/supabase');

    if (!API_KEY) {
        console.error('❌ Missing IGBO_API_KEY');
        return;
    }

    console.log('🧹 Cleaning up existing Igbo data...');
    try {
        const { data: igboNames } = await supabaseAdmin.from('names').select('id').eq('origin', 'Igbo');
        if (igboNames && igboNames.length > 0) {
            const ids = igboNames.map((n: any) => n.id);
            await supabaseAdmin.from('audio_submissions').delete().in('name_id', ids);
            await supabaseAdmin.from('names').delete().in('id', ids);
            console.log(`   - Deleted ${ids.length} existing Igbo names.`);
        }
    } catch (e) {
        console.error('Cleanup warning:', e);
    }

    console.log('🚀 Starting Broad Igbo Names Import...');
    let totalNamesAdded = 0;

    for (const prefix of PREFIXES) {
        let offset = 0;
        let hasMore = true;
        let batchYieldLimit = 50; // Allow deeper dive for common prefixes

        while (hasMore) {
            try {
                const res = await fetch(`${IGBO_API_URL}/words?keyword=${prefix}&range=[${offset},${offset + 49}]`, {
                    headers: { 'X-API-Key': API_KEY }
                });

                if (!res.ok) {
                    hasMore = false;
                    break;
                }

                const data = await res.json();
                if (!data || data.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const entry of data) {
                    const word = entry.word || '';
                    const wordClass = entry.wordClass || '';
                    const meaningJoined = (entry.definitions || []).join(', ').toLowerCase();

                    // BROADER FILTER:
                    // wordClass matches Name (NM, NNC) OR definition explicitly mentions name
                    const isName =
                        wordClass === 'NM' ||
                        wordClass === 'NNC' ||
                        meaningJoined.includes('name of') ||
                        meaningJoined.includes('given name') ||
                        meaningJoined.includes('person name');

                    if (!isName) continue;

                    // Clean and normalize name
                    // Removing those pesky diacritics for the main 'name' column if possible or keep them?
                    // Let's keep them (rich data) but normalize capitalization.
                    const nameClean = word.charAt(0).toUpperCase() + word.slice(1);

                    const { data: existing } = await supabaseAdmin
                        .from('names')
                        .select('id')
                        .eq('name', nameClean)
                        .eq('origin', 'Igbo')
                        .maybeSingle();

                    if (!existing) {
                        const { data: inserted, error: insertError } = await supabaseAdmin
                            .from('names')
                            .insert({
                                name: nameClean,
                                origin: 'Igbo',
                                meaning: (entry.definitions || []).join(', ').slice(0, 500),
                                verification_status: 'verified',
                                audio_url: entry.pronunciation
                            })
                            .select()
                            .single();

                        if (!insertError) {
                            totalNamesAdded++;
                            process.stdout.write('+');
                        }
                    }
                }

                offset += data.length;

                // If we've searched 1000 items in a prefix, move on to keep speed up.
                if (offset > 1000) hasMore = false;

            } catch (e) {
                hasMore = false;
            }
        }
        console.log(`\n✅ Finished prefix "${prefix}". Total so far: ${totalNamesAdded}`);
    }

    console.log(`\n\n🎉 Import Complete! Total Names Added: ${totalNamesAdded}`);
}

importIgboNames();
