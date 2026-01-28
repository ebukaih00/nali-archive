
import { config } from 'dotenv';
config({ path: '.env.local' });
import { ElevenLabsClient } from "elevenlabs";

async function testKeys() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log('Key:', apiKey ? apiKey.substring(0, 5) + '...' : 'MISSING');
    const client = new ElevenLabsClient({ apiKey });
    try {
        const voices = await client.voices.getAll();
        console.log('Voices found:', voices.voices.length);
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
testKeys();
