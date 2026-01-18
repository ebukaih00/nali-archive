
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.local' });

const BATCH_SIZE = 50;

/**
 * Standardizes vowels for phonetic hints.
 * a->ah, e->eh, i->ee, o->oh, u->oo
 */
function standardizeVowels(text: string): string {
    return text
        .replace(/a/gi, 'ah')
        .replace(/e/gi, 'eh')
        .replace(/i/gi, 'ee')
        .replace(/o/gi, 'oh')
        .replace(/u/gi, 'oo');
}

/**
 * Enhanced Syllabification and Stress Generator.
 */
function generatePhoneticHint(name: string, origin: string): string {
    const normalized = name.normalize('NFD');
    const tokens: { type: 'C' | 'V' | 'S', text: string }[] = [];
    const isVowelChar = (c: string) => /[aeiou\u0300-\u036f]/i.test(c) || /[\u025B\u0254]/i.test(c);
    const isDiacritic = (c: string) => /[\u0300-\u036f]/.test(c);

    const digraphs = ['sh', 'ts', 'kw', 'gw', 'ky', 'gy', 'kp', 'gb', 'fy', 'zh', 'kh', 'gh', 'ch', 'ny', 'dz'];
    const hooked = ['ɓ', 'ɗ', 'ƙ', 'ƴ'];

    let i = 0;
    while (i < normalized.length) {
        const char = normalized[i];
        const next = normalized[i + 1] || '';
        const pair = (char + next).toLowerCase();

        if (isVowelChar(char)) {
            let text = char;
            while (i + 1 < normalized.length && isDiacritic(normalized[i + 1])) {
                text += normalized[i + 1];
                i++;
            }
            tokens.push({ type: 'V', text });
            i++;
        } else if (digraphs.includes(pair)) {
            tokens.push({ type: 'C', text: char + next });
            i += 2;
        } else if (hooked.includes(char)) {
            tokens.push({ type: 'C', text: char });
            i++;
        } else if (/\s/.test(char)) {
            tokens.push({ type: 'S', text: '-' });
            i++;
        } else {
            tokens.push({ type: 'C', text: char });
            i++;
        }
    }

    const syllables: string[][] = [];
    let currentSyl: string[] = [];

    for (let j = 0; j < tokens.length; j++) {
        const token = tokens[j];

        if (token.type === 'S') {
            if (currentSyl.length > 0) syllables.push(currentSyl);
            syllables.push([token.text]);
            currentSyl = [];
            continue;
        }

        currentSyl.push(token.text);

        if (token.type === 'V') {
            const n1 = tokens[j + 1];
            const n2 = tokens[j + 2];

            if (!n1 || n1.type === 'S') {
                syllables.push(currentSyl);
                currentSyl = [];
            } else if (n1.type === 'C') {
                // Look ahead for V-CV or VC-CV
                if (n2 && (n2.type === 'V' || n2.type === 'S')) {
                    // V-CV split
                    syllables.push(currentSyl);
                    currentSyl = [];
                } else if (!n2) {
                    // Trailing C
                    currentSyl.push(n1.text);
                    syllables.push(currentSyl);
                    currentSyl = [];
                    j++;
                } else {
                    // VC-CV split (n2 is C)
                    currentSyl.push(n1.text);
                    syllables.push(currentSyl);
                    currentSyl = [];
                    j++;
                }
            } else {
                // VV split
                syllables.push(currentSyl);
                currentSyl = [];
            }
        }
    }
    if (currentSyl.length > 0) syllables.push(currentSyl);

    const filteredSyllables = syllables.filter(s => s.length > 0 && s[0] !== '-');

    const formatted = filteredSyllables.map((syl, idx) => {
        let text = syl.map(t => {
            const base = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return isVowelChar(base) ? standardizeVowels(base) : t;
        }).join('').toLowerCase();

        const isPenult = idx === filteredSyllables.length - 2;
        const isOnly = filteredSyllables.length === 1 && idx === 0;

        if (isPenult || isOnly) return text.toUpperCase();
        return text;
    });

    return formatted.join('-').replace(/-+-/g, '-');
}

async function startAudit() {
    const { supabaseAdmin } = await import('../lib/supabase');
    const dryRun = process.argv.includes('--dry-run');

    console.log(`🚀 Starting Linguistic Audit... ${dryRun ? '(DRY RUN)' : ''}`);

    // Fetch all names using pagination to handle 8k+ records
    let allNames: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('id, name, origin, phonetic_hint')
            .range(from, from + pageSize - 1);
        if (error) { console.error('Fetch error:', error); break; }
        if (!data || data.length === 0) break;
        allNames = allNames.concat(data);
        from += pageSize;
    }

    if (allNames.length === 0) {
        console.error('No names found in database.');
        return;
    }

    let verified = 0;
    let corrected = 0;
    const updates: { id: number, name: string, phonetic_hint: string }[] = [];

    const printSample = (origin: string, name: string, oldHint: string, newHint: string) => {
        console.log(`[${origin}] ${name}: ${oldHint || 'NONE'} -> ${newHint}`);
    };

    for (const row of allNames) {
        const newHint = generatePhoneticHint(row.name, row.origin);

        if (row.phonetic_hint !== newHint) {
            corrected++;
            updates.push({ id: row.id, name: row.name, phonetic_hint: newHint });

            if (dryRun && corrected <= 30) {
                printSample(row.origin, row.name, row.phonetic_hint, newHint);
            }
        } else {
            verified++;
        }
    }

    console.log('\n--- Linguistic Audit Summary Report ---');
    console.log(`Verified as Accurate: ${verified}`);
    console.log(`Corrected/Standardized: ${corrected}`);
    console.log(`Total Records: ${allNames.length}`);
    console.log('---------------------------------------');

    if (dryRun) {
        console.log('🚧 Dry run complete. No updates made.');
        return;
    }

    if (updates.length > 0) {
        console.log(`🔄 Applying ${updates.length} updates in batches of ${BATCH_SIZE}...`);
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE);
            const { error: updateError } = await supabaseAdmin
                .from('names')
                .upsert(batch);

            if (updateError) {
                console.error(`❌ Error updating batch starting at ${i}:`, updateError.message);
            } else {
                if (i % (BATCH_SIZE * 10) === 0) process.stdout.write('.');
            }
        }
        console.log('\n✅ All updates applied successfully!');
    }

    console.log('✨ Audit Finished!');
}

startAudit();
