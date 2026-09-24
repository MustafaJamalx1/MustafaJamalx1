import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/tower-defense.svg');

let T = 60;
const W = 840;
const H = 440;
const FONT = `ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;

const C = {
  bg: '#0a0e1a', panel: '#0d1117', panelEdge: '#30363d', panelHi: '#3d4454',
  text: '#e6edf3', dim: '#8b949e', green: '#3fb950', hp: '#9ece6a', yellow: '#e0af68',
  red: '#f7768e', blue: '#7aa2f7', cyan: '#7dcfff', purple: '#bb9af7', gold: '#f2c14e', orange: '#ff9e64',
};

// ---------- css helpers ----------

const css = [];
let uid = 0;
const pct = (t) => +((t / T) * 100).toFixed(3);
const r1 = (v) => +v.toFixed(1);

function cls(frames, extra = '') {
  const name = `k${uid++}`;
  const sorted = [...frames].sort((a, b) => a[0] - b[0]);
  const out = [];
  if (sorted[0][0] > 0) out.push([0, sorted[0][1]]);
  out.push(...sorted);
  if (sorted.at(-1)[0] < T) out.push([T, sorted.at(-1)[1]]);
  const body = out
    .map(([t, decl, ease]) => `${pct(Math.min(Math.max(t, 0), T))}%{${decl}${ease ? `;animation-timing-function:${ease}` : ''}}`)
    .join('');
  css.push(`@keyframes ${name}{${body}}.${name}{animation:${name} ${T}s linear infinite;${extra}}`);
  return name;
}

function loopCls(body, dur, extra = '', delay = 0) {
  const name = `l${uid++}`;
  css.push(`@keyframes ${name}{${body}}.${name}{animation:${name} ${dur}s ${delay ? `${-delay}s ` : ''}infinite;${extra}}`);
  return name;
}

const FILL_BOX = 'transform-box:fill-box;transform-origin:center;';
const LEFT_BOX = 'transform-box:fill-box;transform-origin:left center;';

function vis(windows, fade = 0.15) {
  const f = [[0, 'opacity:0']];
  for (const [s, e] of windows) {
    const fi = Math.max(fade, 0.01);
    f.push([s, 'opacity:0'], [s + fi, 'opacity:1'], [e - fi, 'opacity:1'], [e, 'opacity:0']);
  }
  return cls(f);
}

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let rngState = 11;
const rnd = () => ((rngState = (rngState * 1103515245 + 12345) % 2147483648) / 2147483648);

// ---------- map ----------

const PATH = [[-30, 120], [160, 120], [160, 330], [390, 330], [390, 140], [600, 140], [600, 320], [740, 320]];
const SEG = [];
let PATH_LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const [x0, y0] = PATH[i], [x1, y1] = PATH[i + 1];
  const len = Math.hypot(x1 - x0, y1 - y0);
  SEG.push({ x0, y0, x1, y1, len, start: PATH_LEN });
  PATH_LEN += len;
}
function posAt(d) {
  for (const s of SEG) {
    if (d <= s.start + s.len) {
      const k = (d - s.start) / s.len;
      return [s.x0 + (s.x1 - s.x0) * k, s.y0 + (s.y1 - s.y0) * k];
    }
  }
  return PATH.at(-1);
}
const CORNERS = SEG.slice(1).map((s) => s.start);

const CORE = { x: 780, y: 320 };

// ---------- towers & enemies ----------

const TOWERS = [
  { id: 'ps', name: 'POWERSHELL', color: C.blue, x: 70, y: 215, range: 125, cd: 0.6, dmg: 11, travel: 0.22, place: 0.7, kind: 'bolt' },
  { id: 'react', name: 'REACT', color: C.cyan, x: 275, y: 252, range: 125, cd: 0.24, dmg: 4, travel: 0.16, place: 1.2, kind: 'dot' },
  { id: 'oracle', name: 'ORACLE SQL', color: C.red, x: 275, y: 118, range: 145, cd: 1.1, dmg: 22, travel: 0.45, splash: 42, place: 1.7, kind: 'orb' },
  { id: 'net', name: 'C# / .NET', color: C.purple, x: 495, y: 252, range: 135, cd: 0.42, dmg: 17, travel: 0.04, place: 2.2, kind: 'beam' },
  { id: 'review', name: 'CODE REVIEW', color: C.gold, x: 690, y: 212, range: 122, cd: 0.5, dmg: 12, travel: 0.05, place: 2.7, kind: 'ray', aura: 0.55 },
];
const TW = Object.fromEntries(TOWERS.map((t) => [t.id, t]));

const TYPES = {
  bug: { hp: 45, speed: 195, sprite: 'bug' },
  race: { hp: 32, speed: 300, sprite: 'race' },
  leak: { hp: 95, speed: 124, sprite: 'leak' },
  n1: { hp: 70, speed: 170, sprite: 'n1' },
  boss: { hp: 900, speed: 208, sprite: 'boss', floor: 0.16 },
};

const WAVES = [
  { label: 'WAVE 1', sub: 'NULL REFERENCES INCOMING', banner: 3.5, color: C.blue,
    spawns: Array.from({ length: 7 }, (_, i) => ['bug', i * 0.6]) },
  { label: 'WAVE 2', sub: 'RACE CONDITIONS · MEMORY LEAKS · N+1 QUERIES', banner: 11, color: C.purple,
    spawns: [['race', 0], ['n1', 0.45], ['leak', 0.9], ['race', 1.35], ['n1', 1.8], ['race', 2.25], ['leak', 2.8], ['n1', 3.3], ['race', 3.8]] },
  { label: '⚠ BOSS WAVE', sub: 'PROD INCIDENT DETECTED', banner: 19, color: C.red, boss: true,
    spawns: [['race', 0], ['bug', 0.4], ['bug', 0.8], ['boss', 1.1]] },
];
const SPAWN_DELAY = 0.9;
const WAVE_GAP = 0.6;

const ULT_TRIGGER_D = SEG[5].start + 120;
const ULT_CHARGE = 0.75;
let VICTORY;
let FADE_OUT;

// ---------- simulation ----------

let enemies, shots, deaths, ult, projectiles;
const DT = 0.005;

function simulate() {
enemies = [];
WAVES.forEach((w, wi) => w.spawns.forEach(([type, rel]) => {
  const ty = TYPES[type];
  enemies.push({ id: enemies.length, wave: wi, type, ...ty, maxHp: ty.hp, spawn: w.banner + SPAWN_DELAY + rel / 1.3, d: 0, alive: false, done: false, pending: 0, bps: [], slowed: false, hits: [] });
}));
shots = [];
deaths = [];
ult = null;
projectiles = [];

for (const tw of TOWERS) tw.readyAt = 4.2;

for (let step = 0; step * DT <= 90; step++) {
  const t = step * DT;

  for (const e of enemies) {
    if (!e.alive && !e.done && t >= e.spawn) {
      e.alive = true;
      e.bps.push([t, ...posAt(0)]);
    }
  }

  for (const e of enemies) {
    if (!e.alive) continue;
    const [px, py] = posAt(e.d);
    const inAura = Math.hypot(px - TW.review.x, py - TW.review.y) <= TW.review.range;
    if (inAura !== e.slowed) {
      e.bps.push([t, px, py]);
      e.slowed = inAura;
    }
    const v = e.speed * (e.slowed ? TW.review.aura : 1);
    const nd = e.d + v * DT;
    for (const c of CORNERS) {
      if (e.d < c && nd >= c) e.bps.push([t + (c - e.d) / v, ...posAt(c)]);
    }
    e.d = nd;
    if (e.d >= PATH_LEN) throw new Error(`enemy ${e.id} (${e.type}) reached production at t=${t.toFixed(2)}`);
  }

  for (const p of projectiles) {
    if (p.done || p.tHit > t) continue;
    p.done = true;
    const target = enemies[p.target];
    const victims = [];
    if (p.splash) {
      const [tx, ty] = posAt(target.d);
      for (const e of enemies) {
        if (e.alive && Math.hypot(posAt(e.d)[0] - tx, posAt(e.d)[1] - ty) <= p.splash) victims.push(e);
      }
    } else if (target.alive) victims.push(target);
    target.pending -= p.dmg;
    for (const e of victims) {
      let dmg = p.ult ? e.hp : p.dmg;
      if (e.floor && !p.ult) dmg = Math.min(dmg, Math.max(0, e.hp - e.floor * e.maxHp));
      e.hp -= dmg;
      e.hits.push([t, Math.max(e.hp, 0) / e.maxHp]);
      if (e.hp <= 0.0001) {
        e.alive = false;
        e.done = true;
        const [x, y] = posAt(e.d);
        e.bps.push([t, x, y]);
        e.death = t;
        deaths.push({ t, x, y, tower: p.tower, enemy: e });
      }
    }
  }

  const boss = enemies.find((e) => e.type === 'boss');
  if (boss.alive && !ult && boss.d >= ULT_TRIGGER_D) {
    ult = { t0: t, tHit: t + ULT_CHARGE };
    projectiles.push({ tower: 'review', target: boss.id, tHit: ult.tHit, dmg: 0, ult: true });
  }

  for (const tw of TOWERS) {
    if (t < tw.readyAt) continue;
    if (tw.id === 'review' && ult && t < ult.tHit + 0.3) continue;
    let best = null;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (!e.floor && e.hp - e.pending <= 0) continue;
      const [x, y] = posAt(e.d);
      if (x < 0) continue;
      if (Math.hypot(x - tw.x, y - tw.y) > tw.range) continue;
      if (!best || e.d > best.d) best = e;
    }
    if (!best) continue;
    tw.readyAt = t + tw.cd;
    best.pending += tw.dmg;
    const p = { tower: tw.id, target: best.id, tFire: t, tHit: t + tw.travel, dmg: tw.dmg, splash: tw.splash };
    projectiles.push(p);
    shots.push(p);
  }
  if (enemies.every((e) => e.done)) break;
}

for (const e of enemies) {
  if (!e.done) throw new Error(`enemy ${e.id} never died`);
}
}

for (let iter = 0; iter < 8; iter++) {
  simulate();
  let changed = false;
  for (let i = 1; i < WAVES.length; i++) {
    const want = Math.max(...enemies.filter((e) => e.wave === i - 1).map((e) => e.death)) + WAVE_GAP;
    if (Math.abs(WAVES[i].banner - want) > 0.001) {
      WAVES[i].banner = want;
      changed = true;
    }
  }
  if (!changed) break;
}

VICTORY = Math.max(...enemies.map((e) => e.death)) + 1.5;
FADE_OUT = VICTORY + 5.2;
T = FADE_OUT + 0.6;
WAVES.forEach((w, i) => { w.hud = [w.banner, i + 1 < WAVES.length ? WAVES[i + 1].banner : VICTORY - 0.2]; });

function enemyPosAt(e, t) {
  const b = e.bps;
  if (t <= b[0][0]) return [b[0][1], b[0][2]];
  for (let i = 1; i < b.length; i++) {
    if (t <= b[i][0]) {
      const k = (t - b[i - 1][0]) / (b[i][0] - b[i - 1][0] || 1);
      return [b[i - 1][1] + (b[i][1] - b[i - 1][1]) * k, b[i - 1][2] + (b[i][2] - b[i - 1][2]) * k];
    }
  }
  return [b.at(-1)[1], b.at(-1)[2]];
}

const kills = Object.fromEntries(TOWERS.map((t) => [t.id, 0]));
deaths.forEach((d) => kills[d.tower]++);

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
  const w = width * scale, h = rows.length * scale;
  return { svg: `<g transform="translate(${-w / 2} ${-h / 2})" shape-rendering="crispEdges">${rects}</g>`, w, h };
}

const BEETLE = [
  '....KKKK...K.',
  '..KKrRRRK.K..',
  '.KrRRRRRRKK..',
  'KrRLRRRRRKWK.',
  'KrRRRRRRRKKKK',
  'KrRRRLRRRKK..',
  '.KrRRRRRRK...',
  '..KKKKKKK....',
  '..K.K.K.K....',
];
const SPRITES = {
  bug: sprite(BEETLE, { K: '#1a0f14', R: C.red, r: '#c0495f', L: '#ffc2cd', W: '#ffffff' }, 3),
  race: sprite(BEETLE, { K: '#1f1706', R: C.yellow, r: '#b8863b', L: '#fff1c9', W: '#ffffff' }, 3),
  leak: sprite([
    '....KK....',
    '...KBBK...',
    '..KBBBBK..',
    '.KBBLBBBK.',
    'KBBLBBBBBK',
    'KBBBBBBBBK',
    'KBBWKBWKBK',
    'KbBBBBBBbK',
    '.KbbbbbbK.',
    '..KKKKKK..',
  ], { K: '#0b1230', B: C.blue, b: '#4d6fc4', L: '#c7d7ff', W: '#ffffff' }, 3),
  n1: sprite([
    '...KKKK...',
    '.KKPPPPKK.',
    'KPPLPPPPPK',
    'KPPWKPWKPK',
    'KPPPPPPPPK',
    'KpPPPPPPpK',
    '.KKpKKpKK.',
  ], { K: '#1a1030', P: C.purple, p: '#7d5fc2', L: '#e6dcff', W: '#ffffff' }, 3),
  boss: sprite(BEETLE, { K: '#1a0708', R: '#ff5d5d', r: '#b22f3a', L: '#ffd0b0', W: '#fff4c2' }, 6),
};

// ---------- scene pieces ----------

function background() {
  let s = `<defs>
<pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><rect x="9" y="9" width="2" height="2" fill="#1c2340"/></pattern>
<radialGradient id="coreGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C.green}" stop-opacity="0.45"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></radialGradient>
<radialGradient id="auraG" cx="0.5" cy="0.5" r="0.5"><stop offset="0.7" stop-color="${C.gold}" stop-opacity="0"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0.07"/></radialGradient>
<radialGradient id="vign" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;
  s += `<rect width="${W}" height="${H}" fill="${C.bg}"/><rect width="${W}" height="${H}" fill="url(#dots)"/>`;

  let traces = '';
  for (let i = 0; i < 14; i++) {
    const x = Math.round(rnd() * W / 20) * 20, y = 60 + Math.round(rnd() * 18) * 20;
    const l1 = 40 + Math.round(rnd() * 4) * 20, l2 = 20 + Math.round(rnd() * 3) * 20;
    const dir = rnd() > 0.5 ? l2 : -l2;
    traces += `<path d="M ${x} ${y} h ${l1} v ${dir}" fill="none"/><circle cx="${x}" cy="${y}" r="2.5" fill="#1a2242"/><circle cx="${x + l1}" cy="${y + dir}" r="2.5" fill="#1a2242"/>`;
  }
  s += `<g stroke="#161d38" stroke-width="2">${traces}</g>`;

  const d = 'M ' + PATH.map(([x, y]) => `${x} ${y}`).join(' L ');
  s += `<path d="${d}" fill="none" stroke="#05070f" stroke-opacity="0.6" stroke-width="44" stroke-linejoin="round" transform="translate(0 4)"/>`;
  s += `<path d="${d}" fill="none" stroke="#28305a" stroke-width="40" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="none" stroke="#121833" stroke-width="32" stroke-linejoin="round"/>`;
  const flow = loopCls('to{stroke-dashoffset:-36}', 1.2, 'animation-timing-function:linear;');
  s += `<path class="${flow}" d="${d}" fill="none" stroke="${C.blue}" stroke-opacity="0.28" stroke-width="2" stroke-dasharray="10 26"/>`;

  s += `<text x="12" y="92" class="t b" font-size="10" fill="${C.dim}" letter-spacing="2">CLIENT ▸</text>`;
  return s;
}

