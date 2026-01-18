import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabaseAdmin } from '../lib/supabase';

// Common English names list (expanded) - we will check case-insensitively
const englishNames = [
    'James', 'Mary', 'John', 'Elizabeth', 'Michael', 'David', 'William', 'Richard', 'Joseph',
    'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
    'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Edward',
    'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric',
    'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Frank', 'Benjamin',
    'Gregory', 'Samuel', 'Raymond', 'Patrick', 'Alexander', 'Jack', 'Dennis', 'Jerry',
    'Tyler', 'Aaron', 'Jose', 'Adam', 'Henry', 'Nathan', 'Douglas', 'Zachary', 'Peter',
    'Kyle', 'Walter', 'Ethan', 'Jeremy', 'Harold', 'Keith', 'Christian', 'Roger', 'Noah',
    'Gerald', 'Carl', 'Terry', 'Sean', 'Austin', 'Arthur', 'Lawrence', 'Jesse', 'Dylan',
    'Bryan', 'Joe', 'Jordan', 'Billy', 'Bruce', 'Albert', 'Willie', 'Gabriel', 'Logan',
    'Alan', 'Juan', 'Wayne', 'Roy', 'Ralph', 'Randy', 'Eugene', 'Vincent', 'Russell',
    'Elijah', 'Louis', 'Bobby', 'Philip', 'Johnny', 'Stella', 'Rose', 'Harrison', 'Britney',
    'Christy', 'Annie', 'Yanick', 'Eunice', 'Pink', 'Perfect', 'Richie', 'King', 'Prince',
    'Handsome', 'Molly', 'Sharon', 'Katrine', 'Blaise', 'Joe'
].map(n => n.toLowerCase());

const validLanguages = [
    'Yoruba', 'Igbo', 'Hausa', 'Edo', 'Itsekiri',
    'Urhobo', 'Efik', 'Ibibio', 'Tiv', 'Nupe',
    'Kanuri', 'Fula', 'Ijaw', 'Fulani'
].map(l => l.toLowerCase());

async function cleanupData() {
    console.log('Starting Aggressive DB Cleanup...');

    // Fetch ALL names first
    const { data: allNames, error } = await supabaseAdmin
        .from('names')
        .select('*');

    if (error || !allNames) {
        console.error('Error fetching names:', error);
        return;
    }

    console.log(`Analyzing ${allNames.length} names...`);

    const idsToDelete: number[] = [];

    for (const entry of allNames) {
        const nameLower = entry.name.toLowerCase();
        const langLower = (entry.language || '').toLowerCase();
        const countryLower = (entry.origin_country || '').toLowerCase();

        let shouldDelete = false;
        let reason = '';

        // Check 1: Is it in the explicit English blocklist?
        if (englishNames.includes(nameLower)) {
            shouldDelete = true;
            reason = 'English Name Blocklist';
        }
        // Check 2: Is the language explicitly valid?
        // If language is 'General' or null or 'English', it fails this check.
        else if (!validLanguages.includes(langLower)) {
            shouldDelete = true;
            reason = `Invalid Language: ${entry.language}`;
        }
        // Check 3: Is origin not Nigeria?
        else if (countryLower !== 'nigeria') {
            shouldDelete = true;
            reason = `Non-Nigerian Origin: ${entry.origin_country}`;
        }

        if (shouldDelete) {
            console.log(`Marking for deletion: ${entry.name} (${reason})`);
            idsToDelete.push(entry.id);
        }
    }

    if (idsToDelete.length === 0) {
        console.log('No names matched criteria for deletion.');
        return;
    }

    console.log(`Deleting ${idsToDelete.length} entries...`);

    const { error: deleteError } = await supabaseAdmin
        .from('names')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error('Error deleting rows:', deleteError);
    } else {
        console.log('Cleanup complete.');
    }
}

cleanupData();
