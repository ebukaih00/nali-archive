
import * as cheerio from 'cheerio';

async function probe() {
    const url = 'https://www.myigboname.com/entries/akamnonu';
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const name = $('h1').text().trim();
    console.log('Name:', name);

    // Dump some structure to find Meaning and Phonetic
    // Usually it's in a specific container.
    // Based on markdown: 
    // # Akamnonu
    // /Aka-m-na-ọnụ/
    // lit: I prevail with words.

    // It might be just text nodes or paragraphs.
    const content = $('.entry-content, .content, #content, body').text(); // broad check
    // console.log('dump:', content.slice(0, 500));

    // Check common classes
    const phonetic = $('span.pronunciation, .phonetic').text() || 'N/A';
    console.log('Phonetic Class:', phonetic);

    // Try to find text with slashes
    $('div, p, span').each((i, el) => {
        const t = $(el).text().trim();
        if (t.startsWith('/') && t.endsWith('/')) {
            console.log('Found Phonetic Candidate:', t);
        }
        if (t.toLowerCase().includes('lit:')) {
            console.log('Found Meaning Candidate:', t);
        }
    });
}

probe();
