import { config } from 'dotenv';
// Load environment variables from .env.local
config({ path: '.env.local' });

import { supabaseAdmin } from '../lib/supabase';

const namesToInsert = [
    { name: 'Babatunde', origin_country: 'Nigeria', language: 'Yoruba', phonetic_hint: 'Bah-bah-TOON-day', meaning: 'Father has returned' },
    { name: 'Chinedu', origin_country: 'Nigeria', language: 'Igbo', phonetic_hint: 'Chi-nay-DOO', meaning: 'God leads' },
    { name: 'Abubakar', origin_country: 'Nigeria', language: 'Hausa', phonetic_hint: 'Ah-boo-BAH-kar', meaning: 'Noble/Successor' },
    { name: 'Olumide', origin_country: 'Nigeria', language: 'Yoruba', phonetic_hint: 'Oh-loo-MEE-day', meaning: 'My Lord has come' },
    { name: 'Amarachi', origin_country: 'Nigeria', language: 'Igbo', phonetic_hint: 'Ah-mah-rah-CHEE', meaning: "God's grace" },
    { name: 'Aminu', origin_country: 'Nigeria', language: 'Hausa', phonetic_hint: 'Ah-MEE-noo', meaning: 'Trustworthy' },
    { name: 'Omawumi', origin_country: 'Nigeria', language: 'Itsekiri', phonetic_hint: 'Oh-mah-WOO-mee', meaning: 'The child attracts me' },
    { name: 'Efe', origin_country: 'Nigeria', language: 'Urhobo', phonetic_hint: 'EH-fay', meaning: 'Wealth' },
    { name: 'Osaze', origin_country: 'Nigeria', language: 'Edo', phonetic_hint: 'Oh-SAH-zay', meaning: 'Whom God has chosen' },
    { name: 'Titilayo', origin_country: 'Nigeria', language: 'Yoruba', phonetic_hint: 'Tee-tee-LAH-yoh', meaning: 'Eternal joy' },
    { name: 'Chukwuebuka', origin_country: 'Nigeria', language: 'Igbo', phonetic_hint: 'Choo-kwoo-ay-BOO-kah', meaning: 'God is great' },
    { name: 'Damilola', origin_country: 'Nigeria', language: 'Yoruba', phonetic_hint: 'Dah-mee-LOH-lah', meaning: 'Wealthy' },
    { name: 'Nneka', origin_country: 'Nigeria', language: 'Igbo', phonetic_hint: 'NN-neh-kah', meaning: 'Mother is supreme' },
    { name: 'Sani', origin_country: 'Nigeria', language: 'Hausa', phonetic_hint: 'SAH-nee', meaning: 'Resplendent' },
    { name: 'Funmilayo', origin_country: 'Nigeria', language: 'Yoruba', phonetic_hint: 'Foo-mee-LAH-yoh', meaning: 'Give me joy' },
    { name: 'Ifeanyi', origin_country: 'Nigeria', language: 'Igbo', phonetic_hint: 'Ee-fay-AH-nyee', meaning: 'Nothing is impossible' },
    { name: 'Zainab', origin_country: 'Nigeria', language: 'Hausa', phonetic_hint: 'ZAY-nab', meaning: 'Fragrant flower' },
    { name: 'Toluwalope', origin_country: 'Nigeria', language: 'Yoruba', phonetic_hint: 'Toh-loo-wah-LOH-pay', meaning: 'To God be the praise' },
    { name: 'Kelechi', origin_country: 'Nigeria', language: 'Igbo', phonetic_hint: 'Keh-LAY-chee', meaning: 'Glorify God' },
    { name: 'Yusuf', origin_country: 'Nigeria', language: 'Hausa', phonetic_hint: 'YOO-soof', meaning: 'God increases' },
];

async function seedData() {
    console.log('Seeding data...');

    const { data, error } = await supabaseAdmin
        .from('names')
        .insert(namesToInsert)
        .select();

    if (error) {
        console.error('Error seeding data:', error);
    } else {
        console.log(`Successfully inserted ${data?.length} names.`);
    }
}

seedData();
