
import { config } from 'dotenv';
config({ path: '.env.local' });

interface NameEntry {
    name: string;
    meaning: string;
    origin: string;
    origin_country: string;
    phonetic_hint: string;
    verification_status: string;
}

const itsekiriNames = [
    { name: "Abidemi", meaning: "Born before arrival of father/grandparents" },
    { name: "Aboyowa", meaning: "Child that brings joy" },
    { name: "Ajemigbitse", meaning: "Bless me" },
    { name: "Ajuremisan", meaning: "The light of my stars" },
    { name: "Amajuoritse", meaning: "We cannot know more than God" },
    { name: "Amejuma", meaning: "No one knows tomorrow" },
    { name: "Aritsefino", meaning: "No key to the human heart" },
    { name: "Atigbioritse", meaning: "Remember God" },
    { name: "AyiriOritse", meaning: "Praise the Lord" },
    { name: "Eyimofe", meaning: "This is my desire" },
    { name: "Monoyooritse", meaning: "I am full of God's joy" },
    { name: "Omaghomi", meaning: "My child will look after me" },
    { name: "Omamofe", meaning: "The child I have been looking for" },
    { name: "Omasan", meaning: "Good child" },
    { name: "Omawumi", meaning: "I love children" },
    { name: "Oritsefemi", meaning: "God loves me" },
    { name: "Oritsejemide", meaning: "God made me stand" },
    { name: "Oritsemeyiwa", meaning: "Brought by the Lord" },
    { name: "Oritsemodupe", meaning: "God, I am grateful" },
    { name: "Oritsemoyowa", meaning: "Joy from the Lord" },
    { name: "Oritsetimeyin", meaning: "God has my back" },
    { name: "Oritsetsemaye", meaning: "I am in God's favor" },
    { name: "Oritsetsolaye", meaning: "Lord grants us favors" },
    { name: "Oritseweyinmi", meaning: "God is with me" },
    { name: "Oritsuwa", meaning: "God of Wealth" },
    { name: "Osandatuwa", meaning: "Return of the favor" },
    { name: "Temisanren", meaning: "My own is better now" },
    { name: "Toghanranrose", meaning: "Enemies' plans have failed" },
    { name: "Toritsefe", meaning: "What God wants" },
    { name: "Alero", meaning: "Firstborn female" },
    { name: "Besida", meaning: "As destiny dictates" },
    { name: "Dolor", meaning: "Money" },
    { name: "Ebeji", meaning: "Twins" },
    { name: "Orighomisan", meaning: "My head is good" },
    { name: "Urowoli", meaning: "Softness has come in" },
    { name: "Agbeyegbe", meaning: "You do not live forever" },
    { name: "Agboghoroma", meaning: "You cannot buy a child with money" },
    { name: "Arenyeka", meaning: "You cannot walk the universe" },
    { name: "Arueyingho", meaning: "Think about your future" },
    { name: "Edema", meaning: "Gentleman" },
    { name: "Mene", meaning: "First" },
    { name: "Omatsuli", meaning: "The child makes the home" },
    { name: "Omatseye", meaning: "Child is life" },
    { name: "Ukuedojor", meaning: "Death has no day" }
];

const isokoNames = [
    { name: "Afokeoghene", meaning: "Leave it for God" },
    { name: "Ajiroghene", meaning: "Let's praise God" },
    { name: "Ejiroghene", meaning: "Praise God" },
    { name: "Eloghene", meaning: "Light of God" },
    { name: "Eseoghene", meaning: "God's gift" },
    { name: "Evioghene", meaning: "God's blessings" },
    { name: "Iruoghene", meaning: "God's work" },
    { name: "Ogagaoghene", meaning: "God's power" },
    { name: "Oghenefegho", meaning: "God is worthy of praise" },
    { name: "Oghenerukevwe", meaning: "God has done well for me" },
    { name: "Oghenetega", meaning: "God is worthy of praise" },
    { name: "Oghenevize", meaning: "God sent" },
    { name: "Ogheneyole", meaning: "God answered my prayers" },
    { name: "Okeoghene", meaning: "God's gift" },
    { name: "Akpo", meaning: "Life" },
    { name: "Akpobome", meaning: "My precious life" },
    { name: "Akpofure", meaning: "Life is peaceful" },
    { name: "Isioma", meaning: "Good luck" },
    { name: "Odafe", meaning: "A wealthy person" },
    { name: "Eguono", meaning: "Love" },
    { name: "Ewoma", meaning: "Goodness" },
    { name: "Ewomazino", meaning: "Goodness has come" },
    { name: "Oghogho", meaning: "Joy" },
    { name: "Ufuoma", meaning: "Peace" },
    { name: "Ufuomaoghene", meaning: "Peace of God" },
    { name: "Omonigho", meaning: "A child is greater than money" },
    { name: "Onimaro", meaning: "Mother is important" },
    { name: "Ovie", meaning: "King" },
    { name: "Orowo", meaning: "Faith" },
    { name: "Onome", meaning: "This is mine" },
    { name: "Onajite", meaning: "This is sufficient" },
    { name: "Mazino", meaning: "We have arrived" },
    { name: "Edewor", meaning: "Traditional day of Sacred Worship" }
];

async function start() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('🚀 Starting Delta Names Import (Itsekiri & Isoko)...');

    const namesToInsert: NameEntry[] = [];

    // Prepare Itsekiri
    itsekiriNames.forEach(n => {
        namesToInsert.push({
            name: n.name,
            meaning: n.meaning,
            origin: 'Itsekiri',
            origin_country: 'Nigeria',
            phonetic_hint: n.name, // Placeholder
            verification_status: 'verified'
        });
    });

    // Prepare Isoko
    isokoNames.forEach(n => {
        namesToInsert.push({
            name: n.name,
            meaning: n.meaning,
            origin: 'Isoko',
            origin_country: 'Nigeria',
            phonetic_hint: n.name, // Placeholder
            verification_status: 'verified'
        });
    });

    console.log(`🔍 Prepared ${namesToInsert.length} names to import.`);

    // Check against DB
    const { data: existingData, error: fetchError } = await supabaseAdmin
        .from('names')
        .select('name');

    if (fetchError) {
        console.error('❌ Error fetching existing names:', fetchError.message);
        return;
    }

    const existingNamesSet = new Set(existingData?.map((n: any) => n.name.toLowerCase()));
    const finalNames = namesToInsert.filter(n => !existingNamesSet.has(n.name.toLowerCase()));

    console.log(`✨ New names to insert: ${finalNames.length} (Skipped ${namesToInsert.length - finalNames.length} duplicates)`);

    if (finalNames.length === 0) {
        console.log('✅ No new names to insert.');
        return;
    }

    // Insert
    const { error } = await supabaseAdmin.from('names').insert(finalNames).select();

    if (error) {
        console.error(`❌ Error inserting:`, error.message);
    } else {
        console.log(`✅ Inserted ${finalNames.length} Delta names.`);
    }
}

start();
