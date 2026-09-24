import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/boss-fight.svg');

const T = 30;
const W = 840;
const H = 440;
const FONT = `ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;

const C = {
  bg0: '#0a0e1a', bg1: '#141a33', panel: '#0d1117', panelEdge: '#30363d', panelHi: '#3d4454',
  text: '#e6edf3', dim: '#8b949e', green: '#3fb950', hp: '#9ece6a', yellow: '#e0af68',
  red: '#f7768e', blue: '#7aa2f7', cyan: '#7dcfff', purple: '#bb9af7', gold: '#f2c14e',
};

const css = [];
let uid = 0;
const pct = (t) => +((t / T) * 100).toFixed(3);

function keyframes(frames) {
  const name = `k${uid++}`;
  const sorted = [...frames].sort((a, b) => a[0] - b[0]);
  const out = [];
  if (sorted[0][0] > 0) out.push([0, sorted[0][1]]);
  out.push(...sorted);
  if (sorted.at(-1)[0] < T) out.push([T, sorted.at(-1)[1]]);
  const body = out
    .map(([t, decl, ease]) => `${pct(t)}%{${decl}${ease ? `;animation-timing-function:${ease}` : ''}}`)
    .join('');
  css.push(`@keyframes ${name}{${body}}`);
  return name;
}

function cls(frames, extra = '') {
  const k = keyframes(frames);
  css.push(`.${k}{animation:${k} ${T}s linear infinite;${extra}}`);
  return k;
}

function loopCls(body, dur, extra = '', delay = 0) {
  const name = `l${uid++}`;
  css.push(`@keyframes ${name}{${body}}`);
  css.push(`.${name}{animation:${name} ${dur}s ${delay ? `${-delay}s` : ''} infinite;${extra}}`);
  return name;
}

const FILL_BOX = 'transform-box:fill-box;transform-origin:center;';
const LEFT_BOX = 'transform-box:fill-box;transform-origin:left center;';

function visFrames(windows, fade = 0.15) {
  const f = [[0, 'opacity:0']];
  for (const [s, e] of windows) {
    const fi = Math.max(fade, 0.01);
    f.push([s, 'opacity:0'], [s + fi, 'opacity:1'], [e - fi, 'opacity:1'], [e, 'opacity:0']);
  }
  return f;
}
const vis = (windows, fade) => cls(visFrames(windows, fade));

let rngState = 7;
const rnd = () => ((rngState = (rngState * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---------- pixel sprites ----------

function sprite(rows, palette, scale) {
  const width = Math.max(...rows.map((r) => r.length));
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || !palette[ch]) { x++; continue; }
      let run = 1;
      while (row[x + run] === ch) run++;
      rects += `<rect x="${x * scale}" y="${y * scale}" width="${run * scale}" height="${scale}" fill="${palette[ch]}"/>`;
      x += run;
    }
  });
  return { svg: rects, w: width * scale, h: rows.length * scale };
}

const HERO = sprite([
  '......KKKKK.........',
  '.....KHHHHHKK...bB..',
  '....KHHhHHHHHK..bB..',
  '...KHHHHhHHHHHK.bB..',
  '...KHHHHHHHHHHK.bB..',
  '..KHHHHHSSSSSSK.bB..',
  '..KHHHHSSSSKSSK.bB..',
  '..KHHHSSSSSKSSK.bB..',
  '...KHHSSSSSSSSK.bB..',
  '...KHHsSSSSSSK..bB..',
  '....KKssSSSSKK..bB..',
  '...KgGGKKKKGGK.YYYY.',
  '..KgGGGGGGLGGGK.dd..',
  '..KgGGGGGGGLGGKSSSK.',
  '..KgGGGGGGGGGGGSSSK.',
  '..KgGGGGGGGGGGKKKK..',
  '..KggGGGGGGGGGK.....',
  '...KggggggggggK.....',
  '...KDDDDKKDDDDK.....',
  '...KDDDK..KDDDK.....',
  '...KDDDK..KDDDK.....',
  '..KWWWWK..KWWWWK....',
  '..KwwwwK..KwwwwK....',
  '...KKKK....KKKK.....',
], {
  K: '#0b0f17', H: '#2d2433', h: '#4a3b52', S: '#f1c27d', s: '#d39a5e',
  G: '#2ea043', g: '#1a7f37', L: '#56d364', D: '#30363d', W: '#e6edf3', w: '#8b949e',
  B: '#79c0ff', b: '#d6ecff', Y: '#e3b341', d: '#6e4b2a',
}, 5);

const SLIME = sprite([
  '..........KKKK..........',
  '........KKPPPPKK........',
  '......KKPPPLLPPPKK......',
  '.....KPPPPLWLPPPPPK.....',
  '....KPPPPPPLPPPPPPPK....',
  '...KPPPPPPPPPPPPPPPPK...',
  '...KPPKKKKPPPPKKKKPPK...',
  '..KPPPEEEEPPPPEEEEPPPK..',
  '..KPPPEeeEPPPPEeeEPPPK..',
  '..KPPPPPPPPPPPPPPPPPPK..',
  '.KPPPPPPPPMMMMPPPPPPPPK.',
  '.KPPPPPPPPPPPPPPPPPPPPK.',
  '.KpPPPPPPPPPPPPPPPPPPpK.',
  'KppPPPPPPPPPPPPPPPPPPppK',
  'KpppPPPPPPPPPPPPPPPPpppK',
  'KppppppppppppppppppppppK',
  '.KpppKppppKKppppKppppK..',
  '..KKK.KKKK..KKKK.KKKK...',
], {
  K: '#1a1030', P: '#9d7cd8', p: '#6f52b5', L: '#c9b3f5', W: '#ffffff',
  E: '#f0e8ff', e: '#1a1030', M: '#3d2566',
}, 6);

const GOLEM = sprite([
  '......KKKKKKKKKK......',
  '......KllRRRRRrK......',
  '......KlRRRRRRrK......',
  '......KlOORROOrK......',
  '......KRRRRRRRrK......',
  '......KRKKKKKKrK......',
  '...KKKKKKKKKKKKKKKK...',
  '..KllRRRRRRRRRRRRrrK..',
  '.KlllKRRRMMRRRRKRrrrK.',
  'KllRRKRRRRRMRRRKRRrrrK',
  'KlRCRKRRRRRRRRRKRRCrrK',
  'KlRRCKRRRRRRRRRKRCRrrK',
  'KRRRRKRRRRRRRRRKRRRrrK',
  'KRMRRKRRRRRRRRRKRRMrrK',
  'KRRRRKRRRRRRRRRKRRRrrK',
  '.KKKKKrRRRRRRRrKKKKKK.',
  '.....KrrRRRRRrrK......',
  '.....KKKKKKKKKKK......',
  '.....KlRRrKKlRRrK.....',
  '.....KlRRrK.KlRRrK....',
  '.....KRRRrK.KRRRrK....',
  '....KlRRRrK.KlRRRrK...',
  '....KKKKKKK.KKKKKKK...',
], {
  K: '#0d1117', R: '#6e7681', r: '#484f58', l: '#9ea7b3', O: '#ff9e3b',
  M: '#4c8a3f', C: '#1f242c',
}, 6);

function ghostRows() {
  const left = [
    '.........KKKK',
    '......KKKRRRR',
    '.....KRRRRRRR',
    '....KRRRRRRRR',
    '...KRRRRRRRRR',
    '..KRRRRRRRRRR',
    '..KRRRRRRRRRR',
    '.KRRKKRRRRRRR',
    '.KRRRRKKRRRRR',
    '.KRRREEERRRRR',
    '.KRRREeERRRRR',
    '.KRRRRRRRRRRR',
    'KRRRRRRRRRKKK',
    'KRRRRRRRRKWKW',
    'KRRRRRRRRRKKK',
    'KrRRRRRRRRRRR',
    'KrrRRRRRRRRRR',
    'KrrrRRRRRRRRR',
    'KrrrrRRRRRRRR',
    'KrrrrrrRRRRRR',
    'KrrrrrrrrrRRR',
    'KrrrKrrrrKrrr',
    '.KrK.KrrK.Krr',
    '..K...KK...KK',
  ];
  const swap = { R: 'B', r: 'b' };
  return left.map((row, y) => {
    const right = [...row].reverse().map((c) => swap[c] || c).join('');
    const full = [...(row + right)];
    const seam = y % 2 === 0 ? 12 : 13;
    if (y > 0 && y < 21 && 'RBrb'.includes(full[seam])) full[seam] = 'Z';
    return full.join('');
  });
}

const GHOST = sprite(ghostRows(), {
  K: '#1a0f14', R: '#f7768e', r: '#c0495f', B: '#7aa2f7', b: '#4d6fc4',
  Z: '#ffd866', E: '#ffffff', e: '#1a0f14', W: '#ffffff',
}, 6);

// ---------- layout ----------

const HERO_POS = { x: 200, y: 322 };
const BOSS_POS = { x: 620, y: 200 };
const heroTL = { x: HERO_POS.x - HERO.w / 2, y: HERO_POS.y - HERO.h };
const DIALOG = { x: 16, y: 340, w: 808, h: 84 };

// ---------- timeline ----------

const BOSSES = [
  {
    name: 'SLOW QUERY', lv: 42, tag: 'SQL', tagColor: C.purple, spr: SLIME,
    appear: 0.3, hit: 4.35, drain: [[4.35, 5.0, 1, 0]], defeat: 5.3, gone: 6.1, infoEnd: 6.35,
  },
  {
    name: 'LEGACY MODULE', lv: 67, tag: 'LEGACY', tagColor: C.yellow, spr: GOLEM,
    appear: 6.5, hit: 10.3, drain: [[10.3, 10.95, 1, 0]], defeat: 11.2, gone: 12.0, infoEnd: 12.85,
  },
  {
    name: 'MERGE CONFLICT', lv: 99, tag: 'BOSS', tagColor: C.red, spr: GHOST,
    appear: 13.0, hit: 17.5, drain: [[17.5, 18.15, 1, 0.18], [21.85, 22.3, 0.18, 0]],
    defeat: 22.25, gone: 23.1, infoEnd: 23.3,
  },
];

const MOVES = [
  { name: 'ORACLE QUERY STORM', type: 'ORACLE SQL', mp: 20, color: C.red },
  { name: 'REFACTOR SLASH', type: 'C# / .NET', mp: 18, color: C.purple },
  { name: 'REACT RENDER BEAM', type: 'REACT / TS', mp: 17, color: C.cyan },
  { name: 'CODE REVIEW ★', type: 'LEADERSHIP', mp: 20, color: C.gold },
];

const MENUS = [
  { open: 2.0, close: 3.65, path: [[2.0, 0]], confirm: 3.15 },
  { open: 8.2, close: 9.8, path: [[8.2, 0], [8.8, 1]], confirm: 9.3 },
  { open: 14.9, close: 16.7, path: [[14.9, 1], [15.4, 0], [15.9, 2]], confirm: 16.2 },
  { open: 19.65, close: 20.9, path: [[19.65, 2], [20.1, 3]], confirm: 20.4 },
];

const MESSAGES = [
  [0.45, 1.95, 'A wild SLOW QUERY appeared!'],
  [3.7, 5.05, 'MUSTAFA used ORACLE QUERY STORM!'],
  [5.1, 6.45, 'SLOW QUERY got indexed: 40s → 12ms!'],
  [6.6, 8.15, 'LEGACY MODULE (est. 2009) appeared!'],
  [9.85, 11.15, 'MUSTAFA used REFACTOR SLASH!'],
  [11.2, 12.9, 'LEGACY MODULE was refactored. Tests: green.'],
  [13.1, 14.85, 'Final boss! MERGE CONFLICT blocks the release!'],
  [16.75, 18.2, 'MUSTAFA used REACT RENDER BEAM!'],
  [18.25, 19.6, "It's not enough... the diff keeps growing!"],
  [20.95, 22.35, 'MUSTAFA used CODE REVIEW!'],
  [22.4, 23.6, 'MERGE CONFLICT was resolved & merged!'],
];

const HITS = [
  { t: 4.35, amp: 5, dmg: '-4096', x: 620, y: 110 },
  { t: 10.3, amp: 6, dmg: '-9001', x: 620, y: 80 },
  { t: 17.5, amp: 6, dmg: '-6100', x: 620, y: 80 },
  { t: 21.85, amp: 11, dmg: '-99999', x: 620, y: 70, crit: true },
];

const VICTORY = 23.7;
const FADE_OUT = 29.4;

// ---------- background ----------

function background() {
  let s = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bg0}"/><stop offset="0.62" stop-color="${C.bg1}"/><stop offset="1" stop-color="#0c1022"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2140"/><stop offset="1" stop-color="#0b0e1c"/></linearGradient>
<radialGradient id="plat" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#2c355e"/><stop offset="0.75" stop-color="#1c2344"/><stop offset="1" stop-color="#141a33"/></radialGradient>
<radialGradient id="glowG" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.gold}" stop-opacity="0.55"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
<radialGradient id="vign" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0.2"/><stop offset="0.3" stop-color="${C.cyan}"/><stop offset="1" stop-color="#e0f7ff"/></linearGradient>
<linearGradient id="hpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;
  s += `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;

  const tw = [
    loopCls('0%,100%{opacity:.25}50%{opacity:1}', 2.6),
    loopCls('0%,100%{opacity:.9}50%{opacity:.2}', 3.4),
    loopCls('0%,100%{opacity:.5}30%{opacity:1}70%{opacity:.15}', 4.2),
  ];
  for (let i = 0; i < 38; i++) {
    const x = Math.round(rnd() * W);
    const y = Math.round(rnd() * 150);
    const z = rnd() > 0.85 ? 3 : 2;
    s += `<rect class="${tw[i % 3]}" x="${x}" y="${y}" width="${z}" height="${z}" fill="#c0caf5"/>`;
  }

  const led = [
    loopCls('0%,49%{opacity:1}50%,100%{opacity:.15}', 1.3),
    loopCls('0%,70%{opacity:.2}71%,100%{opacity:1}', 2.1),
    loopCls('0%,30%{opacity:1}31%,60%{opacity:.2}61%,100%{opacity:1}', 1.7),
  ];
  const ledColors = [C.green, C.cyan, C.blue, C.yellow];
  let x = 0;
  while (x < W) {
    const w = 34 + Math.round(rnd() * 40);
    const h = 60 + Math.round(rnd() * 110);
    const top = 250 - h;
    s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="#121833"/>`;
    s += `<rect x="${x}" y="${top}" width="${w}" height="2" fill="#1f2750"/>`;
    for (let ry = top + 10; ry < 244; ry += 12) {
      s += `<rect x="${x + 5}" y="${ry}" width="${w - 10}" height="6" fill="#161d3c"/>`;
      if (rnd() > 0.35) {
        s += `<rect class="${led[Math.floor(rnd() * 3)]}" x="${x + w - 11}" y="${ry + 2}" width="3" height="2" fill="${ledColors[Math.floor(rnd() * 4)]}"/>`;
      }
    }
    x += w + 4 + Math.round(rnd() * 10);
  }

  s += `<rect x="0" y="250" width="${W}" height="${H - 250}" fill="url(#floor)"/>`;
  s += `<rect x="0" y="249" width="${W}" height="2" fill="${C.blue}" opacity="0.35"/>`;
  let grid = '';
  const vp = { x: W / 2, y: 250 };
  for (let i = -14; i <= 14; i++) {
    grid += `<line x1="${vp.x + i * 12}" y1="${vp.y}" x2="${vp.x + i * 95}" y2="${H}"/>`;
  }
  for (let k = 0; k < 9; k++) {
    const y = 250 + Math.pow(k / 8, 2) * 190;
    grid += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}"/>`;
  }
  s += `<g stroke="${C.blue}" stroke-opacity="0.09" stroke-width="1">${grid}</g>`;

  s += platform(BOSS_POS.x, BOSS_POS.y - 2, 118, 20);
  s += platform(HERO_POS.x, HERO_POS.y - 2, 104, 18);
  return s;
}

