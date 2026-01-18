import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    console.log("Found .env.local. Keys:");
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=/);
        if (match) {
            console.log(" - " + match[1].trim());
        }
    });
} else {
    console.log(".env.local NOT found");
}
