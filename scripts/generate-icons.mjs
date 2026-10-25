// Generates PWA icons from an inline SVG. Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const BG = "#2f4f8f";
const FG = "#fdfcf9";

// Simple Coptic-style cross on a rounded tile. `pad` shrinks the mark for maskable icons.
const svg = (size, { rounded = true, pad = 0.18 } = {}) => {
  const r = rounded ? size * 0.22 : 0;
  const s = size * (1 - pad * 2);
  const o = size * pad;
  const c = o + s / 2;
  const arm = s * 0.36; // arm length from centre to end
  const bar = s * 0.22;
  const ball = bar * 0.42;
  const ends = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]
    .map(([dx, dy]) => {
      const ex = c + dx * arm;
      const ey = c + dy * arm;
      // Three balls at each arm end (trefoil), spread perpendicular to the arm.
      const px = dy !== 0 ? 1 : 0;
      const py = dx !== 0 ? 1 : 0;
      return [
        [ex + dx * ball * 0.9, ey + dy * ball * 0.9],
        [ex + px * bar * 0.62, ey + py * bar * 0.62],
        [ex - px * bar * 0.62, ey - py * bar * 0.62],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${ball}"/>`)
        .join("");
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${BG}"/>
  <g fill="${FG}">
    <rect x="${c - bar / 2}" y="${c - arm}" width="${bar}" height="${arm * 2}"/>
    <rect x="${c - arm}" y="${c - bar / 2}" width="${arm * 2}" height="${bar}"/>
    ${ends}
  </g>
</svg>`;
};

mkdirSync("public/icons", { recursive: true });
const out = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-512.png", 512, { rounded: false, pad: 0.28 }],
  ["apple-touch-icon.png", 180, { rounded: false }],
];
for (const [name, size, opts] of out) {
  await sharp(Buffer.from(svg(size, opts))).png().toFile(`public/icons/${name}`);
}
await sharp(Buffer.from(svg(48))).resize(32, 32).png().toFile("app/icon.png");
console.log("icons written");