function core() {
  const x = CORE.x - 32, y = CORE.y - 58, w = 64, h = 108;
  const pulse = loopCls('0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}', 2.4, FILL_BOX + 'animation-timing-function:ease-in-out;');
  const alarmStart = ult ? ult.t0 - 1.6 : 30;
  const alarmEnd = ult ? ult.tHit + 0.1 : 31;
  const af = [[0, 'opacity:0']];
  for (let t = alarmStart; t < alarmEnd - 0.2; t += 0.5) af.push([t, 'opacity:0'], [t + 0.2, 'opacity:1'], [t + 0.45, 'opacity:0']);
  const alarm = cls(af);

  let leds = '';
  const blink = [
    loopCls('0%,49%{opacity:1}50%,100%{opacity:.2}', 0.9),
    loopCls('0%,70%{opacity:.2}71%,100%{opacity:1}', 1.4),
    loopCls('0%,30%{opacity:1}31%,60%{opacity:.25}61%,100%{opacity:1}', 1.1),
  ];
  for (let i = 0; i < 6; i++) {
    const ry = y + 34 + i * 11;
    leds += `<rect x="${x + 9}" y="${ry}" width="${w - 18}" height="7" rx="1.5" fill="#161d3c"/>`;
    leds += `<rect class="${blink[i % 3]}" x="${x + w - 17}" y="${ry + 2}" width="4" height="3" fill="${C.green}"/>`;
    leds += `<rect class="${blink[(i + 1) % 3]}" x="${x + w - 24}" y="${ry + 2}" width="4" height="3" fill="${C.cyan}"/>`;
  }
  return `<circle class="${pulse}" cx="${CORE.x}" cy="${CORE.y - 4}" r="70" fill="url(#coreGlow)"/>`
    + `<ellipse cx="${CORE.x}" cy="${y + h + 4}" rx="40" ry="7" fill="#05070f" opacity="0.6"/>`
    + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#10152b" stroke="${C.green}" stroke-width="2"/>`
    + `<rect class="${alarm}" x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="10" fill="none" stroke="${C.red}" stroke-width="4"/>`
    + `<rect x="${x + 6}" y="${y + 8}" width="${w - 12}" height="18" rx="4" fill="${C.green}" fill-opacity="0.15"/>`
    + `<text x="${CORE.x}" y="${y + 21}" class="t b" font-size="10" fill="${C.green}" text-anchor="middle" letter-spacing="1">VA ERP</text>`
    + leds
    + `<text x="${CORE.x}" y="${y - 10}" class="t b" font-size="10" fill="${C.green}" text-anchor="middle" letter-spacing="2">PRODUCTION</text>`;
}

