import { h, ic, rp } from '../util.js';
import { num } from '../calc.js';
import { labelStatus } from '../data.js';

// Chip pilihan tunggal. Ketuk lagi untuk membatalkan (kembali ke bawaan kalau ada).
export function chips(name, opsi, nilai, { bawaan = '', label = '', wrap = true } = {}) {
  return `<div class="chips ${wrap ? 'wrapc' : ''}" role="group" ${label ? `aria-label="${h(label)}"` : ''} data-chipgroup="${h(name)}" data-default="${h(bawaan)}">
    <input type="hidden" name="${h(name)}" value="${h(nilai ?? '')}">
    ${opsi.map(([v, l]) => `<button type="button" class="chip" data-chip="${h(v)}" aria-pressed="${String(v) === String(nilai ?? '')}">${h(l)}</button>`).join('')}
  </div>`;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-chip]');
  if (!b) return;
  const g = b.closest('[data-chipgroup]');
  if (!g) return;
  const inp = g.querySelector('input[type=hidden]');
  const aktif = b.getAttribute('aria-pressed') === 'true';
  const val = aktif ? g.dataset.default || '' : b.dataset.chip;
  g.querySelectorAll('[data-chip]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.chip === val && val !== '')));
  inp.value = val;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.dispatchEvent(new Event('change', { bubbles: true }));
});

export const field = (label, input, { hint = '', id = '' } = {}) =>
  `<div class="field">${label ? `<label ${id ? `for="${id}"` : ''}>${h(label)}</label>` : ''}${input}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;

export const money = (name, value, { id = name, placeholder = '0', attrs = '' } = {}) =>
  `<div class="money"><input type="number" inputmode="numeric" min="0" step="any" id="${h(id)}" name="${h(name)}" value="${value === '' || value === undefined || value === null ? '' : h(num(value))}" placeholder="${placeholder}" ${attrs}></div>`;

export function kosong(icon, judul, teks, tombol = '') {
  return `<div class="empty">${ic(icon)}<div><b>${h(judul)}</b></div><p>${h(teks)}</p>${tombol}</div>`;
}

export function tagBayar(sb) {
  if (sb === 'lunas') return '<span class="tag ok">Lunas</span>';
  if (sb === 'dp') return '<span class="tag warn">DP</span>';
  return '<span class="tag bad">Belum bayar</span>';
}
export function tagStatus(s) {
  const cls = s === 'selesai' ? 'ok' : s === 'batal' ? 'dim' : s === 'siap' ? 'acc' : 'dim';
  return `<span class="tag ${cls}">${h(labelStatus(s))}</span>`;
}

export const kv = (k, v, cls = '') => `<div class="kv ${cls}"><span>${k}</span><b class="num">${v}</b></div>`;
export const rpTag = (n) => `<span class="num">${rp(n)}</span>`;

export function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => {
    if (k.endsWith('[]')) (o[k.slice(0, -2)] = o[k.slice(0, -2)] || []).push(v);
    else o[k] = typeof v === 'string' ? v.trim() : v;
  });
  return o;
}
