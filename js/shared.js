import { CONFIG } from './config.js';
import { createApi } from './store.js';

export const VERSI_APP = '1.1.1';
const LS = localStorage;

// ---------- Preferensi per HP ----------
export const prefs = {
  get() { try { return { theme: 'pink', mode: 'auto', ...JSON.parse(LS.getItem('bukue:prefs') || '{}') }; } catch { return { theme: 'pink', mode: 'auto' }; } },
  set(p) { LS.setItem('bukue:prefs', JSON.stringify({ ...prefs.get(), ...p })); terapkanTema(); },
};
export function terapkanTema() {
  const p = prefs.get();
  const r = document.documentElement;
  r.dataset.theme = p.theme;
  if (p.mode === 'auto') delete r.dataset.mode; else r.dataset.mode = p.mode;
  const gelap = p.mode === 'dark' || (p.mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', gelap ? '#16131A' : '#FBF8F9');
}

// ---------- Sesi ----------
export const sesi = {
  get() { try { return JSON.parse(LS.getItem('bukue:sesi') || 'null'); } catch { return null; } },
  set(s) { s ? LS.setItem('bukue:sesi', JSON.stringify(s)) : LS.removeItem('bukue:sesi'); },
};
export const webAppUrl = () => CONFIG.webAppUrl || LS.getItem('bukue:url') || '';
export function apiPublik(url = sesi.get()?.url || webAppUrl()) { return createApi(url, () => sesi.get()?.token || ''); }

