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

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html')).sort();
const industries = [];

for (const f of files) {
  const s = fs.readFileSync(path.join(DIR, f), 'utf8');
  const slug = f.replace('.html', '');

  const h1 = s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = clean(h1 ? h1[1] : slug);

  // scope-bar chips
  const meta = [];
  const sb = s.match(/<div class="scope-bar[^"]*">([\s\S]*?)<\/div>/);
  if (sb) for (const m of sb[1].matchAll(/<span class="chip[^"]*">([\s\S]*?)<\/span>/g)) meta.push(clean(m[1]));

  // metric cards
  const metrics = [];
  for (const m of s.matchAll(/metric-card__val">([\s\S]*?)<\/div>\s*<div class="metric-card__label">([\s\S]*?)<\/div>(?:\s*<div class="metric-card__sub">([\s\S]*?)<\/div>)?/g)) {
    const before = s.slice(Math.max(0, m.index - 220), m.index);
    metrics.push({
      val: clean(m[1]), label: clean(m[2]), sub: clean(m[3] || ''),
      gold: /metric-card--gold[^>]*>\s*$/.test(before),
    });
  }

  // digest items
  const digest = [];
  for (const m of s.matchAll(/<div class="digest__item">\s*<div class="digest__h">([\s\S]*?)<\/div>\s*<ul>([\s\S]*?)<\/ul>\s*<\/div>/g)) {
    const items = [...m[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => clean(x[1])).filter(Boolean);
    digest.push({ h: clean(m[1]), items });
  }

  // nodes
  let nodes = [];
  const nm = s.match(/(?:const|let|var)\s+NODES\s*=\s*/);
  if (nm) {
    const b = s.indexOf('[', nm.index + nm[0].length - 1);
    const arr = extractArray(s, b);
    if (arr) {
      try {
        const N = vm.runInContext('(' + arr + ')', CTX);
        nodes = N.map(n => ({
          id: n.id, name: clean(n.name), pri: n.pri, bott: !!n.bott,
          fn: clean(n.fn), importDep: clean(n.importDep), conc: clean(n.conc),
          gap: clean(n.gap), near: clean(n.near),
          companies: (n.companies || []).map(c => ({
            n: clean(c.n), t: clean(c.t), e: clean(c.e), m: clean(c.m || c.mat), ev: clean(c.ev)
          })),
        }));
      } catch (e) { console.log('NODES parse fail', slug, e.message); }
    }
  }

  industries.push({ slug, title, meta, metrics, digest, nodes });
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

const totN = industries.reduce((a, i) => a + i.nodes.length, 0);
const totM = industries.reduce((a, i) => a + i.metrics.length, 0);
const totD = industries.reduce((a, i) => a + i.digest.length, 0);
const withNodes = industries.filter(i => i.nodes.length).length;
console.log(`industries ${industries.length} | nodes ${totN} | metrics ${totM} | digest items ${totD} | with nodes ${withNodes}`);
console.log('companies', companies.companies.length, '| counts', JSON.stringify(companies.counts));
const size = fs.statSync('data/registry.json').size;
console.log('registry.json', (size / 1024 / 1024).toFixed(2), 'MB');
