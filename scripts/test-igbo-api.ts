
import { config } from 'dotenv';
config({ path: '.env.local' });

async function testIgboApi() {
    console.log('--- Testing Igbo API ---');
    const IGBO_API_URL = 'https://igboapi.com/api/v1';
    const API_KEY = process.env.IGBO_API_KEY;

    try {
        const keyword = 'Ngozi';
        const response = await fetch(`${IGBO_API_URL}/words?keyword=${keyword}&range=[0,5]`, {
            headers: { 'X-API-Key': API_KEY || '' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            console.log('Entry structure:', JSON.stringify(data[0], null, 2));
        } else {
            console.log(`No data found for ${keyword}`);
        }
    } catch (e) {
        console.error(e);
    }
}
testIgboApi();

