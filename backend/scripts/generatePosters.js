/**
 * Generates the SVG poster artwork for the demo movies into client/public/posters.
 * The posters are committed to the repository, so this only needs to run when the
 * demo movie list changes:  npm run generate-posters
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import movies, { slugFor } from './data/movies.js';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'public', 'posters');
const W = 400;
const H = 600;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');

const motifs = {
  grid: (a) => {
    let lines = '';
    for (let i = 0; i <= 12; i += 1) {
      const x = (i / 12) * W;
      lines += `<line x1="${W / 2}" y1="300" x2="${x * 2 - W / 2}" y2="${H}" stroke="${a}" stroke-opacity=".45"/>`;
    }
    for (let j = 0; j < 8; j += 1) {
      const y = 300 + Math.pow(j / 7, 2) * 300;
      lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${a}" stroke-opacity=".35"/>`;
    }
    return `${lines}<circle cx="${W / 2}" cy="250" r="90" fill="url(#glow)"/>`;
  },
  rain: (a) => {
    let drops = '';
    for (let i = 0; i < 70; i += 1) {
      const x = (i * 53) % W;
      const y = (i * 97) % 520;
      drops += `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 28}" stroke="${a}" stroke-opacity=".35" stroke-width="1.5"/>`;
    }
    return `${drops}<path d="M0 470 Q100 430 200 470 T400 470 V600 H0Z" fill="${a}" fill-opacity=".15"/>`;
  },
  lamp: (a) =>
    `<rect x="190" y="120" width="8" height="330" fill="#000" fill-opacity=".6"/><circle cx="194" cy="120" r="22" fill="${a}"/><path d="M194 130 L80 460 H310 Z" fill="${a}" fill-opacity=".18"/>`,
  sun: (a) =>
    `<circle cx="${W / 2}" cy="230" r="120" fill="${a}" fill-opacity=".85"/>` +
    Array.from({ length: 16 }, (_, i) => {
      const t = (i / 16) * Math.PI * 2;
      return `<line x1="${200 + Math.cos(t) * 140}" y1="${230 + Math.sin(t) * 140}" x2="${200 + Math.cos(t) * 190}" y2="${230 + Math.sin(t) * 190}" stroke="${a}" stroke-width="6" stroke-linecap="round" stroke-opacity=".7"/>`;
    }).join(''),
  mountain: (a) =>
    `<circle cx="280" cy="170" r="60" fill="${a}" fill-opacity=".8"/><path d="M0 470 L120 260 L190 360 L260 220 L400 470 Z" fill="#000" fill-opacity=".55"/><path d="M240 250 L260 220 L282 255 Z" fill="${a}"/>`,
  wave: (a) =>
    Array.from({ length: 7 }, (_, i) => {
      const y = 200 + i * 38;
      return `<path d="M0 ${y} Q50 ${y - 30} 100 ${y} T200 ${y} T300 ${y} T400 ${y}" fill="none" stroke="${a}" stroke-width="2.5" stroke-opacity="${0.85 - i * 0.1}"/>`;
    }).join(''),
  bolt: (a) =>
    `<path d="M230 80 L140 300 H205 L160 480 L280 240 H215 L260 80 Z" fill="${a}"/><path d="M0 500 Q200 440 400 500 V600 H0Z" fill="#000" fill-opacity=".5"/>`,
  boat: (a) =>
    `<path d="M120 330 L200 210 L280 330 Z" fill="${a}"/><path d="M90 340 H310 L270 390 H130 Z" fill="${a}" fill-opacity=".85"/><path d="M0 410 Q100 380 200 410 T400 410 V600 H0Z" fill="#fff" fill-opacity=".18"/>`,
  moon: (a) =>
    `<circle cx="210" cy="220" r="110" fill="${a}"/><circle cx="250" cy="195" r="100" fill="url(#bg)"/>` +
    Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 71) % W}" cy="${(i * 43) % 450}" r="${(i % 3) * 0.6 + 0.6}" fill="#fff" fill-opacity=".7"/>`).join(''),
  orbit: (a) =>
    `<ellipse cx="200" cy="250" rx="170" ry="45" fill="none" stroke="${a}" stroke-width="3" transform="rotate(-18 200 250)"/><circle cx="200" cy="250" r="70" fill="#000"/><circle cx="200" cy="250" r="74" fill="none" stroke="${a}" stroke-opacity=".6" stroke-width="2"/>` +
    Array.from({ length: 50 }, (_, i) => `<circle cx="${(i * 89) % W}" cy="${(i * 61) % 470}" r="1" fill="#fff" fill-opacity=".8"/>`).join(''),
  stadium: (a) =>
    `<ellipse cx="200" cy="420" rx="230" ry="70" fill="${a}" fill-opacity=".2"/><rect x="185" y="240" width="8" height="140" fill="${a}"/><rect x="200" y="240" width="8" height="140" fill="${a}"/><rect x="215" y="240" width="8" height="140" fill="${a}"/><circle cx="300" cy="170" r="16" fill="#c0392b" stroke="${a}" stroke-width="2"/>`,
};

function wrapTitle(title) {
  const words = title.toUpperCase().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 12 && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  lines.push(line);
  return lines;
}

function poster(movie) {
  const { from, to, accent, motif } = movie.art;
  const lines = wrapTitle(movie.movieName);
  const size = lines.some((l) => l.length > 10) ? 42 : 52;
  const titleY = 470 - (lines.length - 1) * (size + 4);
  const title = lines
    .map((l, i) => `<text x="200" y="${titleY + i * (size + 4)}" text-anchor="middle" font-size="${size}" font-weight="800" letter-spacing="2" fill="#fff">${esc(l)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(movie.movieName)} poster">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${accent}" stop-opacity=".9"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${motifs[motif](accent)}
<rect width="${W}" height="${H}" fill="url(#fade)"/>
<g font-family="'Bebas Neue','Oswald','Arial Narrow',Arial,sans-serif">${title}</g>
<text x="200" y="${titleY - size - 6}" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="17" fill="${accent}">${esc(movie.tagline)}</text>
<text x="200" y="540" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" letter-spacing="3" fill="#fff" fill-opacity=".75">DIRECTED BY ${esc(movie.director.toUpperCase())}</text>
<text x="200" y="566" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" letter-spacing="2" fill="#fff" fill-opacity=".5">IMOVIES DEMO · FICTIONAL TITLE</text>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
for (const movie of movies) writeFileSync(join(outDir, `${slugFor(movie.movieName)}.svg`), poster(movie));
console.log(`Wrote ${movies.length} posters to ${outDir}`);