function platform(cx, cy, rx, ry) {
  return `<ellipse cx="${cx}" cy="${cy + 5}" rx="${rx}" ry="${ry}" fill="#070913" opacity="0.6"/>`
    + `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#plat)" stroke="#3b4675" stroke-width="1.5"/>`
    + `<ellipse cx="${cx}" cy="${cy - 2}" rx="${rx * 0.72}" ry="${ry * 0.55}" fill="none" stroke="#7aa2f7" stroke-opacity="0.18"/>`;
}

// ---------- panels ----------

function panel(x, y, w, h, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.panel}" fill-opacity="0.92" stroke="${C.panelEdge}" stroke-width="2" ${extra}/>`
    + `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="7" fill="none" stroke="${C.panelHi}" stroke-opacity="0.35"/>`;
}

function hpColorAt(v) {
  return v > 0.5 ? C.hp : v > 0.2 ? C.yellow : C.red;
}

function enemyInfo() {
  const x = 24, y = 24, w = 300, h = 76;
  let s = '';
  const infoWin = BOSSES.map((b) => [b.appear, b.infoEnd]);
  const box = vis([[BOSSES[0].appear, BOSSES[2].infoEnd]], 0.25);
  s += `<g class="${box}">` + panel(x, y, w, h);

  for (const b of BOSSES) {
    const c = vis([[b.appear, b.infoEnd]], 0.12);
    const tagW = b.tag.length * 8 + 14;
    s += `<g class="${c}">`
      + `<text x="${x + 18}" y="${y + 30}" class="t b" font-size="17" fill="${C.text}">${b.name}</text>`
      + `<text x="${x + w - 18}" y="${y + 30}" class="t b" font-size="14" fill="${C.dim}" text-anchor="end">Lv${b.lv}</text>`
      + `<rect x="${x + 18}" y="${y + 43}" width="${tagW}" height="18" rx="4" fill="${b.tagColor}" fill-opacity="0.18" stroke="${b.tagColor}" stroke-opacity="0.7"/>`
      + `<text x="${x + 18 + tagW / 2}" y="${y + 56}" class="t b" font-size="11" fill="${b.tagColor}" text-anchor="middle">${b.tag}</text>`
      + `</g>`;
  }

  const barX = x + 110, barY = y + 47, barW = 168, barH = 10;
  s += `<text x="${barX - 8}" y="${barY + 9}" class="t b" font-size="11" fill="${C.yellow}" text-anchor="end">HP</text>`;
  s += `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="5" fill="#21262d" stroke="#0b0f17"/>`;

  const f = [[0, `transform:scaleX(0);fill:${C.hp}`]];
  for (const b of BOSSES) {
    f.push([b.appear, `transform:scaleX(0);fill:${C.hp}`, 'ease-out']);
    f.push([b.appear + 0.55, `transform:scaleX(1);fill:${C.hp}`]);
    for (const [s0, s1, v0, v1] of b.drain) {
      f.push([s0, `transform:scaleX(${v0});fill:${hpColorAt(v0)}`, 'cubic-bezier(.2,.7,.3,1)']);
      const mid = (v0 + v1) / 2;
      f.push([s0 + (s1 - s0) * 0.5, `transform:scaleX(${mid});fill:${hpColorAt(mid)}`, 'cubic-bezier(.2,.7,.3,1)']);
      f.push([s1, `transform:scaleX(${v1});fill:${hpColorAt(v1 + 0.001)}`]);
    }
  }
  const hpCls = cls(f, LEFT_BOX);
  s += `<rect class="${hpCls}" x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="5"/>`;
  s += `<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="5" fill="url(#hpg)"/>`;
  s += `</g>`;
  return s;
}

