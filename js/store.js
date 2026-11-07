// Data disimpan di HP dulu, lalu dikirim lewat antrean yang tahan offline.
import { num } from './calc.js';

export const COLS = ['setelan', 'bahan', 'riwayatHarga', 'resep', 'resepBahan', 'produk', 'varian', 'pelanggan', 'pesanan', 'itemPesanan', 'pembayaran', 'biaya', 'produksi', 'template', 'stok', 'stokKeluar', 'penitip', 'setoran', 'openPO', 'kuotaPO'];

export class AuthError extends Error {}

const isDel = (v) => v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';

export function createStore({ storage, key, api = null, now = () => Date.now(), interval = 90000, onStatus = () => {} }) {
  const listeners = new Set();
  let st = load();
  let flushing = false, pulling = false, timer = null, retry = 0, retryT = null;
  let status = api ? 'idle' : 'local';

  function load() {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw);
        COLS.forEach((c) => (s.data[c] = s.data[c] || {}));
        return s;
      }
    } catch {}
    const data = {};
    COLS.forEach((c) => (data[c] = {}));
    return { data, queue: [], lastPull: 0 };
  }
  function save() { storage.setItem(key, JSON.stringify(st)); }
  function emit(kind) { listeners.forEach((f) => f(kind)); }
  function setStatus(s, info) { status = s; onStatus(s, info); emit('status'); }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  const api_ = {
    get status() { return status; },
    get pending() { return st.queue.length; },
    get lastPull() { return st.lastPull; },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    all(col) { return Object.values(st.data[col] || {}).filter((r) => !isDel(r.deleted)); },
    get(col, id) { const r = st.data[col]?.[id]; return r && !isDel(r.deleted) ? r : null; },
    where(col, field, val) { return api_.all(col).filter((r) => r[field] === val); },
    put(col, row, { silent = false } = {}) {
      const r = { ...row, id: row.id || uid(), updatedAt: Math.max(now(), num(st.data[col]?.[row.id]?.updatedAt) + 1) };
      st.data[col][r.id] = r;
      st.queue.push({ col, row: r });
      save();
      if (!silent) emit('data');
      schedule();
      return r;
    },
    putMany(list) {
      const out = list.map(([col, row]) => api_.put(col, row, { silent: true }));
      emit('data');
      return out;
    },
    remove(col, id) {
      const r = st.data[col]?.[id];
      if (!r) return;
      api_.put(col, { ...r, deleted: true });
    },
    // Isi data contoh tanpa mengantre ke server.
    seed(cols) {
      Object.entries(cols).forEach(([col, rows]) => rows.forEach((r) => (st.data[col][r.id] = { updatedAt: 1, ...r })));
      save();
      emit('data');
    },
    flush,
    pull,
    async sync() { await flush(); await pull(); },
    start() {
      stop();
      if (!api) return;
      timer = setInterval(() => api_.sync(), interval);
      api_.sync();
    },
    stop,
    wipe() { stop(); storage.removeItem(key); st = load(); emit('data'); },
    raw: () => st,
  };

  function stop() { clearInterval(timer); clearTimeout(retryT); timer = null; }

  function schedule() {
    if (!api) return;
    clearTimeout(retryT);
    retryT = setTimeout(flush, 400);
  }

  async function flush() {
    if (!api || flushing || !st.queue.length) return;
    flushing = true;
    setStatus('syncing');
    // Gabungkan perubahan berulang pada baris yang sama, ambil yang terbaru.
    const n = st.queue.length;
    const latest = new Map();
    st.queue.slice(0, n).forEach((op) => latest.set(op.col + ':' + op.row.id, op));
    try {
      await api.push([...latest.values()]);
      st.queue = st.queue.slice(n);
      save();
      retry = 0;
      setStatus(st.queue.length ? 'syncing' : 'ok');
      flushing = false;
      if (st.queue.length) return flush();
    } catch (e) {
      flushing = false;
      if (e instanceof AuthError) return setStatus('auth', e.message);
      retry = Math.min(retry + 1, 6);
      setStatus('offline', e.message);
      clearTimeout(retryT);
      retryT = setTimeout(flush, Math.min(2000 * 2 ** retry, 60000));
    }
  }

  async function pull() {
    if (!api || pulling) return;
    pulling = true;
    try {
      const res = await api.pull(st.lastPull);
      const pending = new Set(st.queue.map((op) => op.col + ':' + op.row.id));
      let berubah = 0;
      Object.entries(res.data || {}).forEach(([col, rows]) => {
        if (!st.data[col]) return;
        rows.forEach((r) => {
          if (pending.has(col + ':' + r.id)) return;
          const lokal = st.data[col][r.id];
          if (lokal && num(lokal.updatedAt) > num(r.updatedAt)) return;
          const bersih = { ...r, updatedAt: num(r.updatedAt), deleted: isDel(r.deleted) };
          delete bersih._ts;
          st.data[col][r.id] = bersih;
          berubah++;
        });
      });
      st.lastPull = num(res.now) || st.lastPull;
      save();
      if (!st.queue.length) setStatus('ok');
      if (berubah) emit('data');
    } catch (e) {
      if (e instanceof AuthError) setStatus('auth', e.message);
      else setStatus('offline', e.message);
    } finally { pulling = false; }
  }

  return api_;
}

export function createApi(url, getToken, fetchFn = (...a) => fetch(...a)) {
  async function call(action, body = {}) {
    let res;
    try {
      res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: getToken(), ...body }),
        redirect: 'follow',
      });
    } catch {
      throw new Error('Tidak ada koneksi');
    }
    let j;
    try { j = await res.json(); } catch { throw new Error('Balasan server tidak terbaca. Cek link Web App.'); }
    if (!j.ok) {
      if (j.error === 'sesi') throw new AuthError(j.pesan || 'Sesi berakhir');
      const e = new Error(j.pesan || j.error || 'Gagal');
      e.kode = j.error;
      throw e;
    }
    return j;
  }
  return {
    call,
    push: (ops) => call('push', { ops }),
    pull: (since) => call('pull', { since }),
  };
}
