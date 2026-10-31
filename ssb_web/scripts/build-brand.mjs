// Generates every brand asset (SVG + PNG + ICO) from code. No paid services.
// Usage: BRAND_FONT=/path/to/big-shoulders-display-latin-900-normal.woff node scripts/build-brand.mjs
// The font is Big Shoulders Display Black (SIL OFL), e.g. from @fontsource/big-shoulders-display.
// Letters are converted to outlines so the SVG wordmark renders without the font installed.
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public", "brand");
fs.mkdirSync(out, { recursive: true });
const fontPath = process.env.BRAND_FONT;
if (!fontPath) throw new Error("Set BRAND_FONT to a Big Shoulders Display 900 .woff/.ttf file");
const font = opentype.parse(fs.readFileSync(fontPath).buffer.slice(0));

const BLUE = "#4b7bf5", BRASS = "#f5a623", NAVY = "#0f1220", INK = "#e8eaf2", DARK_INK = "#12141f";

const textPath = (text, size, fill, x = 0, y = 0, tracking = 0) => {
  const p = font.getPath(text, x, y, size, { letterSpacing: tracking / size });
  return { d: p.toPathData(2), w: font.getAdvanceWidth(text, size, { letterSpacing: tracking / size }), fill };
};

// Mark: two stacked chevrons (rank-style), brass over white, on a brand-blue tile.
const chevrons = (c1, c2) => `<path d="M26 64 L64 34 L102 64" fill="none" stroke="${c1}" stroke-width="13" stroke-linejoin="miter" stroke-linecap="butt"/><path d="M26 94 L64 64 L102 94" fill="none" stroke="${c2}" stroke-width="13" stroke-linejoin="miter" stroke-linecap="butt"/>`;
const markSvg = (size = 128, tile = BLUE, rx = 28) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" role="img" aria-label="ReadyKadet"><rect width="128" height="128" rx="${rx}" fill="${tile}"/>${chevrons(BRASS, "#ffffff")}</svg>`;
const markMono = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="ReadyKadet">${chevrons(color, color)}</svg>`;

const word = (fill, size = 64) => {
  const t = textPath("READYKADET", size, fill, 0, size * 0.74, size * 0.04);
  const h = size * 0.86;
  return { w: Math.ceil(t.w), h, body: `<path d="${t.d}" fill="${fill}"/>` };
};
const wordmarkSvg = (fill) => {
  const t = word(fill);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.w}" height="${t.h}" viewBox="0 0 ${t.w} ${t.h}" role="img" aria-label="ReadyKadet">${t.body}</svg>`;
};
const lockupSvg = (fill) => {
  const t = word(fill, 64);
  const gap = 18, m = 72, w = m + gap + t.w, h = m;
  const y = (m - t.h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="ReadyKadet"><g transform="scale(${m / 128})">${markSvg(128).replace(/<svg[^>]*>|<\/svg>/g, "")}</g><g transform="translate(${m + gap} ${y})">${t.body}</g></svg>`;
};
const tileInner = (s) => markSvg(128).replace(/<svg[^>]*>|<\/svg>/g, "");

const files = {};
files["mark.svg"] = markSvg();
files["mark-mono-light.svg"] = markMono("#ffffff");
files["mark-mono-dark.svg"] = markMono(DARK_INK);
files["wordmark-on-dark.svg"] = wordmarkSvg(INK);
files["wordmark-on-light.svg"] = wordmarkSvg(DARK_INK);
files["logo-on-dark.svg"] = lockupSvg(INK);
files["logo-on-light.svg"] = lockupSvg(DARK_INK);
files["favicon.svg"] = markSvg(64, BLUE, 16);
// App icon: full-bleed square (stores round it themselves).
files["app-icon.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 128 128"><rect width="128" height="128" fill="${BLUE}"/>${chevrons(BRASS, "#ffffff")}</svg>`;
// Social avatar: round-safe, mark centred with padding on navy.
files["social-avatar.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 160 160"><rect width="160" height="160" fill="${NAVY}"/><g transform="translate(24 24)">${tileInner()}</g></svg>`;
{
  const t = word(INK, 150);
  const w = 1500, h = 500, mk = 220, gap = 40, tw = t.w, total = mk + gap + tw, x0 = (w - total) / 2;
  files["social-banner.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${NAVY}"/><rect y="${h - 8}" width="${w}" height="8" fill="${BRASS}"/><g transform="translate(${x0} ${(h - mk) / 2 - 20}) scale(${mk / 128})">${tileInner()}</g><g transform="translate(${x0 + mk + gap} ${(h - t.h) / 2 - 20})">${t.body}</g><text x="${w / 2}" y="${h - 60}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#9aa3bd">Timed SSB practice for NDA, CDS, AFCAT and CAPF aspirants</text></svg>`;
}
{
  const t = word("#ffffff", 56);
  const w = 600, h = 120;
  files["email-header.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${NAVY}"/><rect y="${h - 5}" width="${w}" height="5" fill="${BRASS}"/><g transform="translate(36 22) scale(${64 / 128})">${tileInner()}</g><g transform="translate(116 ${(h - 5 - t.h) / 2})">${t.body}</g></svg>`;
}
{
  const t = word(INK, 190);
  const w = 1200, h = 630, mk = 150;
  files["og-default.svg"] = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${NAVY}"/><rect y="${h - 12}" width="${w}" height="12" fill="${BRASS}"/><g transform="translate(80 90) scale(${mk / 128})">${tileInner()}</g><g transform="translate(80 300)">${t.body}</g><text x="84" y="520" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="#9aa3bd">Timed SSB practice with feedback on every attempt</text></svg>`;
}

for (const [name, svg] of Object.entries(files)) fs.writeFileSync(path.join(out, name), svg);

// Raster exports
const png = async (svg, size, file, opts = {}) => {
  let img = sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
  if (opts.flatten) img = img.flatten({ background: opts.flatten });
  await img.png().toFile(path.join(root, "public", file));
};
await png(files["favicon.svg"], 32, "favicon-32.png");
await png(files["favicon.svg"], 16, "favicon-16.png");
await png(files["app-icon.svg"], 180, "apple-touch-icon.png");
await png(files["app-icon.svg"], 192, "icon-192.png");
await png(files["app-icon.svg"], 512, "icon-512.png");
// Maskable: mark shrunk into the 80% safe zone on solid blue.
const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="${BLUE}"/><g transform="translate(19.2 19.2) scale(0.7)">${chevrons(BRASS, "#fff")}</g></svg>`;
await png(mask, 512, "icon-maskable-512.png");
await png(files["app-icon.svg"], 1024, "brand/app-icon-1024.png");
await png(files["social-avatar.svg"], 800, "brand/social-avatar.png");
await sharp(Buffer.from(files["social-banner.svg"])).png().toFile(path.join(out, "social-banner.png"));
await sharp(Buffer.from(files["email-header.svg"]), { density: 192 }).resize(1200, 240).png().toFile(path.join(out, "email-header.png"));
await sharp(Buffer.from(files["og-default.svg"])).png().toFile(path.join(root, "public", "og-default.png"));

// favicon.ico (PNG-in-ICO, 32x32 + 16x16) written to the app dir so Next serves /favicon.ico
const icoImgs = [await sharp(path.join(root, "public/favicon-32.png")).toBuffer(), await sharp(path.join(root, "public/favicon-16.png")).toBuffer()];
const sizes = [32, 16];
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icoImgs.length, 4);
let offset = 6 + 16 * icoImgs.length;
const dir = icoImgs.map((b, i) => { const e = Buffer.alloc(16); e[0] = sizes[i]; e[1] = sizes[i]; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(b.length, 8); e.writeUInt32LE(offset, 12); offset += b.length; return e; });
fs.writeFileSync(path.join(root, "src/app/favicon.ico"), Buffer.concat([header, ...dir, ...icoImgs]));
console.log("brand assets written");
