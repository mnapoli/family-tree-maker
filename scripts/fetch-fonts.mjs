import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = resolve(__dirname, "../src/fonts");

// Upstream Cormorant repo ships static-weight TTFs (Google Fonts only has the
// variable font, which resvg doesn't interpolate reliably).
const BASE = "https://github.com/CatharsisFonts/Cormorant/raw/master/fonts/ttf";
const FONTS = [
  { name: "CormorantGaramond-Regular.ttf", url: `${BASE}/CormorantGaramond-Regular.ttf` },
  { name: "CormorantGaramond-Bold.ttf", url: `${BASE}/CormorantGaramond-Bold.ttf` },
];

await mkdir(FONTS_DIR, { recursive: true });

for (const font of FONTS) {
  const dest = resolve(FONTS_DIR, font.name);
  process.stdout.write(`Fetching ${font.name}... `);
  const res = await fetch(font.url);
  if (!res.ok) {
    console.error(`failed (${res.status})`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`${buf.length} bytes`);
}