function playerInfo() {
  const x = 520, y = 232, w = 300, h = 88;
  let s = panel(x, y, w, h);
  s += `<text x="${x + 18}" y="${y + 28}" class="t b" font-size="17" fill="${C.text}">MUSTAFA</text>`;
  s += `<text x="${x + w - 18}" y="${y + 28}" class="t b" font-size="14" fill="${C.dim}" text-anchor="end">Lv99</text>`;
  s += `<text x="${x + 18}" y="${y + 45}" class="t" font-size="10.5" fill="${C.green}" letter-spacing="1">TEAM LEAD · ERP ARCHITECT</text>`;

  const barX = x + 46, barW = 236, barH = 9;
  s += `<text x="${x + 18}" y="${y + 63}" class="t b" font-size="11" fill="${C.yellow}">HP</text>`;
  s += `<rect x="${barX}" y="${y + 55}" width="${barW}" height="${barH}" rx="4.5" fill="${C.hp}" stroke="#0b0f17"/>`;
  s += `<rect x="${barX}" y="${y + 55}" width="${barW}" height="${barH}" rx="4.5" fill="url(#hpg)"/>`;

  s += `<text x="${x + 18}" y="${y + 79}" class="t b" font-size="11" fill="${C.cyan}">MP</text>`;
  s += `<rect x="${barX}" y="${y + 71}" width="${barW}" height="${barH}" rx="4.5" fill="#21262d" stroke="#0b0f17"/>`;
  const mpSteps = [[3.8, 1, 0.8], [9.9, 0.8, 0.62], [16.85, 0.62, 0.45], [21.0, 0.45, 0.25]];
  const f = [[0, 'transform:scaleX(1)']];
  for (const [t, a, b] of mpSteps) {
    f.push([t, `transform:scaleX(${a})`, 'ease-out'], [t + 0.5, `transform:scaleX(${b})`]);
  }
  f.push([FADE_OUT + 0.3, 'transform:scaleX(0.25)'], [FADE_OUT + 0.35, 'transform:scaleX(1)']);
  const mp = cls(f, LEFT_BOX);
  s += `<rect class="${mp}" x="${barX}" y="${y + 71}" width="${barW}" height="${barH}" rx="4.5" fill="${C.blue}"/>`;
  s += `<rect x="${barX}" y="${y + 71}" width="${barW}" height="${barH}" rx="4.5" fill="url(#hpg)"/>`;
  return s;
}

