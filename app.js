// Review site for the candidate IndoPak text and its tajweed colouring.
//
// Colour positions come from the generator in *grapheme cluster* units, so the
// renderer must segment the same way. `Intl.Segmenter` does that; splitting on
// code points (Array.from) or UTF-16 indices would drift by the number of
// diacritics before the span — the same class of bug the iOS reader avoids.

const COLOURS = {
  hamzat_wasl: '#AAAAAA', silent: '#AAAAAA', lam_shamsiyyah: '#AAAAAA',
  madd_2: '#537FFF', madd_246: '#4050FF', madd_munfasil: '#2144C1',
  madd_muttasil: '#2144C1', madd_6: '#000EBC',
  qalqalah: '#DD0008', ikhfa_shafawi: '#D500B7', ikhfa: '#9400A8',
  idghaam_shafawi: '#58B800', iqlab: '#26BFFD',
  idghaam_ghunnah: '#169777', idghaam_no_ghunnah: '#169200',
  idghaam_mutajanisayn: '#A1A1A1', idghaam_mutaqaribayn: '#A1A1A1',
  ghunnah: '#FF7E1E',
};
const NAMES = {
  hamzat_wasl: 'Hamzat al-Wasl', silent: 'Silent', lam_shamsiyyah: 'Lam Shamsiyyah',
  madd_2: 'Madd 2', madd_246: 'Madd 2-4-6', madd_munfasil: 'Madd Munfasil',
  madd_muttasil: 'Madd Muttasil', madd_6: 'Madd 6', qalqalah: 'Qalqalah',
  ikhfa_shafawi: 'Ikhfa Shafawi', ikhfa: 'Ikhfa', idghaam_shafawi: 'Idghaam Shafawi',
  iqlab: 'Iqlab', idghaam_ghunnah: 'Idghaam + Ghunnah',
  idghaam_no_ghunnah: 'Idghaam no Ghunnah', idghaam_mutajanisayn: 'Idghaam Mutajanisayn',
  idghaam_mutaqaribayn: 'Idghaam Mutaqaribayn', ghunnah: 'Ghunnah',
};

// Bump when the generated data changes: the site is served from a branch with
// ordinary HTTP caching, and a stale data file would show reviewers text that no
// longer matches the build.
const DATA_VERSION = '3';
const dataURL = (path) => `${path}?v=${DATA_VERSION}`;

const store = {
  key: 'indopak-review-marks',
  all: JSON.parse(localStorage.getItem('indopak-review-marks') || '{}'),
  save() { localStorage.setItem(this.key, JSON.stringify(this.all)); },
  get(k) { return this.all[k] || ''; },
  set(k, v) { if (v) this.all[k] = v; else delete this.all[k]; this.save(); renderProgress(); },
};

let index = [];
let targets = new Set();
let current = 1;

const segmenter = new Intl.Segmenter('ar', { granularity: 'grapheme' });
const cluster = (word) => Array.from(segmenter.segment(word), (s) => s.segment);

function renderWord(word) {
  const clusters = cluster(word.t);
  const holder = document.createElement('span');
  holder.className = 'word';

  // Paint each rule over the clusters it covers; a cluster can carry more than one
  // (a cluster contributes both its base letter and a superscript alef).
  // `undefined` means no span covers this cluster; `null` means a span whose rule
  // the app cannot colour. Keeping them distinct is what lets the second case show
  // as a dotted underline instead of vanishing.
  const marks = clusters.map(() => undefined);
  for (const [start, end, rule] of word.s) {
    for (let i = start; i < end && i < marks.length; i += 1) {
      if (marks[i] === undefined) marks[i] = rule;
    }
  }
  const unmapped = word.s.some(([, , rule]) => !rule);

  clusters.forEach((text, i) => {
    const rule = marks[i];
    const span = document.createElement('span');
    span.textContent = text;
    if (rule && COLOURS[rule]) {
      span.style.color = COLOURS[rule];
      span.dataset.rule = rule;
    } else if (rule !== undefined) {
      // A rule the app cannot colour is shown as a dotted underline, so it is
      // visible to the reviewer instead of silently absent.
      span.className = 'unmapped';
      span.title = 'a rule the app cannot colour';
    }
    holder.appendChild(span);
  });
  holder.title = word.s.map(([, , rule]) => NAMES[rule] || `unmapped ${rule}`).join(', ');
  if (unmapped) holder.classList.add('has-unmapped');
  return holder;
}

function renderSurah(data) {
  const page = document.getElementById('page');
  page.textContent = '';
  for (const ayah of data.ayahs) {
    const key = `${data.surah}:${ayah.a}`;
    const block = document.createElement('div');
    block.className = 'ayah';
    block.id = `ayah-${ayah.a}`;
    if (targets.has(key)) block.classList.add('target');

    const text = document.createElement('p');
    text.className = 'text';
    ayah.w.forEach((word) => {
      text.appendChild(renderWord(word));
      text.appendChild(document.createTextNode(' '));
    });

    const marker = document.createElement('span');
    marker.className = 'marker';
    marker.textContent = toArabicDigits(ayah.a);
    text.appendChild(marker);
    block.appendChild(text);

    if (targets.has(key)) block.appendChild(markControls(key));
    page.appendChild(block);
  }
}