function towerIcon(tw) {
  const c = tw.color;
  switch (tw.id) {
    case 'react':
      return [0, 60, 120].map((r) => `<ellipse rx="9" ry="3.6" fill="none" stroke="${c}" stroke-width="1.6" transform="rotate(${r})"/>`).join('') + `<circle r="2.2" fill="${c}"/>`;
    case 'ps':
      return `<path d="M -7 -5 l 6 5 l -6 5" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="3.5" width="7" height="2.4" rx="1" fill="${c}"/>`;
    case 'net':
      return `<text y="4.5" class="t b" font-size="12.5" fill="${c}" text-anchor="middle">C#</text>`;
    case 'oracle':
      return `<ellipse cy="-5" rx="7.5" ry="2.8" fill="${c}"/><path d="M -7.5 -5 v 10 a 7.5 2.8 0 0 0 15 0 v -10" fill="none" stroke="${c}" stroke-width="2"/><path d="M -7.5 0 a 7.5 2.8 0 0 0 15 0" fill="none" stroke="${c}" stroke-width="1.4"/>`;
    case 'review':
      return `<path d="M -10 0 Q 0 -9 10 0 Q 0 9 -10 0 Z" fill="none" stroke="${c}" stroke-width="2"/><circle r="3.4" fill="${c}"/>`;
  }
  return '';
}

function towers() {
  let under = '', over = '';
  for (const tw of TOWERS) {
    const drop = cls([
      [tw.place, 'opacity:0;transform:translateY(-34px)', 'cubic-bezier(.3,1.5,.5,1)'],
      [tw.place + 0.38, 'opacity:1;transform:translateY(0px)'],
    ]);
    const ring = cls([
      [tw.place + 0.3, 'opacity:0;transform:scale(0.3)', 'cubic-bezier(.2,.8,.3,1)'],
      [tw.place + 0.4, 'opacity:0.7;transform:scale(0.5)', 'cubic-bezier(.2,.8,.3,1)'],
      [tw.place + 1.1, 'opacity:0;transform:scale(1)'],
    ], FILL_BOX);
    under += `<circle class="${ring}" cx="${tw.x}" cy="${tw.y}" r="${tw.range}" fill="${tw.color}" fill-opacity="0.06" stroke="${tw.color}" stroke-width="2"/>`;

    if (tw.aura) {
      const auraIn = cls([[tw.place + 0.5, 'opacity:0'], [tw.place + 1.2, 'opacity:1']]);
      const breathe = loopCls('0%,100%{transform:scale(0.97)}50%{transform:scale(1.02)}', 2.2, FILL_BOX + 'animation-timing-function:ease-in-out;');
      under += `<g class="${auraIn}"><circle class="${breathe}" cx="${tw.x}" cy="${tw.y}" r="${tw.range}" fill="url(#auraG)" stroke="${C.gold}" stroke-opacity="0.22" stroke-dasharray="4 8"/></g>`;
    }

    const myShots = shots.filter((s) => s.tower === tw.id);
    const rot = [[0, 'transform:rotate(-90deg)']];
    const flash = [[0, 'opacity:0']];
    let ang = -90;
    for (const s of myShots) {
      const [ex, ey] = enemyPosAt(enemies[s.target], s.tFire);
      let a = (Math.atan2(ey - tw.y, ex - tw.x) * 180) / Math.PI;
      while (a - ang > 180) a -= 360;
      while (a - ang < -180) a += 360;
      rot.push([s.tFire - 0.07, `transform:rotate(${r1(ang)}deg)`, 'ease-out'], [s.tFire, `transform:rotate(${r1(a)}deg)`]);
      ang = a;
      flash.push([s.tFire, 'opacity:0'], [s.tFire + 0.01, 'opacity:1'], [s.tFire + 0.08, 'opacity:0']);
    }
    if (tw.id === 'review' && ult) {
      const boss = enemies.find((e) => e.type === 'boss');
      const [bx, by] = enemyPosAt(boss, ult.t0);
      let a = (Math.atan2(by - tw.y, bx - tw.x) * 180) / Math.PI;
      while (a - ang > 180) a -= 360;
      while (a - ang < -180) a += 360;
      rot.push([ult.t0, `transform:rotate(${r1(ang)}deg)`, 'ease-out'], [ult.t0 + 0.2, `transform:rotate(${r1(a)}deg)`]);
    }
    const rotC = cls(rot.sort((p, q) => p[0] - q[0]).filter((f, i, arr) => i === 0 || f[0] > arr[i - 1][0]));
    const flashC = cls(flash);

    const labelW = tw.name.length * 6.6 + 16;
    const labelY = tw.id === 'oracle' ? tw.y - 40 : tw.y + 32;
    over += `<g class="${drop}"><g transform="translate(${tw.x} ${tw.y})">`
      + `<ellipse cy="24" rx="24" ry="5" fill="#05070f" opacity="0.6"/>`
      + `<rect x="-23" y="-23" width="46" height="46" rx="11" fill="#141a33" stroke="${tw.color}" stroke-opacity="0.55" stroke-width="2"/>`
      + `<rect x="-17" y="-17" width="34" height="34" rx="8" fill="#0d1117"/>`
      + `<g class="${rotC}"><rect x="8" y="-3.5" width="18" height="7" rx="3" fill="${tw.color}"/><circle class="${flashC}" cx="28" r="6" fill="#ffffff"/></g>`
      + `<circle r="13.5" fill="#0d1117" stroke="${tw.color}" stroke-width="2"/>`
      + towerIcon(tw)
      + `</g>`
      + `<rect x="${tw.x - labelW / 2}" y="${labelY - 11}" width="${labelW}" height="16" rx="4" fill="#0d1117" fill-opacity="0.9" stroke="${tw.color}" stroke-opacity="0.5"/>`
      + `<text x="${tw.x}" y="${labelY + 1}" class="t b" font-size="10" fill="${tw.color}" text-anchor="middle" letter-spacing="1">${esc(tw.name)}</text>`
      + `</g>`;
  }
  return { under, over };
}

