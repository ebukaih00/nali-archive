import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars before importing supabase
config({ path: '.env.local' });

const RAW_FILE_PATH = path.join(__dirname, '../data/hausa_names_raw.txt');

interface NameEntry {
    name: string;
    meaning: string;
    origin: string;
    origin_country: string;
    phonetic_hint: string;
}

function generateHausaPhonetic(name: string): string {
    // Normalize and clean
    const cleanName = name.trim();
    if (!cleanName) return '';

    // Vowel mapping: a->ah, e->eh, i->ee, o->oh, u->oo
    const mapVowel = (v: string) => {
        switch (v.toLowerCase()) {
            case 'a': return 'ah';
            case 'e': return 'eh';
            case 'i': return 'ee';
            case 'o': return 'oh';
            case 'u': return 'oo';
            default: return v;
        }
    };

    const isVowel = (char: string) => /^[aeiou]$/i.test(char);
    // Digraphs and special chars treated as single consonants for syllabification
    // Special: ɓ, ɗ, ƙ
    // Digraphs: sh, ts, kw, gw, ky, gy, kp, gb, fy, zh
    const digraphs = ['sh', 'ts', 'kw', 'gw', 'ky', 'gy', 'kp', 'gb', 'fy', 'zh', 'kh', 'gh']; // Added kh, gh just in case

    // Tokenize the name into "Consonant" and "Vowel" units
    // We'll treat digraphs as a single C token.
    const tokens: { type: 'C' | 'V', text: string }[] = [];

    let i = 0;
    while (i < cleanName.length) {
        const char = cleanName[i];
        const next = cleanName[i + 1] || '';

        if (isVowel(char)) {
            tokens.push({ type: 'V', text: char });
            i++;
        } else {
            // Check digraph
            const pair = (char + next).toLowerCase();
            if (digraphs.includes(pair)) {
                tokens.push({ type: 'C', text: char + next });
                i += 2;
            } else {
                tokens.push({ type: 'C', text: char });
                i++;
            }
        }
    }

    // Syllabification Rules
    // Iterate tokens and build syllables
    const syllables: string[][] = []; // Array of arrays of tokens
    let currentSyllable: string[] = [];

    for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j];

        currentSyllable.push(token.text);

        if (token.type === 'V') {
            // Look ahead
            const next1 = tokens[j + 1];
            const next2 = tokens[j + 2];

            if (!next1) {
                // End of word
                syllables.push(currentSyllable);
                currentSyllable = [];
            } else if (next1.type === 'C') {
                if (!next2) {
                    // Ends with C -> CVC. Add next C to this syllable.
                    currentSyllable.push(next1.text);
                    syllables.push(currentSyllable);
                    currentSyllable = [];
                    j++; // consumed next1
                } else if (next2.type === 'V') {
                    // V-CV split. Current syl ends here. Next C starts new one.
                    syllables.push(currentSyllable);
                    currentSyllable = [];
                } else if (next2.type === 'C') {
                    // VC-CV split. Add next1 to this syllable.
                    currentSyllable.push(next1.text);
                    syllables.push(currentSyllable);
                    currentSyllable = [];
                    j++; // consumed next1
                }
            } else if (next1.type === 'V') {
                // VV split (hiatus). End current.
                syllables.push(currentSyllable);
                currentSyllable = [];
            }
        }
    }
    // Cleanup if any leftovers (shouldn't happen with correct logic but safe to check)
    if (currentSyllable.length > 0) {
        syllables.push(currentSyllable);
    }

    // Format output
    // Syllables joined by dashes.
    // Penultimate syllable capitalized (Stress).
    // If < 2 syllables, capitalize the single one.

    const formattedSyllables = syllables.reverse().map((sylTokens, idx) => {
        // Reverse index: 0 is last, 1 is penultimate, etc.
        const isPenultimate = idx === 1;
        const isOnly = syllables.length === 1 && idx === 0; // If only 1, it's 0th in reversed

        // Map vowels
        let text = sylTokens.map(t => {
            if (isVowel(t)) return mapVowel(t);
            return t;
        }).join('');

        if (isPenultimate || isOnly) {
            return text.toUpperCase();
        }
        return text.toLowerCase(); // Others lowercase? Or preserve case? Prompt examples imply lowercase usually: 'ah-BAR-shee'
    });

    return formattedSyllables.reverse().join('-');
}

async function start() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('🚀 Starting Hausa Names Import...');

    if (!fs.existsSync(RAW_FILE_PATH)) {
        console.error(`❌ File not found: ${RAW_FILE_PATH}`);
        return;
    }

    const fileContent = fs.readFileSync(RAW_FILE_PATH, 'utf-8');
    const lines = fileContent.split('\n');

    const namesToInsert: NameEntry[] = [];

    let currentName: string | null = null;
    let currentMeaning: string[] = [];

    // Regex to capture line start: "1. Name Gender Meaning" or "1. Name Meaning" (since we ignore gender, but it's there)
    // The prompt format: "1. Abaici F One born..."
    // S/N is "1." or "100."
    const lineRegex = /^\s*(\d+)\.\s+([^\s]+)\s+([MFU])\s+(.*)$/;
    // Also handle Islamic names section which might reset numbering or format?
    // "1. Abba M Father..."

    const islamicHeaderRegex = /Localized Islamic\/Arabic Hausa Names/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.match(islamicHeaderRegex)) continue;
        if (trimmed.startsWith('S/N')) continue;
        if (trimmed.match(/^Date:/)) continue; // Artifact of copy paste?
        if (trimmed.match(/^\f/)) continue; // Form feed

        const match = trimmed.match(lineRegex);
        if (match) {
            // Save previous
            if (currentName) {
                const meaning = currentMeaning.join(' ').trim();
                namesToInsert.push({
                    name: currentName,
                    meaning: meaning,
                    origin: 'Hausa',
                    origin_country: 'Nigeria',
                    phonetic_hint: generateHausaPhonetic(currentName)
                });
            }

            // Start new
            // match[1] = SN, match[2] = Name, match[3] = Gender, match[4] = Meaning start
            currentName = match[2];
            // Ignore Gender (match[3])
            currentMeaning = [match[4]];
        } else {
            // Continuation of meaning?
            // Check if it looks like a page number or header junk
            if (/^\d+$/.test(trimmed)) continue; // likely page number

            if (currentName) {
                currentMeaning.push(trimmed);
            }
        }
    }

    // Push last one
    if (currentName) {
        const meaning = currentMeaning.join(' ').trim();
        namesToInsert.push({
            name: currentName,
            meaning: meaning,
            origin: 'Hausa',
            origin_country: 'Nigeria',
            phonetic_hint: generateHausaPhonetic(currentName)
        });
    }

    console.log(`🔍 Found ${namesToInsert.length} names to import.`);

    if (process.argv.includes('--dry-run')) {
        console.log('🚧 DRY RUN MODE');
        console.log(JSON.stringify(namesToInsert.slice(0, 10), null, 2));
        console.log('...');
        console.log(JSON.stringify(namesToInsert.slice(-5), null, 2));
        return;
    }

    // Insert
    // Batch in 100s
    const batchSize = 100;
    for (let i = 0; i < namesToInsert.length; i += batchSize) {
        const batch = namesToInsert.slice(i, i + batchSize);
        const { error } = await supabaseAdmin.from('names').insert(batch).select();

        if (error) {
            console.error(`❌ Error inserting batch ${i}:`, error.message);
        } else {
            console.log(`✅ Inserted batch ${i} - ${i + batch.length}`);
        }
    }
}

start();
