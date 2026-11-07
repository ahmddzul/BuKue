import { createStore } from './store.js';
import { prefs, terapkanTema, sesi, apiPublik } from './shared.js';
import { pastikanQris } from './qris.js';
import * as D from './data.js';
import { h, ic, toast, closeSheet, openSheet } from './util.js';
import { dataContoh } from './seed.js';
import { views as V_HOME } from './views/home.js';
import { views as V_ORDERS } from './views/orders.js';
import { views as V_PROD } from './views/products.js';
import { views as V_MORE } from './views/more.js';
import { views as V_PRODUKSI } from './views/production.js';
import { authView } from './views/auth.js';
import { views as V_STOK } from './views/stok.js';
import { views as V_PO } from './views/openpo.js';
import { tampilkanSplash } from './splash.js';
import { mulaiFoto } from './foto.js';

const LS = localStorage;
const views = { ...V_HOME, ...V_ORDERS, ...V_PROD, ...V_MORE, ...V_PRODUKSI, ...V_STOK, ...V_PO };
const TABS = [
  ['home', 'Beranda', 'home'],
  ['orders', 'Pesanan', 'receipt'],
  ['produksi', 'Produksi', 'oven'],
  ['products', 'Produk', 'cake'],
  ['more', 'Lainnya', 'more'],
];

// ---------- Navigasi ----------
const nav = { tab: 'home', stack: [] };
const cur = () => nav.stack[nav.stack.length - 1] || { name: nav.tab, params: {} };
let S = null;
let current = null;

export const ctx = {
  go(name, params = {}) {
    closeSheet();
    nav.stack.push({ name, params });
    history.pushState({ d: nav.stack.length }, '');
    render(true);
  },
  replace(name, params = {}) {
    nav.stack[nav.stack.length - 1] = { name, params };
    render(true);
  },
  back() { if (nav.stack.length) history.back(); },
  tab(name) {
    closeSheet();
    const depth = nav.stack.length;
    nav.tab = name;
    nav.stack = [];
    if (depth) { ignorePop = true; history.go(-depth); }
    render(true);
  },
  backN(n) {
    n = Math.min(n, nav.stack.length);
    if (!n) return;
    nav.stack = nav.stack.slice(0, -n);
    ignorePop = true;
    history.go(-n);
    render(true);
  },
  rerender: () => render(false),
  get S() { return S; },
  get demo() { return sesi.get()?.mode === 'coba'; },
  get akun() { return sesi.get()?.akun || null; },
  keluar,
  mulaiAkun,
  mulaiCoba,
};
let ignorePop = false;
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; return; }
  if (document.querySelector('.sheet-bg')) { closeSheet(); history.pushState({ d: nav.stack.length }, ''); return; }
  if (nav.stack.length) { nav.stack.pop(); render(true); }
});

const $view = () => document.getElementById('view');

