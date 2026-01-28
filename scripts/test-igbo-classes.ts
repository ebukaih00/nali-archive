
import { config } from 'dotenv';
config({ path: '.env.local' });

const IGBO_API_URL = 'https://igboapi.com/api/v1';
const API_KEY = process.env.IGBO_API_KEY;

async function testKeywordName() {
    console.log('--- Testing keyword=name ---');
    try {
        const res = await fetch(`${IGBO_API_URL}/words?keyword=name&range=[0,20]`, {
            headers: { 'X-API-Key': API_KEY || '' }
        });
        const data = await res.json();
        console.log(`keyword=name: ${data.length} items.`);
        if (data.length > 0) {
            data.forEach((e: any) => console.log(`- ${e.word} (${e.wordClass}): ${e.definitions[0]}`));
        }

    } catch (e) {
        console.error(e);
    }
}
testKeywordName();