// ---------- dialog ----------

function dialog() {
  let s = panel(DIALOG.x, DIALOG.y, DIALOG.w, DIALOG.h);
  const fs = 19;
  const cw = fs * 0.62;

  const arrowWins = [];
  MESSAGES.forEach(([a, b, text]) => {
    const chars = [...text].length;
    const typeDur = Math.min(0.9, chars * 0.028);
    const width = Math.ceil(chars * cw + 16);
    const clipId = `c${uid++}`;
    const slide = cls([
      [a, `transform:translateX(${-width}px)`, `steps(${chars},end)`],
      [a + typeDur, 'transform:translateX(0)'],
    ]);
    const v = vis([[a, b]], 0.08);
    s += `<clipPath id="${clipId}"><rect class="${slide}" x="0" y="-24" width="${width}" height="34"/></clipPath>`;
    s += `<g class="${v}" transform="translate(${DIALOG.x + 26} ${DIALOG.y + 49})"><text clip-path="url(#${clipId})" class="t b" font-size="${fs}" fill="${C.text}">${esc(text)}</text></g>`;
    arrowWins.push([a + typeDur + 0.15, b]);
  });
  const av = vis(arrowWins, 0.05);
  const bounce = loopCls('0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}', 0.7);
  s += `<g class="${av}"><g class="${bounce}"><path d="M ${DIALOG.x + DIALOG.w - 34} ${DIALOG.y + 56} l 12 0 l -6 8 z" fill="${C.text}"/></g></g>`;

  s += menu();
  return s;
}