function enemiesSvg() {
  let s = '';
  for (const e of enemies) {
    const spr = SPRITES[e.sprite];
    const mf = e.bps.map(([t, x, y]) => [t, `transform:translate(${r1(x)}px,${r1(y)}px)`]);
    const move = cls(mf);

    const life = cls([
      [e.spawn, 'opacity:0;transform:scale(1)'], [e.spawn + 0.01, 'opacity:1;transform:scale(1)'],
      [e.death, 'opacity:1;transform:scale(1)', 'ease-out'], [e.death + 0.08, 'opacity:1;transform:scale(1.35)', 'ease-in'],
      [e.death + 0.2, 'opacity:0;transform:scale(0.2)'],
    ], FILL_BOX);

    const ff = [[0, 'filter:none']];
    const hf = [[0, 'transform:scaleX(1)']];
    let last = -1;
    let prev = 1;
    for (const [t, v] of e.hits) {
      if (t - last > 0.1) {
        ff.push([t, 'filter:none'], [t + 0.01, 'filter:brightness(3) saturate(0)'], [t + 0.07, 'filter:brightness(3) saturate(0)'], [t + 0.08, 'filter:none']);
        last = t;
      }
      hf.push([t, `transform:scaleX(${r1(prev * 100) / 100})`, 'ease-out'], [t + 0.12, `transform:scaleX(${r1(v * 100) / 100})`]);
      prev = v;
    }
    const flash = cls(ff.filter((f, i, arr) => i === 0 || f[0] > arr[i - 1][0]));
    const hpC = cls(hf.filter((f, i, arr) => i === 0 || f[0] > arr[i - 1][0]), LEFT_BOX);

    const isBoss = e.type === 'boss';
    const bw = isBoss ? 70 : 26, bh = isBoss ? 6 : 4;
    const by = -spr.h / 2 - (isBoss ? 14 : 8);
    const hpFill = isBoss ? C.red : C.hp;
    const bob = loopCls('0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}', isBoss ? 0.5 : 0.32, 'animation-timing-function:steps(2,jump-none);', rnd());

    let extra = '';
    if (e.type === 'race') {
      extra = `<g stroke="${C.yellow}" stroke-opacity="0.6" stroke-width="2" stroke-linecap="round"><line x1="-26" y1="-5" x2="-17" y2="-5"/><line x1="-30" y1="1" x2="-19" y2="1"/><line x1="-25" y1="7" x2="-17" y2="7"/></g>`;
    }
    if (isBoss) {
      const glow = loopCls('0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.7;transform:scale(1.12)}', 0.9, FILL_BOX);
      extra = `<ellipse class="${glow}" cx="0" cy="4" rx="54" ry="36" fill="${C.red}" opacity="0.4" style="filter:blur(8px)"/>`;
    }

    s += `<g class="${move}"><g class="${life}"><g class="${flash}"><g class="${bob}">${extra}${spr.svg}</g></g>`
      + `<rect x="${-bw / 2}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="#21262d" stroke="#05070f" stroke-width="1"/>`
      + `<rect class="${hpC}" x="${-bw / 2}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="${hpFill}"/>`
      + (isBoss ? `<text y="${by - 6}" class="t b" font-size="11" fill="${C.red}" text-anchor="middle" letter-spacing="1.5">PROD INCIDENT</text>` : '')
      + `</g></g>`;
  }
  return s;
}

function projectilesSvg() {
  let s = '';
  for (const p of shots) {
    const tw = TW[p.tower];
    const [hx, hy] = enemyPosAt(enemies[p.target], p.tHit);
    const dx = r1(hx - tw.x), dy = r1(hy - tw.y);
    const a = Math.atan2(dy, dx);
    const sx = r1(Math.cos(a) * 26), sy = r1(Math.sin(a) * 26);

    if (tw.kind === 'beam' || tw.kind === 'ray') {
      const v = cls([[p.tFire, 'opacity:0'], [p.tFire + 0.01, 'opacity:1'], [p.tFire + 0.07, 'opacity:1'], [p.tFire + 0.16, 'opacity:0']]);
      const wide = tw.kind === 'beam' ? 7 : 4;
      s += `<g class="${v}"><line x1="${tw.x + sx}" y1="${tw.y + sy}" x2="${r1(hx)}" y2="${r1(hy)}" stroke="${tw.color}" stroke-opacity="0.45" stroke-width="${wide + 5}" stroke-linecap="round"/>`
        + `<line x1="${tw.x + sx}" y1="${tw.y + sy}" x2="${r1(hx)}" y2="${r1(hy)}" stroke="#ffffff" stroke-width="${wide / 2.5}" stroke-linecap="round"/>`
        + `<circle cx="${r1(hx)}" cy="${r1(hy)}" r="${wide + 2}" fill="${tw.color}" opacity="0.6"/></g>`;
      continue;
    }

    const frames = [
      [p.tFire, `opacity:0;transform:translate(${sx}px,${sy}px)`],
      [p.tFire + 0.01, `opacity:1;transform:translate(${sx}px,${sy}px)`],
    ];
    if (tw.kind === 'orb') {
      frames[1][2] = 'cubic-bezier(.3,.6,.6,1)';
      frames.push([p.tFire + (p.tHit - p.tFire) * 0.5, `opacity:1;transform:translate(${r1((sx + dx) / 2)}px,${r1((sy + dy) / 2 - 38)}px)`, 'cubic-bezier(.4,0,.7,.4)']);
    }
    frames.push([p.tHit, `opacity:1;transform:translate(${dx}px,${dy}px)`], [p.tHit + 0.01, `opacity:0;transform:translate(${dx}px,${dy}px)`]);
    const mv = cls(frames);

    let shape;
    if (tw.kind === 'dot') shape = `<circle r="6" fill="${tw.color}" opacity="0.35"/><circle r="3" fill="#ffffff"/>`;
    else if (tw.kind === 'bolt') shape = `<rect x="-6" y="-3" width="12" height="6" rx="3" fill="${tw.color}" transform="rotate(${r1((a * 180) / Math.PI)})"/><rect x="-3" y="-1.5" width="6" height="3" rx="1.5" fill="#ffffff" transform="rotate(${r1((a * 180) / Math.PI)})"/>`;
    else shape = `<circle r="10" fill="${tw.color}" opacity="0.3"/><circle r="6.5" fill="${tw.color}"/><circle cx="-2" cy="-2" r="2.2" fill="#ffd9de"/>`;
    s += `<g transform="translate(${tw.x} ${tw.y})"><g class="${mv}">${shape}</g></g>`;

    if (tw.kind === 'orb') {
      const ring = cls([[p.tHit, 'opacity:0;transform:scale(0.2)', 'ease-out'], [p.tHit + 0.02, 'opacity:0.9;transform:scale(0.4)', 'ease-out'], [p.tHit + 0.4, 'opacity:0;transform:scale(1)']], FILL_BOX);
      s += `<circle class="${ring}" cx="${r1(hx)}" cy="${r1(hy)}" r="${tw.splash}" fill="${tw.color}" fill-opacity="0.15" stroke="${tw.color}" stroke-width="3"/>`;
    }
  }
  return s;
}

