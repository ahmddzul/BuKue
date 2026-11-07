import { num } from './calc.js';

export const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function rp(n) {
  const v = Math.round(num(n));
  const s = 'Rp ' + Math.abs(v).toLocaleString('id-ID');
  return v < 0 ? '-' + s : s;
}
export const angka = (n, d = 0) => num(n).toLocaleString('id-ID', { maximumFractionDigits: d });

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const namaBulan = (i) => BULAN[i];
export const singkatBulan = (i) => BLN[i];
export function tgl(s, { hari = true, tahun = false } = {}) {
  if (!s) return '';
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return String(s);
  return (hari ? HARI[d.getDay()] + ', ' : '') + d.getDate() + ' ' + BLN[d.getMonth()] + (tahun ? ' ' + d.getFullYear() : '');
}
export function tglPanjang(s) {
  const d = new Date(String(s).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return '';
  return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
}
export function relatif(s, today) {
  if (!s) return '';
  const a = new Date(today + 'T00:00:00'), b = new Date(String(s).slice(0, 10) + 'T00:00:00');
  const d = Math.round((b - a) / 86400000);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Besok';
  if (d === -1) return 'Kemarin';
  return tgl(s);
}
export const inisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

// Ikon garis 2px, digambar sendiri. Setiap ikon mewakili benda nyata di dapur atau toko.
const P = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  oven: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><rect x="7" y="12" width="10" height="5" rx="1"/><path d="M7 6.5h.01M11 6.5h.01"/>',
  cake: '<path d="M4 20h16"/><path d="M5 20v-7h14v7"/><path d="M5 16c2.3 1.5 4.7 1.5 7 0s4.7-1.5 7 0"/><path d="M12 13V9"/><path d="M12 6c-1-1 0-2.5 0-3 .3.7 1 2 0 3z"/>',
  more: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  chat: '<path d="M4 18.5l1.4-4A7.5 7.5 0 1 1 9 18z"/><path d="M9 10.5h6M9 13.5h4"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1z"/><path d="M4 7l11-3v3"/><path d="M15 13.5h2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.5-4 4-5.5 7.5-5.5s6 1.5 7.5 5.5"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 19c1-3.4 3.2-5 6-5s5 1.6 6 5"/><path d="M15.5 5.5a3.2 3.2 0 0 1 0 6M17.5 14.5c1.8.6 2.9 2 3.5 4.5"/>',
  sack: '<path d="M8 4h8l-2 3h-4z"/><path d="M10 7c-4 2-6 5.5-6 9a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4c0-3.5-2-7-6-9"/><path d="M9.5 14.5c1.5-1 3.5-1 5 0"/>',
  book: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11"/><path d="M9 8h5M9 11h3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.2M17.6 15.3l2.2 1.2M4.2 16.5l2.2-1.2M17.6 8.7l2.2-1.2"/><circle cx="12" cy="12" r="6.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  insta: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/>',
  coffee: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/>',
  cloudOff: '<path d="M7 18h10a4 4 0 0 0 1.5-.3M20.5 13a4 4 0 0 0-3-3A6 6 0 0 0 9 6.3M6 11a3.5 3.5 0 0 0 1 7"/><path d="M4 4l16 16"/>',
  refresh: '<path d="M19 12a7 7 0 1 1-2-4.9"/><path d="M19 4v4h-4"/>',
  logout: '<path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2M20 14v.01M18 18h2v2M14 20h2"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4 3 2.5L16 12l3 3"/>',
  bank: '<path d="M3 9l9-5 9 5"/><path d="M5 9v8M10 9v8M14 9v8M19 9v8M3 20h18"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  basket: '<path d="M3 10h18l-2 9H5z"/><path d="M8 10l3-6M16 10l-3-6M9 14v2M15 14v2"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.2-1.7-.4-1 .3-2.3 1.5-2.3H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  text: '<path d="M5 6h14M5 11h14M5 16h9"/>',
  hand: '<path d="M6 13c0-4 3-4 3-4V5.5a1.5 1.5 0 0 1 3 0V11l5.5 1.5a2 2 0 0 1 1.4 2.5L17 20H9c-2 0-3-3-3-7z"/>',
};
export const ic = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

// ---------- Toast ----------
let toastT;
export function toast(msg, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastT);
  toastT = setTimeout(() => el.remove(), ms);
}

