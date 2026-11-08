import { h, ic, openSheet, closeSheet, toast } from './util.js';

// Ambil nama dan nomor dari buku telepon HP (Contact Picker API, tersedia di Chrome Android).
// Hanya kontak yang dipilih pengguna yang dibaca.
export const bisaKontak = () => typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window;

// +62 812-3456-7890 -> 081234567890
export function normalNomor(s) {
  let d = String(s || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('62')) d = '0' + d.slice(2);
  else if (d.startsWith('8')) d = '0' + d;
  return d;
}

// Kembalikan [{ nama, nomor: [..unik, sudah dirapikan] }]. Kosong kalau dibatalkan.
export async function ambilKontak(multiple = false) {
  const hasil = await navigator.contacts.select(['name', 'tel'], { multiple });
  return (hasil || []).map((k) => ({
    nama: String((k.name || [])[0] || '').trim(),
    nomor: [...new Set((k.tel || []).map(normalNomor).filter((n) => n.length >= 8))].sort((a, b) => Number(b.startsWith('08')) - Number(a.startsWith('08'))),
  })).filter((k) => k.nama || k.nomor.length);
}

export function cariPelangganNomor(S, nomor) {
  const n = normalNomor(nomor);
  if (!n) return null;
  return S.all('pelanggan').find((p) => normalNomor(p.wa) === n) || null;
}

// Pilih satu kontak, lalu (kalau nomornya lebih dari satu) pilih nomornya.
export async function pilihSatuKontak() {
  let list;
  try { list = await ambilKontak(false); } catch { toast('Buku telepon tidak bisa dibuka di HP ini.'); return null; }
  const k = list[0];
  if (!k) return null;
  if (k.nomor.length <= 1) return { nama: k.nama, nomor: k.nomor[0] || '' };
  return new Promise((res) => {
    let hasil = null;
    openSheet({
      html: `<h2 id="sheet-t">Pilih nomor ${h(k.nama)}</h2><div class="list">${k.nomor.map((n) => `<button class="item" data-act="pilih" data-n="${h(n)}"><div class="av">${ic('phone')}</div><div class="grow t">${h(n)}</div></button>`).join('')}</div>`,
      actions: { pilih: (b) => { hasil = { nama: k.nama, nomor: b.dataset.n }; closeSheet(); } },
      onClose: () => res(hasil),
    });
  });
}

export const tombolKontak = (act, label = 'Ambil dari kontak HP') => bisaKontak() ? `<button type="button" class="btn block" data-act="${act}" style="margin-bottom:14px">${ic('users')}${label}</button>` : '';
