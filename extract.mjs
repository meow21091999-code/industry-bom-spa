import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const REG = process.env.REGISTRY_DIR || '../industry-bom-registry';
const DIR = REG + '/industries';
const CTX = vm.createContext({});

const ENT = { '&mdash;': '—', '&ndash;': '–', '&amp;': '&', '&nbsp;': ' ', '&middot;': '·', '&rarr;': '→', '&larr;': '←',
  '&times;': '×', '&asymp;': '≈', '&gt;': '>', '&lt;': '<', '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”',
  '&hellip;': '…', '&#8377;': '₹', '&#36;': '$', '&minus;': '−', '&plus;': '+', '&deg;': '°',
  '&sup2;': '²', '&sup3;': '³', '&micro;': 'µ', '&euro;': '€', '&pound;': '£', '&frac12;': '½', '&percnt;': '%' };

function clean(s) {
  if (!s) return '';
  let t = String(s);
  for (const [k, v] of Object.entries(ENT)) t = t.split(k).join(v);
  t = t.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
  t = t.replace(/<[^>]+>/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

function extractArray(s, startIdx) {
  let depth = 0, inStr = null, esc = false;
  for (let i = startIdx; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch.charCodeAt(0) === 92) esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return s.slice(startIdx, i + 1); }
  }
  return null;
}

const li = block => [...block.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => clean(x[1])).filter(Boolean);

/** parse an entry page into its ordered sections */
function parseSections(html) {
  const out = [];
  const parts = html.split(/<section class="animate"/).slice(1);
  for (const chunk of parts) {
    const tm = chunk.match(/<span class="sec-title">([\s\S]*?)<\/span>/);
    const nm = chunk.match(/<span class="sec-note">([\s\S]*?)<\/span>/);
    const title = clean(tm ? tm[1] : '');
    const note = clean(nm ? nm[1] : '');
    if (!title) continue;
    const sec = { title, note };

    const dg = [...chunk.matchAll(/<div class="digest__item">\s*<div class="digest__h">([\s\S]*?)<\/div>\s*<ul>([\s\S]*?)<\/ul>\s*<\/div>/g)]
      .map(m => ({ h: clean(m[1]), items: li(m[2]) }));
    if (dg.length) { sec.kind = 'digest'; sec.items = dg; }

    const rungs = [...chunk.matchAll(/<div class="rung rung--(\d)">\s*<div class="rung__label">([\s\S]*?)<\/div>\s*<div class="rung__body">([\s\S]*?)<\/div>\s*<\/div>/g)]
      .map(m => ({ tier: Number(m[1]), label: clean(m[2]), body: clean(m[3]) }));
    if (rungs.length) { sec.kind = sec.kind || 'ladder'; sec.rungs = rungs; }

    const bns = [...chunk.matchAll(/<div class="bn">\s*<div class="bn__risk">\s*<div class="bn__h">[\s\S]*?<\/div>\s*<p>([\s\S]*?)<\/p>\s*<\/div>\s*<div class="bn__opp">\s*<div class="bn__h">[\s\S]*?<\/div>\s*<p>([\s\S]*?)<\/p>/g)]
      .map(m => ({ risk: splitTitled(m[1]), opp: splitTitled(m[2]) }));
    if (bns.length) { sec.kind = sec.kind || 'bottlenecks'; sec.pairs = bns; }

    const rows = [...chunk.matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)]
      .map(m => [clean(m[1]), clean(m[2]), clean(m[3]), clean(m[4])]);
    if (rows.length) { sec.kind = sec.kind || 'table'; sec.rows = rows; }

    const ds = chunk.match(/<script type="text\/plain" class="diagram-source">([\s\S]*?)<\/script>/);
    if (ds) { sec.kind = sec.kind || 'diagram'; sec.source = ds[1].trim(); }

    if (/map-layout/.test(chunk) || /BOM Tree/i.test(title)) sec.kind = sec.kind || 'map';
    if (/Matrix/i.test(title)) sec.kind = sec.kind || 'matrix';

    if (sec.kind) out.push(sec);
  }
  return out;
}