function markControls(key) {
  const row = document.createElement('div');
  row.className = 'marks';
  row.dataset.key = key;
  for (const [value, label, cls] of [['ok', 'Correct', 'ok'], ['no', 'Wrong', 'no']]) {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = `mark ${cls}`;
    button.addEventListener('click', () => {
      store.set(key, store.get(key) === value ? '' : value);
      row.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      if (store.get(key) === value) button.classList.add('active');
    });
    if (store.get(key) === value) button.classList.add('active');
    row.appendChild(button);
  }
  const note = document.createElement('input');
  note.type = 'text';
  note.placeholder = 'note (optional)';
  note.value = store.all[`${key}:note`] || '';
  note.addEventListener('change', () => store.set(`${key}:note`, note.value));
  row.appendChild(note);
  return row;
}

function toArabicDigits(n) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function renderProgress() {
  const marks = Object.entries(store.all).filter(([k]) => !k.endsWith(':note'));
  const ok = marks.filter(([, v]) => v === 'ok').length;
  const no = marks.filter(([, v]) => v === 'no').length;
  document.getElementById('progress').textContent =
    `Reviewed ${marks.length}/${targets.size} — ${ok} correct, ${no} wrong.`;
}

async function load(surah) {
  current = surah;
  const data = await (await fetch(dataURL(`data/${surah}.json`))).json();
  const meta = index.find((s) => s.surah === surah);
  document.getElementById('title').textContent = meta?.name || `Surah ${surah}`;
  document.getElementById('meta').textContent =
    `${meta?.ayahs ?? 0} ayat · ${meta?.spans ?? 0} coloured spans · ${[...targets].filter((k) => k.startsWith(`${surah}:`)).length} flagged for review`;
  renderSurah(data);
  renderTargets();
  renderProgress();
  window.scrollTo({ top: 0 });
  history.replaceState(null, '', `#${surah}`);
}

function renderTargets() {
  const here = [...targets].filter((k) => k.startsWith(`${current}:`));
  const holder = document.getElementById('review-targets');
  holder.textContent = '';
  if (!here.length) return;
  const label = document.createElement('span');
  label.textContent = 'Needs review here: ';
  holder.appendChild(label);
  for (const key of here) {
    const ayah = key.split(':')[1];
    const button = document.createElement('button');
    button.textContent = toArabicDigits(ayah);
    const mark = store.get(key);
    if (mark) button.className = mark;
    button.addEventListener('click', () => document.getElementById(`ayah-${ayah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    holder.appendChild(button);
  }
}

function renderList() {
  const list = document.getElementById('list');
  list.textContent = '';
  const filter = document.getElementById('filter').value.trim();
  for (const surah of index) {
    if (filter && !`${surah.surah} ${surah.name}`.includes(filter)) continue;
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = `${surah.surah}. ${surah.name}`;
    if (surah.surah === current) button.className = 'active';
    button.addEventListener('click', () => { document.getElementById('drawer').hidden = true; load(surah.surah); });
    item.appendChild(button);
    list.appendChild(item);
  }
}

function renderLegend() {
  const legend = document.getElementById('legend');
  legend.textContent = '';
  const seen = new Set();
  for (const surah of index) void surah;
  for (const [rule, colour] of Object.entries(COLOURS)) {
    if (seen.has(NAME_GROUP[rule] || rule)) continue;
    seen.add(NAME_GROUP[rule] || rule);
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `<i style="background:${colour}"></i>${NAMES[rule]}`;
    legend.appendChild(chip);
  }
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.innerHTML = '<i class="dotted"></i>rule the app cannot colour';
  legend.appendChild(chip);
}
const NAME_GROUP = { silent: 'grey', hamzat_wasl: 'grey', lam_shamsiyyah: 'grey' };

document.getElementById('export').addEventListener('click', () => {
  const payload = {
    exported: new Date().toISOString(),
    marks: Object.entries(store.all).sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'indopak-review.json';
  link.click();
});

document.getElementById('menu').addEventListener('click', () => {
  const drawer = document.getElementById('drawer');
  drawer.hidden = !drawer.hidden;
});
document.getElementById('filter').addEventListener('input', renderList);
document.getElementById('prev').addEventListener('click', () => current > 1 && load(current - 1));
document.getElementById('next').addEventListener('click', () => current < index.length && load(current + 1));

(async function start() {
  index = await (await fetch(dataURL('data/index.json'))).json();
  try {
    targets = new Set(await (await fetch(dataURL('review-targets.json'))).json());
  } catch { targets = new Set(); }
  const flagged = [...targets].length;
  document.getElementById('summary').textContent =
    `${flagged} ayat flagged for review out of 6,236`;
  renderList();
  renderLegend();
  renderProgress();
  const fromHash = parseInt(location.hash.slice(1), 10);
  await load(Number.isFinite(fromHash) && fromHash >= 1 && fromHash <= 114 ? fromHash : 1);
})();