function menu() {
  const colX = [DIALOG.x + 46, DIALOG.x + 300];
  const rowY = [DIALOG.y + 34, DIALOG.y + 66];
  const posOf = (i) => ({ x: colX[i % 2], y: rowY[Math.floor(i / 2)] });
  const divX = DIALOG.x + 560;

  const menuVis = vis(MENUS.map((m) => [m.open, m.close]), 0.1);
  let s = `<g class="${menuVis}">`;

  const curFrames = [];
  const hlFrames = [[0, 'opacity:0']];
  const infoWins = MOVES.map(() => []);
  MENUS.forEach((m) => {
    m.path.forEach(([t, idx], k) => {
      const p = posOf(idx);
      curFrames.push([t, `transform:translate(${p.x}px,${p.y}px)`, 'step-end']);
      const end = k + 1 < m.path.length ? m.path[k + 1][0] : m.close;
      infoWins[idx].push([t, end]);
    });
    hlFrames.push([m.open, 'opacity:0'], [m.open + 0.05, 'opacity:1']);
    for (let i = 0; i < 3; i++) {
      const t0 = m.confirm + i * 0.14;
      hlFrames.push([t0, 'opacity:1'], [t0 + 0.01, 'opacity:0.15'], [t0 + 0.07, 'opacity:0.15'], [t0 + 0.08, 'opacity:1']);
    }
    hlFrames.push([m.close - 0.02, 'opacity:1'], [m.close, 'opacity:0']);
  });
  const cur = cls(curFrames);
  const hl = cls(hlFrames);
  const nudge = loopCls('0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}', 0.6);

  s += `<g class="${cur}"><g class="${hl}"><rect x="-26" y="-20" width="236" height="28" rx="6" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.18"/></g>`
    + `<g class="${nudge}"><path d="M -18 -12 l 9 6 l -9 6 z" fill="${C.text}"/></g></g>`;

  MOVES.forEach((mv, i) => {
    const p = posOf(i);
    s += `<text x="${p.x}" y="${p.y}" class="t b" font-size="15.5" fill="${i === 3 ? C.gold : C.text}">${esc(mv.name)}</text>`;
  });

  s += `<line x1="${divX}" y1="${DIALOG.y + 14}" x2="${divX}" y2="${DIALOG.y + DIALOG.h - 14}" stroke="${C.panelEdge}" stroke-width="2"/>`;
  MOVES.forEach((mv, i) => {
    const v = vis(infoWins[i], 0.01);
    s += `<g class="${v}">`
      + `<text x="${divX + 22}" y="${DIALOG.y + 34}" class="t b" font-size="13" fill="${C.dim}">MP COST <tspan fill="${C.text}">${mv.mp}</tspan></text>`
      + `<text x="${divX + 22}" y="${DIALOG.y + 64}" class="t b" font-size="13" fill="${C.dim}">TYPE/<tspan fill="${mv.color}" dx="6">${esc(mv.type)}</tspan></text>`
      + `</g>`;
  });
  s += `</g>`;
  return s;
}

// ---------- actors ----------

function hero() {
  const f = [
    [0, 'transform:translate(0px,0px)'],
    [3.8, 'transform:translate(0px,0px)', 'ease-out'], [3.95, 'transform:translate(22px,-4px)', 'ease-in'], [4.2, 'transform:translate(0px,0px)'],
    [9.95, 'transform:translate(0px,0px)', 'cubic-bezier(.6,0,.9,.4)'], [10.22, 'transform:translate(318px,-104px)'],
    [10.75, 'transform:translate(318px,-104px)', 'cubic-bezier(.2,.6,.3,1)'], [11.15, 'transform:translate(0px,0px)'],
    [16.8, 'transform:translate(0px,0px)', 'ease-out'], [16.95, 'transform:translate(16px,-3px)', 'ease-in'], [17.25, 'transform:translate(0px,0px)'],
    [21.05, 'transform:translate(0px,0px)', 'ease-out'], [21.35, 'transform:translate(0px,-14px)'],
    [21.75, 'transform:translate(0px,-14px)', 'ease-in'], [21.95, 'transform:translate(0px,0px)'],
  ];
  const move = cls(f);
  const bob = loopCls('0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}', 1.1, 'animation-timing-function:steps(2,jump-none);');

  const aura = cls([
    [21.05, 'opacity:0;transform:scale(0.4)', 'ease-out'], [21.35, 'opacity:1;transform:scale(1)'],
    [21.8, 'opacity:1;transform:scale(1.1)', 'ease-in'], [22.0, 'opacity:0;transform:scale(1.6)'],
  ], FILL_BOX);

  return `<ellipse cx="${HERO_POS.x}" cy="${HERO_POS.y - 1}" rx="40" ry="7" fill="#05070f" opacity="0.55"/>`
    + `<g class="${move}"><circle class="${aura}" cx="${HERO_POS.x}" cy="${HERO_POS.y - HERO.h / 2}" r="80" fill="url(#glowG)"/>`
    + `<g transform="translate(${heroTL.x} ${heroTL.y})"><g class="${bob}" shape-rendering="crispEdges">${HERO.svg}</g></g></g>`;
}

function boss(b, i) {
  const tl = { x: BOSS_POS.x - b.spr.w / 2, y: BOSS_POS.y - b.spr.h };
  const f = [
    [0, 'opacity:0;transform:translate(40px,0px)'],
    [b.appear, 'opacity:0;transform:translate(40px,0px)', 'cubic-bezier(.2,.8,.3,1)'],
    [b.appear + 0.5, 'opacity:1;transform:translate(0px,0px)'],
  ];
  let t = b.defeat;
  for (let k = 0; k < 6; k++) {
    f.push([t, 'opacity:1;transform:translate(0px,0px)'], [t + 0.01, 'opacity:0.15;transform:translate(0px,0px)'],
      [t + 0.06, 'opacity:0.15;transform:translate(0px,0px)'], [t + 0.07, 'opacity:1;transform:translate(0px,0px)']);
    t += 0.1;
  }
  f.push([t, 'opacity:1;transform:translate(0px,0px)', 'ease-in'], [b.gone, 'opacity:0;transform:translate(0px,18px)']);
  const life = cls(f);

  const hits = HITS.filter((h) => h.t > b.appear && h.t < b.gone);
  const ff = [[0, 'filter:none']];
  for (const h of hits) {
    for (let k = 0; k < 2; k++) {
      const s0 = h.t + k * 0.16;
      ff.push([s0, 'filter:none'], [s0 + 0.01, 'filter:brightness(3.2) saturate(0)'], [s0 + 0.08, 'filter:brightness(3.2) saturate(0)'], [s0 + 0.09, 'filter:none']);
    }
  }
  const flash = cls(ff);

  const idle = i === 0
    ? loopCls('0%,100%{transform:scale(1,1)}50%{transform:scale(1.04,.94)}', 1.4, 'transform-box:fill-box;transform-origin:50% 100%;animation-timing-function:ease-in-out;')
    : i === 1
      ? loopCls('0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}', 1.8, 'animation-timing-function:steps(2,jump-none);')
      : loopCls('0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}', 2.2, 'animation-timing-function:ease-in-out;');

  let extra = '';
  if (i === 0) {
    const zz = loopCls('0%{opacity:0;transform:translate(0,0)}20%{opacity:1}100%{opacity:0;transform:translate(14px,-26px)}', 2.0);
    extra += `<text x="${b.spr.w - 10}" y="18" class="t b ${zz}" font-size="16" fill="${C.purple}">z</text>`;
    extra += `<text x="${b.spr.w + 2}" y="6" class="t b ${zz}" style="animation-delay:-1s" font-size="12" fill="${C.purple}">z</text>`;
    extra += `<text x="${b.spr.w / 2}" y="${b.spr.h - 26}" class="t b" font-size="11" fill="#2a1a4a" text-anchor="middle" opacity="0.8">SELECT *</text>`;
  }
  if (i === 1) {
    extra += `<text x="${b.spr.w / 2}" y="${b.spr.h - 64}" class="t b" font-size="10" fill="#2d333b" text-anchor="middle">v1.0</text>`;
  }
  if (i === 2) {
    const fl = loopCls('0%,100%{transform:translateY(0);opacity:.85}50%{transform:translateY(-6px);opacity:1}', 2.4, 'animation-timing-function:ease-in-out;');
    extra += `<text x="-78" y="30" class="t b ${fl}" font-size="13" fill="${C.red}">&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</text>`;
    extra += `<text x="${b.spr.w - 6}" y="${b.spr.h - 28}" class="t b ${fl}" style="animation-delay:-1.2s" font-size="13" fill="${C.blue}">&gt;&gt;&gt;&gt;&gt;&gt;&gt; main</text>`;
    extra += `<text x="${b.spr.w + 4}" y="46" class="t b ${fl}" style="animation-delay:-.6s" font-size="13" fill="${C.yellow}">=======</text>`;
  }

  const shadow = `<ellipse cx="${BOSS_POS.x}" cy="${BOSS_POS.y}" rx="${b.spr.w * 0.38}" ry="8" fill="#05070f" opacity="0.55"/>`;
  return `<g class="${life}">${shadow}<g transform="translate(${tl.x} ${tl.y})"><g class="${flash}"><g class="${idle}"><g shape-rendering="crispEdges">${b.spr.svg}</g>${extra}</g></g></g></g>`;
}