// ---------- Lembar bawah ----------
// opt: { html, actions, submit, input, onClose }
export function openSheet(opt) {
  closeSheet();
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t"><div class="grab" aria-hidden="true"></div>${opt.html}</div>`;
  const prev = document.activeElement;
  bg._opt = opt;
  bg._prev = prev;
  document.body.appendChild(bg);
  const sheet = bg.querySelector('.sheet');
  bg.addEventListener('click', (e) => {
    if (e.target === bg) return closeSheet();
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'close') return closeSheet();
    opt.actions?.[t.dataset.act]?.(t, e, sheet);
  });
  bg.addEventListener('submit', (e) => { e.preventDefault(); opt.submit?.(e.target, sheet); });
  bg.addEventListener('input', (e) => opt.input?.(e.target, sheet));
  bg.addEventListener('change', (e) => opt.change?.(e.target, sheet));
  bg.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const f = [...sheet.querySelectorAll('button, [href], input, select, textarea')].filter((x) => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  const first = sheet.querySelector('[autofocus], input:not([type=hidden]):not(.sr), select, textarea, button:not(.iconbtn)');
  setTimeout(() => (first || sheet).focus?.(), 60);
  opt.mount?.(sheet);
  return sheet;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.sheet-bg')) closeSheet(); });
export function closeSheet() {
  const bg = document.querySelector('.sheet-bg');
  if (!bg) return;
  bg.remove();
  bg._opt?.onClose?.();
  bg._prev?.focus?.();
}

export function konfirmasi(judul, pesan, { ya = 'Ya', bahaya = false } = {}) {
  return new Promise((res) => {
    let jawab = false;
    openSheet({
      html: `<h2 id="sheet-t">${h(judul)}</h2><p class="muted">${h(pesan)}</p>
        <div class="btns"><button class="btn" data-act="close">Batal</button><button class="btn ${bahaya ? 'danger' : 'pri'}" data-act="ya">${h(ya)}</button></div>`,
      actions: { ya: () => { jawab = true; closeSheet(); } },
      onClose: () => res(jawab),
    });
  });
}

// ---------- Efek ----------
export const kurangiGerak = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function hitungNaik(el, target, fmt = rp) {
  if (!el) return;
  if (kurangiGerak()) { el.textContent = fmt(target); return; }
  const mulai = performance.now(), dur = 700;
  const step = (t) => {
    const k = Math.min((t - mulai) / dur, 1);
    el.textContent = fmt(target * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function konfeti() {
  if (kurangiGerak()) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  c.width = innerWidth * devicePixelRatio;
  c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const x = c.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const warna = [css.getPropertyValue('--acc'), css.getPropertyValue('--acc-2'), css.getPropertyValue('--ink'), '#FFFFFF'];
  const p = Array.from({ length: 70 }, () => ({
    x: c.width / 2, y: c.height * 0.45, vx: (Math.random() - 0.5) * 16 * devicePixelRatio, vy: (-Math.random() * 14 - 4) * devicePixelRatio,
    s: (4 + Math.random() * 5) * devicePixelRatio, r: Math.random() * 6, w: warna[Math.floor(Math.random() * warna.length)],
  }));
  const mulai = performance.now();
  const step = (t) => {
    x.clearRect(0, 0, c.width, c.height);
    p.forEach((q) => {
      q.vy += 0.5 * devicePixelRatio; q.x += q.vx; q.y += q.vy; q.r += 0.2;
      x.save(); x.translate(q.x, q.y); x.rotate(q.r); x.fillStyle = q.w; x.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); x.restore();
    });
    if (t - mulai < 1400) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}

// ---------- Gambar ----------
export function kecilkanGambar(file, maks = 900, mime = 'image/png') {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const k = Math.min(1, maks / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const x = c.getContext('2d');
        x.fillStyle = '#fff';
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL(mime, 0.86));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
export function dataUrlKeFile(dataUrl, nama) {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], nama, { type: mime });
}

export async function salin(teks) {
  try { await navigator.clipboard.writeText(teks); return true; }
  catch {
    const t = document.createElement('textarea');
    t.value = teks; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
    return ok;
  }
}

// 08xx -> 628xx untuk wa.me
export function nomorWa(s) {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}