function render(scrollTop) {
  const app = document.getElementById('app');
  if (!S) { renderAuth(); return; }
  const c = cur();
  const v = views[c.name] || views.home;
  const masuk = scrollTop && (current?.v !== v || current?.params !== c.params);
  current = { v, params: c.params };
  if (masuk) v.enter?.(c.params, ctx);
  if (!app.querySelector('.nav')) {
    app.innerHTML = `
      <header class="top"></header>
      <main id="view" tabindex="-1"></main>
      <div id="fab-slot"></div>
      <nav class="nav" aria-label="Menu utama">${TABS.map(([k, l, i]) => `<button data-tab="${k}"><span class="ico">${ic(i)}</span>${l}</button>`).join('')}</nav>`;
    bindShell(app);
  }
  renderTop();
  app.querySelectorAll('.nav button').forEach((b) => (b.getAttribute('data-tab') === nav.tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  const view = $view();
  const html = v.render(c.params, ctx);
  view.innerHTML = `<div class="wrap ${scrollTop ? 'page-in' : ''}">${html}</div>`;
  const fab = typeof v.fab === 'function' ? v.fab(c.params, ctx) : v.fab;
  app.querySelector('#fab-slot').innerHTML = fab ? `<button class="fab" data-shell="fab" aria-label="${h(fab.label)}">${ic(fab.icon || 'plus')}</button>` : '';
  if (scrollTop) view.scrollTop = 0;
  v.mount?.(view, c.params, ctx);
}

function renderTop() {
  const app = document.getElementById('app');
  const top = app?.querySelector('.top');
  if (!top || !current) return;
  const c = cur();
  const back = nav.stack.length > 0;
  const title = typeof current.v.title === 'function' ? current.v.title(c.params, ctx) : current.v.title;
  const st = S.status;
  const syncTxt = ctx.demo ? 'Mode coba' : st === 'offline' ? 'Offline' : st === 'syncing' ? 'Menyimpan' : S.pending ? `${S.pending} antre` : 'Tersimpan';
  const syncIco = ctx.demo ? 'phone' : st === 'offline' ? 'cloudOff' : 'cloud';
  top.innerHTML = `
    ${back ? `<button class="iconbtn" data-shell="back" aria-label="Kembali">${ic('back')}</button>` : ''}
    <h1>${h(title)}</h1>
    <button class="iconbtn sync" data-shell="sync" style="width:auto;padding:0 8px" aria-label="Status simpan: ${syncTxt}. Ketuk untuk sinkron sekarang">${ic(syncIco)}<span>${syncTxt}</span></button>`;
}

// Dipasang sekali saja. #app tetap elemen yang sama walau isinya diganti (masuk, keluar, mode coba).
function bindShell(app) {
  if (app.dataset.bound) return;
  app.dataset.bound = '1';
  app.addEventListener('click', (e) => {
    if (!S || !current) return;
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      const t = tabBtn.dataset.tab;
      if (t === nav.tab && !nav.stack.length) { $view().scrollTo({ top: 0, behavior: 'smooth' }); return; }
      ctx.tab(t);
      return;
    }
    const sh = e.target.closest('[data-shell]');
    if (sh) {
      const a = sh.dataset.shell;
      if (a === 'back') ctx.back();
      if (a === 'sync') { if (ctx.demo) toast('Mode coba: data hanya di HP ini.'); else { toast('Menyinkronkan…'); S.sync(); } }
      if (a === 'fab') { const f = typeof current.v.fab === 'function' ? current.v.fab(current.params, ctx) : current.v.fab; f?.go ? ctx.go(f.go, f.params || {}) : current.v.actions?.[f.act]?.(sh, e, ctx); }
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go && $view().contains(go)) {
      e.preventDefault();
      const params = { ...go.dataset };
      delete params.go;
      ctx.go(go.dataset.go, params);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act && $view().contains(act)) current.v.actions?.[act.dataset.act]?.(act, e, ctx);
  });
  app.addEventListener('submit', (e) => {
    if (!S || !current || !$view().contains(e.target)) return;
    e.preventDefault();
    // Cegah tersimpan dua kali karena ketukan ganda.
    const f = e.target;
    if (f._kirim && Date.now() - f._kirim < 1200) return;
    f._kirim = Date.now();
    current.v.submit?.(f, ctx, e);
  });
  app.addEventListener('input', (e) => { if (S && current && $view().contains(e.target)) current.v.input?.(e.target, ctx); });
  app.addEventListener('change', (e) => { if (S && current && $view().contains(e.target)) current.v.change?.(e.target, ctx); });
}

function renderAuth() {
  const app = document.getElementById('app');
  app.innerHTML = `<main id="view" tabindex="-1"><div class="wrap"></div></main>`;
  authView(app.querySelector('.wrap'), ctx);
}

// ---------- Mulai ----------
function bukaStore(s) {
  S?.stop();
  const key = 'bukue:data:' + (s.mode === 'coba' ? 'coba' : s.akun.username);
  const api = s.mode === 'coba' ? null : apiPublik(s.url);
  S = createStore({
    storage: LS, key, api,
    onStatus: (st, info) => {
      if (st === 'auth') sesiBerakhir(info);
    },
  });
  D.setStore(S);
  S.on((kind) => {
    if (kind === 'data' && s.mode === 'akun') pastikanQris(apiPublik(s.url));
    if (!current) return;
    if (kind === 'data' && (current.v.form || document.querySelector('.sheet-bg'))) return;
    if (kind === 'status') { renderTop(); return; }
    render(false);
  });
  S.start();
  mulaiFoto({
    apiAkun: s.mode === 'coba' ? null : apiPublik(s.url),
    ketikaSiap: () => { if (current && !current.v.form && !document.querySelector('.sheet-bg')) render(false); },
  });
}

export function mulaiAkun({ url, token, akun }) {
  sesi.set({ mode: 'akun', url, token, akun });
  nav.tab = 'home';
  nav.stack = [];
  bukaStore(sesi.get());
  document.getElementById('app').innerHTML = '';
  render(true);
}
export function mulaiCoba() {
  sesi.set({ mode: 'coba' });
  bukaStore(sesi.get());
  if (!S.all('pesanan').length) S.seed(dataContoh());
  nav.tab = 'home';
  nav.stack = [];
  document.getElementById('app').innerHTML = '';
  render(true);
}
async function keluar({ hapusLokal = false } = {}) {
  const s = sesi.get();
  if (s?.mode === 'akun') { try { await apiPublik(s.url).call('keluar'); } catch {} }
  if (hapusLokal || s?.mode === 'coba') S?.wipe();
  S?.stop();
  S = null;
  current = null;
  sesi.set(null);
  nav.stack = [];
  nav.tab = 'home';
  render(true);
}
function sesiBerakhir(info) {
  const s = sesi.get();
  if (!s || s.mode !== 'akun') return;
  S?.stop();
  openSheet({
    html: `<h2 id="sheet-t">Perlu masuk lagi</h2><p class="muted">${h(info || 'Sesi di HP ini sudah berakhir.')} Data yang belum terkirim tetap aman di HP ini dan akan dikirim setelah masuk.</p>
      <button class="btn pri block" data-act="masuk">Masuk lagi</button>`,
    actions: { masuk: () => { closeSheet(); S = null; current = null; sesi.set({ ...s, token: '' }); render(true); } },
  });
}

// ---------- Tinggi layar iPhone ----------
function aturTinggi() {
  document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px');
  window.scrollTo(0, 0);
}
['resize', 'orientationchange', 'pageshow'].forEach((ev) => window.addEventListener(ev, aturTinggi));
document.addEventListener('focusout', () => setTimeout(aturTinggi, 120));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    aturTinggi();
    if (S && !ctx.demo) S.sync();
    window.__swReg?.update?.();
  }
});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', terapkanTema);

// ---------- Service worker ----------
function kartuUpdate(reg) {
  if (document.querySelector('.update-card')) return;
  const el = document.createElement('div');
  el.className = 'update-card';
  el.setAttribute('role', 'alert');
  el.innerHTML = `<div class="grow"><b>Versi baru tersedia</b><div class="small muted">Muat ulang untuk memakai pembaruan.</div></div><button class="btn pri sm">Muat ulang</button>`;
  el.querySelector('button').onclick = () => {
    if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
    else location.reload();
  };
  document.body.appendChild(el);
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    window.__swReg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) kartuUpdate(reg);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) kartuUpdate(reg); });
    });
    setInterval(() => reg.update(), 30 * 60 * 1000);
  }).catch(() => {});
}

// ---------- Boot ----------
terapkanTema();
aturTinggi();
history.replaceState({ d: 0 }, '');
const awal = sesi.get();
if (awal && (awal.mode === 'coba' || (awal.mode === 'akun' && awal.token))) bukaStore(awal);
render(true);
if (prefs.get().splash !== false) tampilkanSplash(S ? (D.setelan().namaPemilik || '').trim() : '');
