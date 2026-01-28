
import { config } from 'dotenv';
config({ path: '.env.local' });

const CHUKWU_OFFSETS: Record<number, string> = {
    19031: 'oh-DEE-nah-kah-choo-kwoo',
    19072: 'oh-GAY-choo-kwoo',
    19074: 'oh-GEM-dee-nah-kah-choo-kwoo',
    16262: 'ah-BOOM-nkay-choo-kwoo',
    19078: 'oh-GOH-choo-kwoo',
    19113: 'oh-KAY-choo-kwoo',
    19161: 'oh-KWOO-choo-kwoo',
    19166: 'oh-KWOO-dee-ree-choo-kwoo',
    19188: 'oh-LOO-choo-kwoo',
    19189: 'oh-LOO-oh-mah-choo-kwoo',
    19217: 'oh-NOO-choo-kwoo',
    19383: 'toh-CHOO-kwoo',
    19567: 'oo-GOH-choo-kwoo',
    19588: 'oo-KOH-choo-kwoo',
    19394: 'oo-CHAY-choo-kwoo',
    19415: 'oo-DOH-choo-kwoo',
    19368: 'rah-LOO-choo-kwoo',
    19372: 'rah-POO-loo-choo-kwoo',
    19377: 'sohm-toh-CHOO-kwoo',
    19613: 'oo-NAH-choo-kwoo',
    19379: 'so-POO-loo-choo-kwoo',
    19627: 'oo-ZOH-choo-kwoo',
    16336: 'ah-KAH-choo-kwoo',
    16311: 'ah-GOO-choo-kwoo',
    16333: 'ah-JOO-loo-choo-kwoo',
    16396: 'ah-MAH-rah-choo-kwoo',
    16430: 'ah-NAY-nay-choo-kwoo',
    16478: 'ah-REEN-zay-choo-kwoo',
    16753: 'CHAY-tah-choo-kwoo',
    16896: 'CHOO-kwoo',
    16901: 'choo-kwoo-eh-BOO-kah',
    16897: 'choo-kwoo-BWEE-kay',
    16898: 'choo-kwoo-DAH-loo',
    16899: 'choo-kwoo-DEH-beh-loo',
    16900: 'CHOO-kwoo-dee',
    16902: 'choo-kwoo-eh-MAY-kah',
    16903: 'choo-kwoo-eh-MAY-ree-ay',
    16904: 'choo-kwoo-EH-zay',
    16905: 'choo-kwoo-eh-ZOO-go',
    16906: 'choo-kwoo-foo-m-nah-ANYA',
    16907: 'choo-kwoo-JAY-kwoo',
    16908: 'choo-kwoo-KAH',
    16909: 'choo-kwoo-kah-DEE-bee-ah',
    16910: 'CHOO-kwoo-mah',
    16911: 'choo-kwoo-NEH-kay',
    16912: 'choo-kwoo-nay-TAHM',
    16913: 'choo-kwoo-nway-EE-kay',
    16914: 'choo-kwoo-nway-EE-kay',
    16916: 'choo-kwoo-RAH',
    16915: 'choo-kwoo-OH-go',
    17158: 'eh-KAY-nay-dee-lee-choo-kwoo',
    19373: 'soh-CHOO-kwoo-mah',
    17112: 'eh-BAY-lay-choo-kwoo',
    17188: 'eh-LOH-choo-kwoo',
    17225: 'eh-SOHM-choo-kwoo',
    17245: 'eh-ZAY-choo-kwoo',
    17302: 'gee-NEE-kah-choo-kwoo',
    17514: 'ee-DEE-nah-kah-choo-kwoo',
    17521: 'ee-FAH-nyee-choo-kwoo',
    17527: 'ee-FAY-choo-kwoo',
    17588: 'EE-kay-choo-kwoo',
    17647: 'EE-woo-choo-kwoo',
    17652: 'EE-zoo-choo-kwoo',
    17683: 'KAY-nay-choo-kwoo',
    17690: 'LOH-tah-choo-kwoo',
    17671: 'kahm-SEE-yoh-choo-kwoo',
    17673: 'kah-NAH-yoh-choo-kwoo',
    17677: 'kah-OH-soh-loo-choo-kwoo',
    17686: 'koh-SOH-loo-choo-kwoo',
    17910: 'm-MAH-see-choo-kwoo',
    17873: 'mah-KWO-choo-kwoo',
    18073: 'nay-TOH-choo-kwoo',
    18083: 'n-KAH-choo-kwoo',
    18169: 'n-WAH-choo-kwoo',
    18203: 'n-WAH-mah-choo-kwoo',
    18289: 'n-ZOO-bay-choo-kwoo'
};

async function optimize() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log(`Optimizing ${Object.keys(CHUKWU_OFFSETS).length} Chukwu names...`);

    for (const [id, hint] of Object.entries(CHUKWU_OFFSETS)) {
        await supabaseAdmin
            .from('names')
            .update({ phonetic_hint: hint })
            .eq('id', parseInt(id));
    }
    console.log('Done!');
}
optimize();
