// Foto produk: disimpan di HP (IndexedDB) supaya cepat dan bisa offline, dan di Drive untuk HP lain.
const mem = new Map();
const gagal = new Set();
let dbP = null, onSiap = () => {}, api = null, antre = Promise.resolve();

function db() {
  if (dbP) return dbP;
  dbP = new Promise((res) => {
    try {
      const r = indexedDB.open('bukue', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('foto');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
  return dbP;
}
async function tulis(id, data) {
  const d = await db();
  if (!d) return;
  await new Promise((res) => { const t = d.transaction('foto', 'readwrite'); t.objectStore('foto').put(data, id); t.oncomplete = res; t.onerror = res; });
}
async function bacaSemua() {
  const d = await db();
  if (!d) return;
  await new Promise((res) => {
    const t = d.transaction('foto', 'readonly');
    const c = t.objectStore('foto').openCursor();
    c.onsuccess = () => { const k = c.result; if (k) { mem.set(k.key, k.value); k.continue(); } else res(); };
    c.onerror = res;
  });
}

export async function mulaiFoto({ apiAkun, ketikaSiap }) {
  api = apiAkun;
  onSiap = ketikaSiap;
  await bacaSemua();
  onSiap();
}

let tRender = null;
const renderNanti = () => { clearTimeout(tRender); tRender = setTimeout(() => onSiap(), 150); };

// Kembalikan foto kalau sudah ada di HP; kalau belum, ambil dari Drive di belakang layar.
export function fotoUrl(id) {
  if (!id) return '';
  if (mem.has(id)) return mem.get(id);
  if (api && !gagal.has(id) && !String(id).startsWith('lokal-')) {
    gagal.add(id);
    antre = antre.then(async () => {
      try {
        const r = await api.call('file', { id });
        const data = `data:${r.mime};base64,${r.base64}`;
        mem.set(id, data);
        await tulis(id, data);
        gagal.delete(id);
        renderNanti();
      } catch {}
    });
  }
  return '';
}

export async function simpanFoto(dataUrl) {
  let id = 'lokal-' + Date.now().toString(36);
  if (api) {
    const r = await api.call('unggah', { nama: 'produk.jpg', mime: 'image/jpeg', base64: dataUrl.split(',')[1] });
    id = r.id;
  }
  mem.set(id, dataUrl);
  await tulis(id, dataUrl);
  return id;
}