function deathFx() {
  const words = ['FIXED', 'PATCHED', 'RESOLVED', 'CLOSED', 'HOTFIXED'];
  let s = '';
  deaths.forEach((d, i) => {
    if (d.enemy.type === 'boss') return;
    const burst = cls([[d.t, 'opacity:0;transform:scale(0.3)', 'ease-out'], [d.t + 0.02, 'opacity:1;transform:scale(0.5)', 'ease-out'], [d.t + 0.45, 'opacity:0;transform:scale(1.6)']], FILL_BOX);
    let parts = '';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      parts += `<rect x="${r1(d.x + Math.cos(a) * 14 - 2)}" y="${r1(d.y + Math.sin(a) * 14 - 2)}" width="4" height="4" fill="${k % 2 ? '#ffffff' : C.hp}"/>`;
    }
    s += `<g class="${burst}">${parts}</g>`;
    const label = cls([[d.t, 'opacity:0;transform:translateY(0px)', 'ease-out'], [d.t + 0.1, 'opacity:1;transform:translateY(-6px)'], [d.t + 0.7, 'opacity:1;transform:translateY(-16px)', 'ease-in'], [d.t + 0.95, 'opacity:0;transform:translateY(-22px)']]);
    s += `<text class="t b dmg ${label}" x="${r1(d.x)}" y="${r1(d.y - 16 - (i % 2) * 13)}" font-size="11" fill="${C.green}" text-anchor="middle">${words[i % words.length]}</text>`;
  });
  return s;
}

function ultFx() {
  if (!ult) return { dim: '', fx: '' };
  const boss = enemies.find((e) => e.type === 'boss');
  const [bx, by] = enemyPosAt(boss, ult.tHit);
  const tw = TW.review;
  const dim = cls([[ult.t0, 'opacity:0'], [ult.t0 + 0.3, 'opacity:0.55'], [ult.tHit + 0.4, 'opacity:0.55'], [ult.tHit + 0.8, 'opacity:0']]);

  const charge = cls([[ult.t0, 'opacity:0;transform:scale(2.4)', 'ease-in'], [ult.tHit, 'opacity:1;transform:scale(0.5)'], [ult.tHit + 0.05, 'opacity:0;transform:scale(0.5)']], FILL_BOX);
  const chargeG = `<circle class="${charge}" cx="${tw.x}" cy="${tw.y}" r="40" fill="none" stroke="${C.gold}" stroke-width="3"/>`;

  const beamV = cls([[ult.tHit - 0.02, 'opacity:0'], [ult.tHit, 'opacity:1'], [ult.tHit + 0.25, 'opacity:1'], [ult.tHit + 0.5, 'opacity:0']]);
  const beam = `<g class="${beamV}"><line x1="${tw.x}" y1="${tw.y}" x2="${r1(bx)}" y2="${r1(by)}" stroke="${C.gold}" stroke-opacity="0.4" stroke-width="22" stroke-linecap="round"/>`
    + `<line x1="${tw.x}" y1="${tw.y}" x2="${r1(bx)}" y2="${r1(by)}" stroke="#fff6d6" stroke-width="6" stroke-linecap="round"/></g>`;

  const stamp = cls([
    [ult.tHit, 'opacity:0;transform:scale(2.5)', 'cubic-bezier(.5,0,.9,.5)'], [ult.tHit + 0.18, 'opacity:1;transform:scale(1)'],
    [ult.tHit + 0.25, 'opacity:1;transform:scale(1.06)', 'ease-out'], [ult.tHit + 0.33, 'opacity:1;transform:scale(1)'],
    [ult.tHit + 1.5, 'opacity:1;transform:scale(1)', 'ease-in'], [ult.tHit + 1.9, 'opacity:0;transform:scale(1)'],
  ], FILL_BOX);
  const sx = Math.min(Math.max(bx - 110, 160), W - 160), sy = Math.max(by - 70, 90);
  const stampG = `<g transform="translate(${r1(sx)} ${r1(sy)}) rotate(-8)"><g class="${stamp}">`
    + `<rect x="-142" y="-28" width="284" height="56" rx="10" fill="#0d1117" fill-opacity="0.85" stroke="${C.red}" stroke-width="5"/>`
    + `<rect x="-134" y="-20" width="268" height="40" rx="6" fill="none" stroke="${C.red}" stroke-opacity="0.5" stroke-width="1.5"/>`
    + `<path d="M -118 -9 l 16 16 M -102 -9 l -16 16" stroke="${C.red}" stroke-width="5" stroke-linecap="round"/>`
    + `<text x="14" y="8" class="t b" font-size="21" fill="${C.red}" text-anchor="middle" letter-spacing="2">CHANGES REQUESTED</text></g></g>`;

  const flash = cls([[ult.tHit, 'opacity:0'], [ult.tHit + 0.03, 'opacity:0.75'], [ult.tHit + 0.35, 'opacity:0']]);

  const shards = cls([[ult.tHit, 'opacity:0;transform:scale(0.2)', 'ease-out'], [ult.tHit + 0.03, 'opacity:1;transform:scale(0.4)', 'ease-out'], [ult.tHit + 0.7, 'opacity:0;transform:scale(2.2)']], FILL_BOX);
  let parts = '';
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    parts += `<rect x="${r1(bx + Math.cos(a) * 30 - 3)}" y="${r1(by + Math.sin(a) * 30 - 3)}" width="6" height="6" fill="${k % 2 ? C.gold : C.red}"/>`;
  }

  return {
    dim: `<rect class="${dim}" width="${W}" height="${H}" fill="#05060d"/>`,
    fx: chargeG + beam + `<g class="${shards}">${parts}</g>` + stampG,
    flash: `<rect class="${flash}" width="${W}" height="${H}" fill="#ffffff"/>`,
  };
}

