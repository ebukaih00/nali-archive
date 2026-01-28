
import { config } from 'dotenv';
config({ path: '.env.local' });
import { ElevenLabsClient } from "elevenlabs";
import fs from 'fs';

async function testFisayoVoice() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const client = new ElevenLabsClient({ apiKey });

    const FISAYO_VOICE_ID = 'it5NMxoQQ2INIh4XcO44';
    const TEST_NAME = 'Chukwuebuka';

    console.log(`🎙️ Testing Fisayo Voice (${FISAYO_VOICE_ID}) for name: ${TEST_NAME}`);

    try {
        const response: any = await client.textToSpeech.convert(FISAYO_VOICE_ID, {
            text: `<break time="200ms"/>${TEST_NAME.replace(/-/g, ' ')}`,
            model_id: "eleven_multilingual_v2",
            output_format: "mp3_44100_128",
            voice_settings: {
                stability: 0.8,
                similarity_boost: 0.95,
                style: 0.0,
                use_speaker_boost: true,
                speed: 0.9
            },
        });

        const fileName = `test-fisayo-${TEST_NAME.toLowerCase()}.mp3`;

        // Handle Web ReadableStream by consuming it
        const reader = response.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(fileName, buffer);

        console.log(`✅ Success! Audio saved to ${fileName}`);
    } catch (e: any) {
        if (e.message.includes('quota') || e.message.includes('401')) {
            console.error('❌ ElevenLabs Error: Your quota has been exceeded or API key is invalid.');
        } else {
            console.error('❌ Error during generation:', e.message);
        }
        console.log('\n💡 Note: If your credits are finished, you will need to upgrade to a Pro subscription to generate new audio.');
    }
}

testFisayoVoice();