// ---------- effects ----------

function fxQueryStorm() {
  let s = '';
  const start = 4.0;
  for (let i = 0; i < 9; i++) {
    const x = 560 + ((i * 37) % 130);
    const land = 120 + ((i * 23) % 60);
    const t0 = start + i * 0.055;
    const fall = cls([
      [0, 'opacity:0;transform:translateY(0px)'],
      [t0, 'opacity:0;transform:translateY(0px)', 'cubic-bezier(.5,0,1,.6)'],
      [t0 + 0.02, 'opacity:1;transform:translateY(8px)', 'cubic-bezier(.5,0,1,.6)'],
      [t0 + 0.32, `opacity:1;transform:translateY(${land + 30}px)`],
      [t0 + 0.42, `opacity:0;transform:translateY(${land + 30}px)`],
    ]);
    const col = i % 3 === 0 ? '#ffb86b' : C.red;
    s += `<g class="${fall}"><rect x="${x - 1.5}" y="-64" width="3" height="40" fill="${col}" opacity="0.35"/><rect x="${x - 6}" y="-30" width="12" height="12" fill="${col}"/><rect x="${x - 6}" y="-30" width="12" height="3" fill="#fff" opacity="0.5"/></g>`;
    const burst = cls([
      [t0 + 0.3, 'opacity:0;transform:scale(0.2)', 'ease-out'], [t0 + 0.34, 'opacity:1;transform:scale(0.7)'],
      [t0 + 0.55, 'opacity:0;transform:scale(1.4)'],
    ], FILL_BOX);
    s += `<circle class="${burst}" cx="${x}" cy="${land}" r="16" fill="none" stroke="${col}" stroke-width="3"/>`;
  }
  return s;
}

function fxSlash() {
  const arcs = [
    { d: 'M 548 52 Q 610 110 700 196', t: 10.22 },
    { d: 'M 700 60 Q 630 120 546 190', t: 10.34 },
  ];
  let s = '';
  for (const a of arcs) {
    const draw = cls([
      [a.t, 'stroke-dashoffset:300;opacity:1', 'cubic-bezier(.2,.8,.3,1)'], [a.t + 0.14, 'stroke-dashoffset:0;opacity:1'],
      [a.t + 0.3, 'stroke-dashoffset:0;opacity:1'], [a.t + 0.55, 'stroke-dashoffset:0;opacity:0'],
    ]);
    const v = vis([[a.t - 0.01, a.t + 0.6]], 0.01);
    s += `<g class="${v}"><path class="${draw}" d="${a.d}" fill="none" stroke="${C.purple}" stroke-opacity="0.45" stroke-width="18" stroke-linecap="round" stroke-dasharray="300"/>`
      + `<path class="${draw}" d="${a.d}" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-dasharray="300"/></g>`;
  }
  return s;
}

function fxReactBeam() {
  const origin = { x: heroTL.x + 90, y: heroTL.y + 40 };
  const target = { x: BOSS_POS.x, y: BOSS_POS.y - 80 };
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

  const atomVis = cls([
    [16.85, 'opacity:0;transform:scale(0.2)', 'cubic-bezier(.2,.8,.3,1)'], [17.1, 'opacity:1;transform:scale(1)'],
    [17.55, 'opacity:1;transform:scale(1)'], [17.8, 'opacity:0;transform:scale(1.3)'],
  ], FILL_BOX);
  const spin = loopCls('to{transform:rotate(360deg)}', 0.9, 'transform-box:fill-box;transform-origin:center;animation-timing-function:linear;');
  const atom = `<g transform="translate(${origin.x} ${origin.y})"><g class="${atomVis}"><g class="${spin}">`
    + [0, 60, 120].map((r) => `<ellipse cx="0" cy="0" rx="22" ry="8" fill="none" stroke="${C.cyan}" stroke-width="2.2" transform="rotate(${r})"/>`).join('')
    + `<circle r="4" fill="${C.cyan}"/></g></g></g>`;

  const grow = cls([
    [17.25, 'opacity:0;transform:scale(0,1)', 'cubic-bezier(.3,.8,.3,1)'], [17.28, 'opacity:1;transform:scale(0.05,1)', 'cubic-bezier(.3,.8,.3,1)'],
    [17.5, 'opacity:1;transform:scale(1,1)'], [17.75, 'opacity:1;transform:scale(1,0.8)', 'ease-in'], [18.0, 'opacity:0;transform:scale(1,0.1)'],
  ], LEFT_BOX);
  const beam = `<g transform="translate(${origin.x} ${origin.y}) rotate(${ang.toFixed(2)})"><g class="${grow}">`
    + `<rect x="0" y="-13" width="${len.toFixed(1)}" height="26" rx="13" fill="${C.cyan}" opacity="0.22"/>`
    + `<rect x="0" y="-6" width="${len.toFixed(1)}" height="12" rx="6" fill="url(#beam)"/>`
    + `<rect x="0" y="-2" width="${len.toFixed(1)}" height="4" rx="2" fill="#ffffff"/></g></g>`;

  const burst = cls([[17.48, 'opacity:0;transform:scale(0.3)', 'ease-out'], [17.52, 'opacity:1;transform:scale(0.8)'], [17.85, 'opacity:0;transform:scale(1.6)']], FILL_BOX);
  return atom + beam + `<circle class="${burst}" cx="${target.x}" cy="${target.y}" r="28" fill="none" stroke="${C.cyan}" stroke-width="4"/>`;
}

