import fs from 'fs';
import path from 'path';

const sourceDir = 'c:/Users/Chukwuebuka Ihueze/Downloads/favicon_io';
const destDir = 'c:/Users/Chukwuebuka Ihueze/Desktop/AFRICAN NAMES PROJECT/app';

const mappings = [
    { src: 'favicon.ico', dest: 'favicon.ico' },
    { src: 'apple-touch-icon.png', dest: 'apple-icon.png' },
    { src: 'favicon-32x32.png', dest: 'icon.png' }
];

console.log(`Copying favicons from ${sourceDir} to ${destDir}...`);

mappings.forEach(({ src, dest }) => {
    try {
        const srcPath = path.join(sourceDir, src);
        const destPath = path.join(destDir, dest);
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${src} -> ${dest}`);
    } catch (err: any) {
        console.error(`❌ Failed to copy ${src}:`, err.message);
    }
});
