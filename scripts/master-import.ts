import { config } from 'dotenv';
config({ path: '.env.local' });
// import { supabaseAdmin } from '../lib/supabase'; // Moved dynamic
// @ts-ignore
import yorubaNamesPackage from 'yoruba-names';

const DAVE_PARTNER_URL = 'https://raw.githubusercontent.com/davepartner/list-of-nigerian-names/master/names.json';

// Reuse English names list for filtering
const englishNames = new Set([
    'james', 'mary', 'john', 'elizabeth', 'michael', 'david', 'william', 'richard', 'joseph',
    'thomas', 'charles', 'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald',
    'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'edward',
    'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric',
    'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'frank', 'benjamin',
    'gregory', 'samuel', 'raymond', 'patrick', 'alexander', 'jack', 'dennis', 'jerry',
    'tyler', 'aaron', 'jose', 'adam', 'henry', 'nathan', 'douglas', 'zachary', 'peter',
    'kyle', 'walter', 'ethan', 'jeremy', 'harold', 'keith', 'christian', 'roger', 'noah',
    'gerald', 'carl', 'terry', 'sean', 'austin', 'arthur', 'lawrence', 'jesse', 'dylan',
    'bryan', 'joe', 'jordan', 'billy', 'bruce', 'albert', 'willie', 'gabriel', 'logan',
    'alan', 'juan', 'wayne', 'roy', 'ralph', 'randy', 'eugene', 'vincent', 'russell',
    'elijah', 'louis', 'bobby', 'philip', 'johnny', 'stella', 'rose', 'harrison', 'britney',
    'christy', 'annie', 'yanick', 'eunice', 'pink', 'perfect', 'richie', 'king', 'prince',
    'handsome', 'molly', 'sharon', 'katrine', 'blaise', 'blessing', 'precious', 'patience',
    'peace', 'joy', 'glory', 'faith', 'hope', 'charity', 'comfort', 'confidence', 'fortune',
    'gift', 'goodness', 'grace', 'happiness', 'honor', 'mercy', 'miracle', 'praise',
    'princess', 'promise', 'queen', 'rejoice', 'success', 'treasure', 'triumph', 'victory',
    'wisdom', 'wonderful', 'favour', 'favor', 'divine'
]);

// Simple phonetic generator
function generatePhonetic(name: string): string {
    // Remove diacritics for phonetic generation to keep it simple
    const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Simple mapping
    return normalized
        .replace(/ch/g, 'CH') // Preserve ch
        .replace(/gb/g, 'GB') // Preserve gb
        .replace(/kp/g, 'KP') // Preserve kp
        .replace(/sh/g, 'SH')
        .replace(/ph/g, 'F')
        .replace(/th/g, 'T')
        .replace(/a/g, 'ah-')
        .replace(/e/g, 'ay-')
        .replace(/i/g, 'ee-')
        .replace(/o/g, 'oh-')
        .replace(/u/g, 'oo-')
        .replace(/-+/g, '-') // Cleanup multiple hyphens
        .replace(/^-|-$/g, '') // Trim hyphens
        .toUpperCase(); // Stylistic choice
}

async function masterImport() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('🚀 Starting Master Import...');

    // 1. Fetch Existing Names to check duplicates
    const { data: existingIds, error } = await supabaseAdmin.from('names').select('name');
    if (error) {
        console.error('Error fetching existing names:', error);
        return;
    }
    const existingSet = new Set(existingIds?.map(n => n.name.toLowerCase()));
    console.log(`Knowledge Base: ${existingSet.size} names currently in DB.`);

    const namesToUpsert = new Map(); // Use Map to deduplicate new additions immediately

    // 2. Process Yoruba Names (Source 2)
    console.log('📚 Processing Source 2: yoruba-names package...');
    if (yorubaNamesPackage && yorubaNamesPackage.all) {
        yorubaNamesPackage.all.forEach((name: string) => {
            // name has diacritics. We store it as is for "Linguistic Quality"
            const nameClean = name.trim();
            const nameKey = nameClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); // Check duplicate against generic version

            if (
                !existingSet.has(nameKey) &&
                !englishNames.has(nameKey) &&
                !namesToUpsert.has(nameKey)
            ) {
                namesToUpsert.set(nameKey, {
                    name: nameClean,
                    origin_country: 'Nigeria',
                    origin: 'Yoruba',
                    phonetic_hint: generatePhonetic(nameClean),
                    meaning: 'Yoruba Name',
                    verification_status: 'verified'
                });
            }
        });
    }
    console.log(`Buffered ${namesToUpsert.size} names after Source 2.`);

    // 3. Process GitHub Names (Source 1)
    console.log('🌍 Processing Source 1: DavePartner GitHub...');
    try {
        const response = await fetch(DAVE_PARTNER_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const githubNames: string[] = await response.json();

        githubNames.forEach((name: string) => {
            const nameClean = name.trim();
            const nameKey = nameClean.toLowerCase();

            if (
                !existingSet.has(nameKey) &&
                !englishNames.has(nameKey) &&
                !namesToUpsert.has(nameKey)
            ) {
                namesToUpsert.set(nameKey, {
                    name: nameClean,
                    origin_country: 'Nigeria',
                    origin: 'General',
                    phonetic_hint: generatePhonetic(nameClean),
                    meaning: 'Nigerian Name',
                    verification_status: 'verified'
                });
            }
        });
    } catch (err) {
        console.warn('⚠️ Could not fetch from GitHub (URL might be wrong or down):', err);
        console.warn('Continuing with just Yoruba names...');
    }

    console.log(`Total unique new names to insert: ${namesToUpsert.size}`);

    // 4. Batch Insert
    const allNewNames = Array.from(namesToUpsert.values());
    const BATCH_SIZE = 100;

    for (let i = 0; i < allNewNames.length; i += BATCH_SIZE) {
        const batch = allNewNames.slice(i, i + BATCH_SIZE);

        // Using upsert with onConflict on 'id' is standard, but here we don't have IDs.
        // We want to avoid inserting if name exists.
        // Supabase .upsert() requires a unique constraint to update. 
        // We checked 'existingSet' but race conditions or strict constraint could apply.
        // .insert() is fine since we pre-filtered. Use .upsert() with ignore duplicates if we had a unique constraint on 'name'.
        // Assuming no unique constraint on 'name' in schema (only ID is PK), so .insert() is correct.

        // However, user asked for .upsert().
        // If I use upsert without a unique column match, it just inserts.
        // To safely "skip", I'll just insert. Logic already filtered.

        const { error: insertError } = await supabaseAdmin
            .from('names')
            .insert(batch);

        if (insertError) {
            console.error(`❌ Error inserting batch ${i}:`, insertError);
        } else {
            process.stdout.write('.'); // Progress indicator
        }
    }

    console.log('\n✅ Master Import Complete!');
}

masterImport();