function hud() {
  const x = 16, y = 10, w = W - 32, h = 38;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${C.panel}" fill-opacity="0.92" stroke="${C.panelEdge}" stroke-width="2"/>`;
  s += `<rect x="${x + 14}" y="${y + 13}" width="12" height="12" rx="2" fill="${C.green}" transform="rotate(45 ${x + 20} ${y + 19})"/>`;
  s += `<text x="${x + 36}" y="${y + 24}" class="t b" font-size="13" fill="${C.text}" letter-spacing="1.5">ERP TOWER DEFENSE</text>`;

  const phases = [['BUILD PHASE · DEPLOYING SKILLS', [0, WAVES[0].banner], C.dim]]
    .concat(WAVES.map((wv, i) => [`${wv.label}${wv.boss ? '' : ` / ${WAVES.length}`}`, wv.hud, wv.color]))
    .concat([['ALL WAVES CLEARED', [VICTORY - 0.2, T], C.green]]);
  for (const [label, win, col] of phases) {
    const v = vis([win], 0.12);
    s += `<text class="${v} t b" x="${W / 2}" y="${y + 24}" font-size="12" fill="${col}" text-anchor="middle" letter-spacing="2">${esc(label)}</text>`;
  }

  s += `<text x="${x + w - 196}" y="${y + 24}" class="t b" font-size="11" fill="${C.dim}" letter-spacing="1">SQUASHED</text>`;
  const sorted = [...deaths].sort((a, b) => a.t - b.t);
  const edges = [0, ...sorted.map((d) => d.t), T];
  for (let n = 0; n <= sorted.length; n++) {
    const v = vis([[edges[n], edges[n + 1]]], 0.01);
    s += `<text class="${v} t b" x="${x + w - 116}" y="${y + 24}" font-size="13" fill="${C.text}" text-anchor="end">${String(n).padStart(2, '0')}</text>`;
  }
  s += `<text x="${x + w - 16}" y="${y + 24}" class="t b" font-size="11" fill="${C.dim}" text-anchor="end" letter-spacing="1">UPTIME <tspan fill="${C.green}">100%</tspan></text>`;
  return s;
}

function banners() {
  let s = '';
  for (const wv of WAVES) {
    const t0 = wv.banner;
    const strip = cls([
      [t0, 'opacity:0;transform:scaleY(0)', 'cubic-bezier(.2,.8,.3,1)'], [t0 + 0.2, 'opacity:1;transform:scaleY(1)'],
      [t0 + 1.2, 'opacity:1;transform:scaleY(1)', 'ease-in'], [t0 + 1.4, 'opacity:0;transform:scaleY(0)'],
    ], FILL_BOX);
    const txt = cls([
      [t0 + 0.05, 'opacity:0;transform:translateX(-60px)', 'cubic-bezier(.2,.8,.3,1)'], [t0 + 0.35, 'opacity:1;transform:translateX(0px)'],
      [t0 + 1.05, 'opacity:1;transform:translateX(0px)', 'cubic-bezier(.6,0,.9,.4)'], [t0 + 1.35, 'opacity:0;transform:translateX(60px)'],
    ]);
    s += `<rect class="${strip}" x="0" y="186" width="${W}" height="72" fill="#070a14" fill-opacity="0.9" stroke="${wv.color}" stroke-opacity="0.6"/>`;
    s += `<g class="${txt}"><text x="${W / 2}" y="222" class="t b" font-size="30" fill="${wv.color}" text-anchor="middle" letter-spacing="8">${esc(wv.label)}</text>`
      + `<text x="${W / 2}" y="245" class="t b" font-size="11.5" fill="${C.dim}" text-anchor="middle" letter-spacing="2.5">${esc(wv.sub)}</text></g>`;
    if (wv.boss) {
      const red = cls([[t0, 'opacity:0'], [t0 + 0.12, 'opacity:0.28'], [t0 + 0.4, 'opacity:0'], [t0 + 0.55, 'opacity:0.22'], [t0 + 0.9, 'opacity:0']]);
      s += `<rect class="${red}" width="${W}" height="${H}" fill="${C.red}"/>`;
    }
  }
  return s;
}