function fxCodeReview() {
  const cx = BOSS_POS.x, cy = BOSS_POS.y - 76;
  const dim = cls([[21.05, 'opacity:0'], [21.35, 'opacity:0.62'], [22.2, 'opacity:0.62'], [22.5, 'opacity:0']]);

  const raysVis = cls([[21.3, 'opacity:0;transform:scale(0.4)', 'ease-out'], [21.7, 'opacity:0.9;transform:scale(1)'], [22.3, 'opacity:0.9;transform:scale(1.05)'], [22.7, 'opacity:0;transform:scale(1.2)']], FILL_BOX);
  const raysSpin = loopCls('to{transform:rotate(360deg)}', 9, 'transform-box:fill-box;transform-origin:center;animation-timing-function:linear;');
  let rays = '';
  for (let i = 0; i < 16; i++) {
    rays += `<path d="M 0 0 L -9 -210 L 9 -210 Z" fill="${C.gold}" opacity="${i % 2 ? 0.25 : 0.45}" transform="rotate(${i * 22.5})"/>`;
  }
  rays = `<g transform="translate(${cx} ${cy})"><g class="${raysVis}"><g class="${raysSpin}">${rays}</g></g></g>`;

  const stamp = cls([
    [21.65, 'opacity:0;transform:scale(2.6)', 'cubic-bezier(.5,0,.9,.5)'], [21.85, 'opacity:1;transform:scale(1)'],
    [21.92, 'opacity:1;transform:scale(1.06)', 'ease-out'], [22.0, 'opacity:1;transform:scale(1)'],
    [22.6, 'opacity:1;transform:scale(1)', 'ease-in'], [22.95, 'opacity:0;transform:scale(1)'],
  ], FILL_BOX);
  const stampG = `<g transform="translate(${cx} ${cy}) rotate(-10)"><g class="${stamp}">`
    + `<rect x="-118" y="-32" width="236" height="64" rx="10" fill="#0d1117" fill-opacity="0.75" stroke="${C.green}" stroke-width="5"/>`
    + `<rect x="-110" y="-24" width="220" height="48" rx="6" fill="none" stroke="${C.green}" stroke-opacity="0.5" stroke-width="1.5"/>`
    + `<path d="M -92 0 l 10 10 l 18 -20" fill="none" stroke="${C.green}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<text x="16" y="10" class="t b" font-size="28" fill="${C.green}" text-anchor="middle" letter-spacing="3">APPROVED</text></g></g>`;

  const ring = cls([[21.1, 'opacity:0;transform:scale(0.2)', 'ease-out'], [21.2, 'opacity:1;transform:scale(0.4)'], [21.7, 'opacity:0;transform:scale(2.4)']], FILL_BOX);
  const ringG = `<circle class="${ring}" cx="${HERO_POS.x}" cy="${HERO_POS.y - 60}" r="60" fill="none" stroke="${C.gold}" stroke-width="4"/>`;

  return { dim: `<rect class="${dim}" width="${W}" height="${H}" fill="#05060d"/>`, fx: rays + ringG + stampG };
}

function damageNumbers() {
  let s = '';
  for (const h of HITS) {
    const pop = cls([
      [h.t, 'opacity:0;transform:translateY(10px) scale(0.5)', 'cubic-bezier(.2,1.6,.4,1)'],
      [h.t + 0.18, 'opacity:1;transform:translateY(0px) scale(1)'],
      [h.t + 0.75, 'opacity:1;transform:translateY(-12px) scale(1)', 'ease-in'],
      [h.t + 1.05, 'opacity:0;transform:translateY(-22px) scale(1)'],
    ], FILL_BOX);
    const fill = h.crit ? C.gold : '#ffffff';
    s += `<g class="${pop}">`;
    if (h.crit) s += `<text x="${h.x}" y="${h.y - 30}" class="t b dmg" font-size="15" fill="${C.red}" text-anchor="middle" letter-spacing="2">CRITICAL HIT!</text>`;
    s += `<text x="${h.x}" y="${h.y}" class="t b dmg" font-size="${h.crit ? 38 : 30}" fill="${fill}" text-anchor="middle">${h.dmg}</text></g>`;
  }
  return s;
}

function shakeClass() {
  const f = [[0, 'transform:translate(0px,0px)']];
  for (const h of HITS) {
    const a = h.amp;
    const seq = [[-a, a * 0.5], [a * 0.8, -a * 0.4], [-a * 0.6, a * 0.3], [a * 0.35, -a * 0.2], [0, 0]];
    f.push([h.t, 'transform:translate(0px,0px)']);
    seq.forEach(([x, y], k) => f.push([h.t + (k + 1) * 0.045, `transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`]));
  }
  return cls(f);
}

function whiteFlash() {
  const f = cls([[21.84, 'opacity:0'], [21.87, 'opacity:0.9'], [22.2, 'opacity:0']]);
  const red = cls([[13.0, 'opacity:0'], [13.15, 'opacity:0.35'], [13.45, 'opacity:0'], [13.6, 'opacity:0.3'], [13.95, 'opacity:0']]);
  return `<rect class="${red}" width="${W}" height="${H}" fill="${C.red}" style="mix-blend-mode:screen"/>`
    + `<rect class="${f}" width="${W}" height="${H}" fill="#ffffff"/>`;
}

// ---------- victory ----------

