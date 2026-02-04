
import { validateLoginEmail } from './app/auth/actions';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testValidation(email: string) {
    console.log(`Testing validation for: ${email}`);
    const result = await validateLoginEmail(email);
    console.log('Result:', JSON.stringify(result, null, 2));
}

const email = 'ihuezeebuka@yahoo.com';
testValidation(email);
