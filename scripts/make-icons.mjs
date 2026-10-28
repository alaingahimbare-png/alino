// Génère les icônes de l'app web (PWA) et les sources pour Android / iOS à partir de assets/logo.svg.
// Usage : node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = "assets/logo.svg";
mkdirSync("public/icons", { recursive: true });

const out = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/apple-touch-icon.png", 180],
  ["assets/icon-only.png", 1024],
];
for (const [file, size] of out) {
  await sharp(svg).resize(size, size).png().toFile(file);
}

// Icône « maskable » : le dessin tient dans la zone sûre (80 %) sur fond bleu
const inner = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#1d4ed8" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("public/icons/icon-maskable-512.png");

// Écran de démarrage : logo centré sur fond bleu
const splashLogo = await sharp(svg).resize(640, 640).png().toBuffer();
await sharp({ create: { width: 2732, height: 2732, channels: 4, background: "#1d4ed8" } })
  .composite([{ input: splashLogo, gravity: "center" }])
  .png()
  .toFile("assets/splash.png");

console.log("icônes générées");