function victory() {
  const dim = cls([[VICTORY, 'opacity:0'], [VICTORY + 0.35, 'opacity:0.84'], [T, 'opacity:0.84']]);
  const px = 170, py = 34, pw = 500, ph = 372;
  const panelIn = cls([
    [VICTORY + 0.1, 'opacity:0;transform:translateY(16px) scale(0.97)', 'cubic-bezier(.2,.8,.3,1)'],
    [VICTORY + 0.55, 'opacity:1;transform:translateY(0px) scale(1)'],
  ], FILL_BOX);

  let s = `<rect class="${dim}" width="${W}" height="${H}" fill="#060812"/>`;
  s += `<g class="${panelIn}">` + panel(px, py, pw, ph);

  const shimmer = loopCls('0%,100%{opacity:.55}50%{opacity:1}', 1.6, 'animation-timing-function:ease-in-out;');
  s += `<text x="${W / 2}" y="${py + 62}" class="t b ${shimmer}" font-size="44" fill="${C.gold}" text-anchor="middle" letter-spacing="10" opacity="0.35" style="filter:blur(6px)">VICTORY</text>`;
  s += `<text x="${W / 2}" y="${py + 62}" class="t b" font-size="44" fill="${C.gold}" text-anchor="middle" letter-spacing="10">VICTORY</text>`;
  s += `<text x="${W / 2}" y="${py + 90}" class="t" font-size="13" fill="${C.dim}" text-anchor="middle" letter-spacing="1.5">3/3 BUGS CLEARED  ·  0 DAMAGE TAKEN  ·  SHIPPED ON TIME</text>`;
  s += `<line x1="${px + 34}" y1="${py + 108}" x2="${px + pw - 34}" y2="${py + 108}" stroke="${C.panelEdge}" stroke-width="2"/>`;

  const lvl = cls([[VICTORY + 0.7, 'opacity:0;transform:scale(0.6)', 'cubic-bezier(.2,1.6,.4,1)'], [VICTORY + 0.95, 'opacity:1;transform:scale(1)']], FILL_BOX);
  s += `<g class="${lvl}"><rect x="${px + 34}" y="${py + 124}" width="106" height="26" rx="6" fill="${C.green}" fill-opacity="0.16" stroke="${C.green}"/>`
    + `<text x="${px + 87}" y="${py + 142}" class="t b" font-size="13" fill="${C.green}" text-anchor="middle" letter-spacing="1.5">LEVEL UP!</text>`
    + `<text x="${px + 156}" y="${py + 143}" class="t b" font-size="16" fill="${C.text}">MUSTAFA <tspan fill="${C.dim}">Lv98 →</tspan> <tspan fill="${C.gold}">Lv99</tspan></text></g>`;

  s += `<text x="${px + 34}" y="${py + 182}" class="t b" font-size="11" fill="${C.dim}" letter-spacing="2.5">SKILL TREE</text>`;
  const skills = [
    ['VIENNA ADVANTAGE ERP', 0.97, C.green],
    ['C# / .NET', 0.9, C.purple],
    ['ORACLE SQL', 0.92, C.red],
    ['REACT / TYPESCRIPT', 0.82, C.cyan],
    ['CODE REVIEW & ARCH', 1.0, C.gold],
    ['IIS / POWERSHELL', 0.8, C.blue],
  ];
  const barX = px + 250, barW = 216;
  skills.forEach(([label, v, col], i) => {
    const y = py + 198 + i * 24;
    const t0 = VICTORY + 1.0 + i * 0.16;
    const rowIn = cls([[t0, 'opacity:0;transform:translateX(-8px)', 'ease-out'], [t0 + 0.25, 'opacity:1;transform:translateX(0px)']]);
    const fill = cls([[t0 + 0.1, 'transform:scaleX(0)', 'cubic-bezier(.2,.8,.3,1)'], [t0 + 0.9, `transform:scaleX(${v})`]], LEFT_BOX);
    s += `<g class="${rowIn}"><text x="${px + 34}" y="${y + 9}" class="t b" font-size="13" fill="${C.text}">${esc(label)}</text>`
      + `<rect x="${barX}" y="${y}" width="${barW}" height="10" rx="5" fill="#21262d"/>`
      + `<rect class="${fill}" x="${barX}" y="${y}" width="${barW}" height="10" rx="5" fill="${col}"/>`
      + `<rect x="${barX}" y="${y}" width="${barW}" height="10" rx="5" fill="url(#hpg)"/></g>`;
  });

  const blink = loopCls('0%,60%{opacity:1}61%,100%{opacity:0}', 1.0);
  const footIn = cls([[VICTORY + 2.3, 'opacity:0'], [VICTORY + 2.6, 'opacity:1']]);
  s += `<g class="${footIn}"><text x="${W / 2}" y="${py + ph - 14}" class="t b ${blink}" font-size="12" fill="${C.dim}" text-anchor="middle" letter-spacing="2.5">▶ NEXT SPRINT LOADING</text></g>`;
  s += `</g>`;
  return s;
}

function esc(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- assemble ----------

const shake = shakeClass();
const cr = fxCodeReview();
const blackIn = cls([[0, 'opacity:1'], [0.45, 'opacity:0'], [FADE_OUT, 'opacity:0'], [T, 'opacity:1']]);

const body = [
  `<g class="${shake}">`,
  background(),
  hero(),
  ...BOSSES.map(boss),
  cr.dim,
  fxQueryStorm(),
  fxSlash(),
  fxReactBeam(),
  cr.fx,
  damageNumbers(),
  enemyInfo(),
  playerInfo(),
  dialog(),
  `</g>`,
  whiteFlash(),
  victory(),
  `<rect width="${W}" height="${H}" fill="url(#vign)" pointer-events="none"/>`,
  `<rect class="${blackIn}" width="${W}" height="${H}" fill="#000"/>`,
].join('\n');

const style = `.t{font-family:${FONT}}.b{font-weight:700}.dmg{paint-order:stroke;stroke:#0b0f17;stroke-width:5px;stroke-linejoin:round}
${css.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation-delay:-27s!important;animation-play-state:paused!important}}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Animated RPG battle: Mustafa, a dev team lead, defeats Slow Query, Legacy Module and Merge Conflict using Oracle SQL, C#/.NET, React and Code Review.">
<title>Boss Fight: Production</title>
<style>${style}</style>
${body}
</svg>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(`wrote ${OUT} (${(svg.length / 1024).toFixed(1)} KB)`);
