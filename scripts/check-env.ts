
import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('Has DATABASE_URL:', !!process.env.DATABASE_URL);
