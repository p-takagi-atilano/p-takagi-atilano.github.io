// Shared by results.html (public) and admin/results.html: reads the Sheet's "Results" tab.
"use strict";
const SHEET = '1PqselA1x1xcKgkLQq2a1JQm8nFdDSZ_i21E_3XVotaA';
const URL_CSV = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent('Results')}`;
const $ = s => document.querySelector(s);
function parseCSV(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
// "9:41.3" / "1:02:03.4" -> ms; anything else (DNF, blank) -> null
function toMs(s) {
  const m = String(s || '').trim().match(/^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/);
  return m ? ((+(m[1] || 0) * 60 + +m[2]) * 60 + +m[3]) * 1000 : null;
}

let athletes = []; // {bib, name, team, birth, gender, l1, l2, total, l1s, l2s, totals}
const filters = { team: new Set(), birth: new Set(), gender: new Set() }; // empty set = everyone
let query = '';
let sort = []; // [{key, dir}] chain; empty = by rank
const SORTABLE = { team: { label: 'Team', type: 'text' }, birth: { label: 'Birth year', type: 'num' }, gender: { label: 'Gender', type: 'text' } };

async function load() {
  let rows = [], head = [];
  try {
    const res = await fetch(URL_CSV, { cache: 'no-store' });
    const text = await res.text();
    if (res.ok && !/^\s*</.test(text)) { const all = parseCSV(text); if (all.length && all[0][0] === 'Rank') { head = all[0]; rows = all.slice(1); } }
  } catch {}
  const col = name => head.indexOf(name);
  const get = (r, name) => { const i = col(name); return i >= 0 ? (r[i] || '').trim() : ''; };
  athletes = rows.map(r => ({
    bib: get(r, '#'), name: get(r, 'Name'), team: get(r, 'Team'), birth: get(r, 'Birth year'), gender: get(r, 'Gender'),
    l1s: get(r, 'Lap 1'), l2s: get(r, 'Lap 2'), totals: get(r, 'Total'),
    l1: toMs(get(r, 'Lap 1')), l2: toMs(get(r, 'Lap 2')), total: toMs(get(r, 'Total')),
  }));
  $('#loading').hidden = true;
  $('#soon').hidden = athletes.length > 0;
  $('#list').hidden = athletes.length === 0;
  if (athletes.length) { fillFilters(); render(); }
}

function fillFilters() {
  const pills = (key, box, numeric) => {
    const vals = [...new Set(athletes.map(a => a[key]).filter(Boolean))].sort((x, y) => numeric ? x - y : x.localeCompare(y));
    for (const v of [...filters[key]]) if (!vals.includes(v)) filters[key].delete(v);
    box.textContent = '';
    for (const v of vals) {
      const b = el('button', { className: 'pill' + (filters[key].has(v) ? ' on' : ''), textContent: v });
      b.setAttribute('aria-pressed', filters[key].has(v));
      b.onclick = () => { filters[key].has(v) ? filters[key].delete(v) : filters[key].add(v); fillFilters(); render(); };
      box.append(b);
    }
  };
  pills('team', $('#fTeam')); pills('birth', $('#fBirth'), true); pills('gender', $('#fGender'));
}
$('#q').oninput = e => { query = e.target.value; render(); };
$('#clearF').onclick = () => { filters.team.clear(); filters.birth.clear(); filters.gender.clear(); query = ''; $('#q').value = ''; fillFilters(); render(); };

// place of each value among the shown athletes (ties share a place); null for no time
function places(list, key) {
  const times = list.map(a => a[key]).filter(t => t != null).sort((x, y) => x - y);
  const m = new Map(); list.forEach(a => { if (a[key] != null) m.set(a, times.indexOf(a[key]) + 1); });
  return m;
}
function clickSort(key) {
  const i = sort.findIndex(s => s.key === key);
  if (i < 0) sort.push({ key, dir: 1 }); else if (sort[i].dir === 1) sort[i].dir = -1; else sort.splice(i, 1);
  render();
}
function cmpKey(a, b, key, dir) {
  const x = a[key], y = b[key], ex = !x, ey = !y;
  if (ex || ey) return ex === ey ? 0 : ex ? 1 : -1; // blanks last
  return dir * (SORTABLE[key].type === 'num' ? x - y : x.localeCompare(y, undefined, { sensitivity: 'base' }));
}
function el(tag, props = {}, ...kids) { const e = document.createElement(tag); Object.assign(e, props); e.append(...kids); return e; }

function render() {
  const inSet = (set, v) => !set.size || set.has(v);
  const field = athletes.filter(a => inSet(filters.team, a.team) && inSet(filters.birth, a.birth) && inSet(filters.gender, a.gender));
  // places are among the team/birth-year/gender selection; the name search only hides rows
  const rank = places(field, 'total'), p1 = places(field, 'l1'), p2 = places(field, 'l2');
  const norm = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = norm(query.trim());
  const shown = q ? field.filter(a => norm(a.name).includes(q)) : field;
  $('#clearF').hidden = !(filters.team.size || filters.birth.size || filters.gender.size || q);
  const byRank = (a, b) => (a.total == null) - (b.total == null) || (a.total ?? 0) - (b.total ?? 0) || (+a.bib || 0) - (+b.bib || 0);
  shown.sort((a, b) => { for (const s of sort) { const c = cmpKey(a, b, s.key, s.dir); if (c) return c; } return byRank(a, b); });

  // sort chips
  const bar = $('#sortbar'); bar.textContent = '';
  bar.append(el('span', { className: 'muted', textContent: 'Sort:' }));
  if (!sort.length) bar.append(el('span', { className: 'muted', textContent: 'rank' }));
  sort.forEach((s, i) => {
    if (i) bar.append(el('span', { className: 'muted', textContent: 'then' }));
    const c = SORTABLE[s.key];
    const flip = el('button', { textContent: c.label + (s.dir === 1 ? (c.type === 'num' ? ' ↑ low→high' : ' ↑ A→Z') : (c.type === 'num' ? ' ↓ high→low' : ' ↓ Z→A')) });
    flip.onclick = () => { s.dir *= -1; render(); };
    const x = el('button', { textContent: '×', title: 'Remove' }); x.onclick = () => { sort.splice(i, 1); render(); };
    bar.append(el('span', { className: 'chip' }, flip, x));
  });
  for (const k of Object.keys(SORTABLE)) if (!sort.some(s => s.key === k)) {
    const add = el('button', { className: 'sbtn', textContent: '+ ' + SORTABLE[k].label }); add.onclick = () => clickSort(k); bar.append(add);
  }
  if (sort.length) { const clr = el('button', { className: 'sbtn', textContent: 'Clear sort' }); clr.onclick = () => { sort = []; render(); }; bar.append(clr); }

  // header
  const head = $('#head'); head.textContent = '';
  const cols = [['Rank', 'n'], ['Name', ''], ['team', 'w'], ['birth', 'n w'], ['gender', 'w'], ['Lap 1', 'n w'], ['Lap 2', 'n w'], ['Total', 'n']];
  for (const [k, cls = ''] of cols) {
    if (SORTABLE[k]) {
      const i = sort.findIndex(s => s.key === k);
      const th = el('th', { className: ('s ' + cls + (i >= 0 ? ' act' : '')).trim() }, SORTABLE[k].label + (i >= 0 ? ' ' + (sort.length > 1 ? i + 1 : '') + (sort[i].dir === 1 ? '↑' : '↓') : ''));
      th.onclick = () => clickSort(k); head.append(th);
    } else head.append(el('th', { className: cls, textContent: k }));
  }
  // rows
  const tb = $('#rows'); tb.textContent = '';
  const timeCell = (str, place) => { const c = el('td', { className: 'n t' }, str); if (place) c.append(' ', el('span', { className: 'pl', textContent: '(' + place + ')' })); return c; };
  for (const a of shown) {
    const lap = (s, p) => s ? s + (p ? ' (' + p + ')' : '') : '–';
    const who = [a.team, a.birth, a.gender].filter(Boolean).join(' · ');
    const tot = el('td', { className: a.total != null ? 'n t' : 'n dnf', textContent: a.totals });
    tot.append(el('div', { className: 'sub lp', textContent: 'L1 ' + lap(a.l1s, p1.get(a)) }), el('div', { className: 'sub lp', textContent: 'L2 ' + lap(a.l2s, p2.get(a)) }));
    const l1 = timeCell(a.l1s, p1.get(a)), l2 = timeCell(a.l2s, p2.get(a)); l1.classList.add('w'); l2.classList.add('w');
    tb.append(el('tr', {},
      el('td', { className: 'n rank', textContent: rank.get(a) || '' }),
      el('td', { className: 'nm' }, a.name, el('div', { className: 'sub', textContent: who })),
      el('td', { className: 'w tm', textContent: a.team }),
      el('td', { className: 'n w', textContent: a.birth }),
      el('td', { className: 'w', textContent: a.gender }),
      l1, l2, tot));
  }
  if (!shown.length) tb.append(el('tr', {}, el('td', { colSpan: 8, className: 'muted', textContent: 'Nobody matches.' })));
}
load(); setInterval(load, 60000);
