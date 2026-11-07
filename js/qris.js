// Gambar QRIS: disimpan di HP (cepat dan bisa offline) dan di folder Drive milik pengguna (untuk HP lain).
import * as D from './data.js';

const kunci = () => 'bukue:qris:' + (JSON.parse(localStorage.getItem('bukue:sesi') || '{}').akun?.username || 'coba');
export function qrisLokal() { try { return JSON.parse(localStorage.getItem(kunci()) || 'null'); } catch { return null; } }
export function simpanQrisLokal(id, data) {
  if (data) localStorage.setItem(kunci(), JSON.stringify({ id, data }));
  else localStorage.removeItem(kunci());
}

let jalan = false;
export async function pastikanQris(api) {
  if (!api || jalan) return;
  const id = D.setelan().qrisFileId;
  const lok = qrisLokal();
  if (!id) return;
  if (lok?.id === id) return;
  jalan = true;
  try {
    const r = await api.call('file', { id });
    simpanQrisLokal(id, `data:${r.mime};base64,${r.base64}`);
  } catch {} finally { jalan = false; }
}
