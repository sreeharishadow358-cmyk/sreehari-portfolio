// Colour grades. CSS tokens live in style.css under [data-grade=...];
// this file holds the matching 3D palette and the picker UI, and broadcasts 'gradechange'.
export const GRADES = {
  violet: {
    name: 'Violet Noir', sw: ['#a66bff', '#ff5fd2', '#07050d'],
    bg: 0x07050d, bg2: 0x0e0a1a, fog: 0x07050d, floor: 0x0c0818, gridA: 0x2a1d48, gridB: 0x160f2a,
    shell: 0xeee9fb, dark: 0x1b1430, acc: 0xa66bff, acc2: 0xff5fd2, ok: 0x5cf2b0, rim: 0xa66bff, fill: 0xff5fd2,
    css: { acc: '#a66bff', acc2: '#ff5fd2', accInk: '#0b0614', bg: '#07050d', card: '#0e0a1a', text: '#f3eeff', mute: '#9a8fb8' }, light: false,
  },
  amethyst: {
    name: 'Royal Amethyst', sw: ['#e8c27a', '#b98cff', '#1c0b38'],
    bg: 0x14082a, bg2: 0x1d0d3b, fog: 0x14082a, floor: 0x1a0c34, gridA: 0x3b2170, gridB: 0x26144a,
    shell: 0xf4efff, dark: 0x2a1650, acc: 0xe8c27a, acc2: 0xb98cff, ok: 0x7df0c0, rim: 0xb98cff, fill: 0xe8c27a,
    css: { acc: '#e8c27a', acc2: '#b98cff', accInk: '#1a0f02', bg: '#14082a', card: '#1d0d3b', text: '#fbf6ff', mute: '#b3a2d6' }, light: false,
  },
  ultra: {
    name: 'Ultraviolet', sw: ['#8f5bff', '#5b2bff', '#000000'],
    bg: 0x000000, bg2: 0x07050c, fog: 0x000000, floor: 0x050309, gridA: 0x24164a, gridB: 0x100a1f,
    shell: 0xe6e1f2, dark: 0x120d22, acc: 0x8f5bff, acc2: 0x5b2bff, ok: 0x5cf2b0, rim: 0x8f5bff, fill: 0x3a1fb0,
    css: { acc: '#8f5bff', acc2: '#5b2bff', accInk: '#ffffff', bg: '#000000', card: '#07050c', text: '#ece8ff', mute: '#857ca3' }, light: false,
  },
  plum: {
    name: 'Plum Lilac', sw: ['#d7b8ff', '#ff7ab6', '#170a17'],
    bg: 0x120812, bg2: 0x1b0d1c, fog: 0x120812, floor: 0x180b19, gridA: 0x3c2040, gridB: 0x24132a,
    shell: 0xfbf3ff, dark: 0x2a1530, acc: 0xd7b8ff, acc2: 0xff7ab6, ok: 0x8cf0c4, rim: 0xd7b8ff, fill: 0xff7ab6,
    css: { acc: '#d7b8ff', acc2: '#ff7ab6', accInk: '#1a0b1f', bg: '#120812', card: '#1b0d1c', text: '#fff6fd', mute: '#b39bb8' }, light: false,
  },
};

const KEY = 'shg-grade';
export function currentKey() { return document.documentElement.dataset.grade in GRADES ? document.documentElement.dataset.grade : 'ultra'; }
export function current() { return GRADES[currentKey()]; }
export function onGrade(fn) { addEventListener('gradechange', e => fn(e.detail)); }

export function setGrade(key) {
  if (!(key in GRADES)) return;
  document.documentElement.dataset.grade = key;
  try { localStorage.setItem(KEY, key); } catch {}
  document.querySelectorAll('.grade__sw').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === key)));
  const lab = document.getElementById('gradeName'); if (lab) lab.textContent = GRADES[key].name;
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = GRADES[key].css.bg;
  dispatchEvent(new CustomEvent('gradechange', { detail: GRADES[key] }));
}

// picker
{
  const host = document.getElementById('grade');
  if (host && !host.dataset.ready) {
    host.dataset.ready = '1';
    host.innerHTML = `<span class="grade__lbl">Colour grade</span>` + Object.entries(GRADES).map(([k, g]) =>
      `<button class="grade__sw" type="button" data-k="${k}" aria-pressed="false" aria-label="${g.name}" title="${g.name}" style="--a:${g.sw[0]};--b:${g.sw[1]};--c:${g.sw[2]}"></button>`).join('') +
      `<span class="grade__name" id="gradeName"></span>`;
    host.addEventListener('click', e => { const b = e.target.closest('.grade__sw'); if (b) setGrade(b.dataset.k); });
    setGrade(currentKey());
  }
}
