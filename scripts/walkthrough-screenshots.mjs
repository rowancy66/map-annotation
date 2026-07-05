import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('tmp/walkthrough');
await fs.mkdir(outputDir, { recursive: true });

const pages = [
  { name: 'login', url: 'http://127.0.0.1:3002/auth/login' },
  { name: 'admin', url: 'http://127.0.0.1:3002/admin' },
  { name: 'home', url: 'http://127.0.0.1:3002/' },
  { name: 'public-map', url: 'http://127.0.0.1:3002/map/a21deeab-7f1d-48fb-9715-a6b6cc8e7108' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

for (const entry of pages) {
  await page.goto(entry.url, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: path.join(outputDir, `${entry.name}.png`),
    fullPage: true,
  });
}

await browser.close();
console.log(outputDir);