/** "TitleRest of sentence" -> { title, text } using the <span class="bn__title"> */
function splitTitled(raw) {
  const m = raw.match(/<span class="bn__title">([\s\S]*?)<\/span>([\s\S]*)/);
  if (m) return { title: clean(m[1]), text: clean(m[2]) };
  return { title: '', text: clean(raw) };
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html')).sort();
const industries = [];

for (const f of files) {
  const s = fs.readFileSync(path.join(DIR, f), 'utf8');
  const slug = f.replace('.html', '');

  const h1 = s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = clean(h1 ? h1[1] : slug);

  const meta = [];
  const sb = s.match(/<div class="scope-bar[^"]*">([\s\S]*?)<\/div>/);
  if (sb) for (const m of sb[1].matchAll(/<span class="chip[^"]*">([\s\S]*?)<\/span>/g)) meta.push(clean(m[1]));

  const metrics = [];
  for (const m of s.matchAll(/metric-card__val">([\s\S]*?)<\/div>\s*<div class="metric-card__label">([\s\S]*?)<\/div>(?:\s*<div class="metric-card__sub">([\s\S]*?)<\/div>)?/g)) {
    const before = s.slice(Math.max(0, m.index - 220), m.index);
    metrics.push({ val: clean(m[1]), label: clean(m[2]), sub: clean(m[3] || ''), gold: /metric-card--gold[^>]*>\s*$/.test(before) });
  }

  let nodes = [];
  const nm = s.match(/(?:const|let|var)\s+NODES\s*=\s*/);
  if (nm) {
    const b = s.indexOf('[', nm.index + nm[0].length - 1);
    const arr = extractArray(s, b);
    if (arr) {
      try {
        nodes = vm.runInContext('(' + arr + ')', CTX).map(n => ({
          id: n.id, name: clean(n.name), pri: n.pri, bott: !!n.bott,
          fn: clean(n.fn), importDep: clean(n.importDep), conc: clean(n.conc),
          gap: clean(n.gap), near: clean(n.near),
          companies: (n.companies || []).map(c => ({ n: clean(c.n), t: clean(c.t), e: clean(c.e), m: clean(c.m || c.mat), ev: clean(c.ev) })),
        }));
      } catch (e) { console.log('NODES parse fail', slug, e.message); }
    }
  }

  const sections = parseSections(s);
  const firstDigest = sections.find(x => x.kind === 'digest');

  industries.push({
    slug, title, meta, metrics, nodes, sections,
    digest: firstDigest ? firstDigest.items : [],
    sectionCount: sections.length,
  });
}

// ---- sector grouping from the register index ----
const indexHtml = fs.readFileSync(REG + '/index.html', 'utf8');
const groupOf = {};
for (const g of indexHtml.matchAll(/<span class="group__name">([\s\S]*?)<\/span>([\s\S]*?)(?=<span class="group__name">|<\/section>)/g)) {
  const gname = clean(g[1]);
  for (const r of g[2].matchAll(/href="industries\/([a-z0-9-]+)\.html"/g)) groupOf[r[1]] = gname;
}
for (const ind of industries) ind.group = groupOf[ind.slug] || 'Ungrouped';

const companies = JSON.parse(fs.readFileSync(REG + '/companies.json', 'utf8'));

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/registry.json', JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  industries,
  companies: companies.companies,
  counts: companies.counts,
}, null, 0));

const kinds = {};
for (const i of industries) for (const s of i.sections) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
console.log('industries', industries.length,
  '| sections', industries.reduce((a, i) => a + i.sections.length, 0),
  '| nodes', industries.reduce((a, i) => a + i.nodes.length, 0),
  '| metrics', industries.reduce((a, i) => a + i.metrics.length, 0));
console.log('section kinds:', JSON.stringify(kinds));
console.log('registry.json', (fs.statSync('data/registry.json').size / 1024 / 1024).toFixed(2), 'MB');