function victory() {
  const dim = cls([[VICTORY, 'opacity:0'], [VICTORY + 0.35, 'opacity:0.84']]);
  const px = 190, py = 70, pw = 460, ph = 330;
  const panelIn = cls([
    [VICTORY + 0.1, 'opacity:0;transform:translateY(16px) scale(0.97)', 'cubic-bezier(.2,.8,.3,1)'],
    [VICTORY + 0.55, 'opacity:1;transform:translateY(0px) scale(1)'],
  ], FILL_BOX);
  let s = `<rect class="${dim}" width="${W}" height="${H}" fill="#060812"/>`;
  s += `<g class="${panelIn}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12" fill="${C.panel}" stroke="${C.panelEdge}" stroke-width="2"/>`
    + `<rect x="${px + 4}" y="${py + 4}" width="${pw - 8}" height="${ph - 8}" rx="9" fill="none" stroke="${C.panelHi}" stroke-opacity="0.35"/>`;

  const shimmer = loopCls('0%,100%{opacity:.5}50%{opacity:1}', 1.6, 'animation-timing-function:ease-in-out;');
  s += `<text x="${W / 2}" y="${py + 54}" class="t b ${shimmer}" font-size="30" fill="${C.green}" text-anchor="middle" letter-spacing="6" style="filter:blur(6px)">RELEASE SHIPPED</text>`;
  s += `<text x="${W / 2}" y="${py + 54}" class="t b" font-size="30" fill="${C.green}" text-anchor="middle" letter-spacing="6">RELEASE SHIPPED</text>`;
  s += `<text x="${W / 2}" y="${py + 80}" class="t" font-size="12.5" fill="${C.dim}" text-anchor="middle" letter-spacing="1.5">${deaths.length} BUGS SQUASHED  ·  0 REACHED PRODUCTION  ·  UPTIME 100%</text>`;
  s += `<line x1="${px + 30}" y1="${py + 98}" x2="${px + pw - 30}" y2="${py + 98}" stroke="${C.panelEdge}" stroke-width="2"/>`;
  s += `<text x="${px + 30}" y="${py + 124}" class="t b" font-size="11" fill="${C.dim}" letter-spacing="2.5">TOWER</text>`;
  s += `<text x="${px + pw - 30}" y="${py + 124}" class="t b" font-size="11" fill="${C.dim}" letter-spacing="2.5" text-anchor="end">KILLS</text>`;

  const roster = [...TOWERS].sort((a, b) => kills[b.id] - kills[a.id]);
  const maxK = Math.max(...Object.values(kills));
  const mvp = roster[0].id;
  roster.forEach((tw, i) => {
    const y = py + 148 + i * 30;
    const t0 = VICTORY + 0.8 + i * 0.16;
    const rowIn = cls([[t0, 'opacity:0;transform:translateX(-8px)', 'ease-out'], [t0 + 0.25, 'opacity:1;transform:translateX(0px)']]);
    const fill = cls([[t0 + 0.1, 'transform:scaleX(0)', 'cubic-bezier(.2,.8,.3,1)'], [t0 + 0.9, `transform:scaleX(${(kills[tw.id] / maxK).toFixed(3)})`]], LEFT_BOX);
    const barX = px + 262, barW = 118;
    s += `<g class="${rowIn}"><g transform="translate(${px + 42} ${y})"><circle r="10" fill="#0d1117" stroke="${tw.color}" stroke-width="1.6"/><g transform="scale(0.72)">${towerIcon(tw)}</g></g>`
      + `<text x="${px + 62}" y="${y + 4.5}" class="t b" font-size="13" fill="${C.text}">${esc(tw.name)}</text>`
      + (tw.id === mvp ? `<rect x="${px + 62 + tw.name.length * 8 + 6}" y="${y - 8}" width="34" height="15" rx="4" fill="${C.gold}" fill-opacity="0.18" stroke="${C.gold}"/><text x="${px + 62 + tw.name.length * 8 + 23}" y="${y + 3.5}" class="t b" font-size="9.5" fill="${C.gold}" text-anchor="middle">MVP</text>` : '')
      + (tw.id === 'review' ? `<text x="${px + 62 + tw.name.length * 8 + 6}" y="${y + 4}" class="t b" font-size="9.5" fill="${C.gold}">★ FINISHER</text>` : '')
      + `<rect x="${barX}" y="${y - 4}" width="${barW}" height="8" rx="4" fill="#21262d"/>`
      + `<rect class="${fill}" x="${barX}" y="${y - 4}" width="${barW}" height="8" rx="4" fill="${tw.color}"/>`
      + `<text x="${px + pw - 30}" y="${y + 4.5}" class="t b" font-size="13" fill="${C.text}" text-anchor="end">${kills[tw.id]}</text></g>`;
  });

  const blink = loopCls('0%,60%{opacity:1}61%,100%{opacity:0}', 1.0);
  const footIn = cls([[VICTORY + 2.0, 'opacity:0'], [VICTORY + 2.3, 'opacity:1']]);
  s += `<g class="${footIn}"><text x="${W / 2}" y="${py + ph - 18}" class="t b ${blink}" font-size="11.5" fill="${C.dim}" text-anchor="middle" letter-spacing="2.5">▶ NEXT SPRINT LOADING</text></g>`;
  s += `</g>`;
  return s;
}

// ---------- assemble ----------

const tw = towers();
const uf = ultFx();
const blackIn = cls([[0, 'opacity:1'], [0.45, 'opacity:0'], [FADE_OUT, 'opacity:0'], [T, 'opacity:1']]);

const body = [
  background(),
  tw.under,
  core(),
  enemiesSvg(),
  tw.over,
  uf.dim,
  projectilesSvg(),
  deathFx(),
  uf.fx,
  hud(),
  banners(),
  uf.flash,
  victory(),
  `<rect width="${W}" height="${H}" fill="url(#vign)"/>`,
  `<rect class="${blackIn}" width="${W}" height="${H}" fill="#000"/>`,
].join('\n');

const style = `.t{font-family:${FONT}}.b{font-weight:700}.dmg{paint-order:stroke;stroke:#0b0f17;stroke-width:4px;stroke-linejoin:round}
${css.join('\n')}
@media (prefers-reduced-motion:reduce){*{animation-delay:-35s!important;animation-play-state:paused!important}}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Animated tower defense: React, PowerShell, Oracle SQL, C#/.NET and Code Review towers stop every bug before it reaches the production ERP.">
<title>ERP Tower Defense</title>
<style>${style}</style>
${body}
</svg>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);

console.log(`wrote ${OUT} (${(svg.length / 1024).toFixed(1)} KB)`);
console.log(`shots ${shots.length}, deaths ${deaths.length}, ult ${ult ? ult.t0.toFixed(2) + '->' + ult.tHit.toFixed(2) : 'none'}`);
console.log('kills', kills);
for (const e of enemies) console.log(`${e.type.padEnd(5)} spawn ${e.spawn.toFixed(2)} death ${e.death.toFixed(2)} d ${e.d.toFixed(0)}/${PATH_LEN.toFixed(0)}`);
