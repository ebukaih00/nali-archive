
import { config } from 'dotenv';
config({ path: '.env.local' });

const IGBO_API_URL = 'https://igboapi.com/api/v1';
const API_KEY = process.env.IGBO_API_KEY;

async function testFetchAll() {
    console.log('--- Testing Fetch All (No Keyword) ---');
    try {
        console.log('Fetching [0,9]...');
        const res1 = await fetch(`${IGBO_API_URL}/words?keyword=a&range=[0,9]`, { headers: { 'X-API-Key': API_KEY || '' } });
        const data1 = await res1.json();
        console.log(`Page 1: ${data1.length} items.`);

        console.log('Fetching [10,19]...');
        const res2 = await fetch(`${IGBO_API_URL}/words?keyword=a&range=[10,19]`, { headers: { 'X-API-Key': API_KEY || '' } });
        const data2 = await res2.json();
        console.log(`Page 2: ${data2.length} items.`);
        if (data2.length > 0) console.log('Sample P2:', data2[0].word);

    } catch (e) {
        console.error(e);
    }
}

testFetchAll();
