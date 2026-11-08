// Penghubung data mentah dengan hitungan. Semua fungsi baca dari store aktif.
import * as C from './calc.js';

const { num } = C;
let S = null;
export const setStore = (s) => (S = s);
export const store = () => S;

export const STATUS = [
  ['baru', 'Baru'], ['konfirmasi', 'Dikonfirmasi'], ['produksi', 'Diproduksi'], ['siap', 'Siap'],
  ['diambil', 'Diambil/Dikirim'], ['selesai', 'Selesai'], ['batal', 'Batal'],
];
export const labelStatus = (k) => (STATUS.find((s) => s[0] === k) || [k, k])[1];
export const CARA = [['ambil', 'Diambil'], ['antar', 'Diantar'], ['kurir', 'Kurir']];
export const SAPAAN = ['Kak', 'Mas', 'Mbak', 'Bu', 'Pak'];
export const SATUAN_PRODUK = ['pcs', 'loyang', 'toples', 'box', 'porsi', 'cup'];

export const today = () => C.ymd(new Date());
export const setelan = () => S.get('setelan', 'toko') || { id: 'toko' };
export function simpanSetelan(patch) { return S.put('setelan', { ...setelan(), ...patch, id: 'toko' }); }

export function bahanMap() {
  const m = {};
  S.all('bahan').forEach((b) => (m[b.id] = b));
  return m;
}
export const barisResep = (resepId) => S.where('resepBahan', 'resepId', resepId).sort((a, b) => num(a.urut) - num(b.urut));
export function hitungResepId(resepId, kali = 1) {
  const r = S.get('resep', resepId);
  if (!r) return null;
  return C.hitungResep(r, barisResep(resepId), bahanMap(), kali);
}

export function varianDari(produkId) { return S.where('varian', 'produkId', produkId).sort((a, b) => num(a.urut) - num(b.urut)); }

// HPP varian: dari resep, atau isian manual, atau harga setor untuk titipan.
export function hppVarian(v, produk) {
  if (!v) return 0;
  const p = produk || S.get('produk', v.produkId);
  if (p && p.jenis === 'titipan') return num(v.hargaSetor);
  if (v.resepId) {
    const h = hitungResepId(v.resepId);
    if (h) return isiVarian(v) * h.hppIsi + kemasanVarian(v, h);
  }
  return num(v.hppManual);
}

// Satu varian berisi berapa satuan hasil resep (misalnya mika isi 8 pcs soes). Data lama = 1.
export const isiVarian = (v) => (v && v.resepId && num(v.isi) > 0 ? num(v.isi) : 1);
// Kemasan per unit varian. Kosong = ikut kemasan per pcs di resep dikali isi.
export function kemasanVarian(v, h) {
  if (v && v.kemasanVarian !== '' && v.kemasanVarian !== undefined && v.kemasanVarian !== null) return num(v.kemasanVarian);
  return (h ? h.kemasan : 0) * isiVarian(v);
}

export function pesananInfo(p) {
  const items = S.where('itemPesanan', 'pesananId', p.id);
  const bayar = S.where('pembayaran', 'pesananId', p.id).sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
  const biaya = S.where('biaya', 'pesananId', p.id);
  const u = C.untungPesanan(p, items, biaya);
  const dibayar = bayar.reduce((s, b) => s + num(b.nominal), 0);
  const sisa = Math.max(u.total - dibayar, 0);
  const pel = p.pelangganId ? S.get('pelanggan', p.pelangganId) : null;
  return { ...u, items, bayar, biayaList: biaya, dibayar, sisa, sb: C.statusBayar(u.total, dibayar), pel };
}

export const namaPel = (pel) => (pel ? pel.nama : 'Tanpa nama');
export const sapaanPel = (pel) => (pel ? (pel.sapaan === undefined || pel.sapaan === null ? setelan().sapaanBawaan ?? 'Kak' : pel.sapaan) : setelan().sapaanBawaan ?? 'Kak');

export function semuaPesanan() {
  return S.all('pesanan').sort((a, b) => String(b.tglPesan).localeCompare(String(a.tglPesan)) || num(b.updatedAt) - num(a.updatedAt));
}

export function kodeBaru() {
  const n = S.all('pesanan').length + 1;
  const d = today().slice(2).replace(/-/g, '');
  return `BK${d}-${String(n).padStart(3, '0')}`;
}

// Tanggal untung diakui: saat Selesai, atau tanggal ambil kalau tglSelesai kosong.
export const tglUntung = (p) => p.tglSelesai || p.tglAmbil || p.tglPesan;

export function laporan(per) {
  const t = today();
  const r = C.rentang(per, t);
  const semua = S.all('pesanan').filter((p) => p.status !== 'batal');
  const selesai = semua.filter((p) => p.status === 'selesai' && C.dalam(tglUntung(p), r));
  let untung = 0, omzetSelesai = 0, pcsSelesai = 0;
  const perProduk = {};
  selesai.forEach((p) => {
    const i = pesananInfo(p);
    untung += i.untung;
    omzetSelesai += i.total;
    pcsSelesai += i.pcs;
    i.items.forEach((it) => {
      const k = it.nama || it.produkId;
      const o = (perProduk[k] = perProduk[k] || { nama: k, qty: 0, untung: 0, omzet: 0 });
      o.qty += num(it.qty);
      o.omzet += num(it.qty) * num(it.harga);
      o.untung += num(it.qty) * (num(it.harga) - num(it.hpp));
    });
  });
  const dibuang = S.all('stokKeluar').filter((k) => k.alasan === 'dibuang' && num(k.nilai) > 0 && C.dalam(k.tanggal, r));
  const rugi = dibuang.reduce((s, k) => s + num(k.nilai), 0);
  untung -= rugi;
  const masuk = semua.filter((p) => C.dalam(p.tglPesan, r));
  const m = { nilai: 0, pcs: 0, pel: new Set(), estUntung: 0, lunas: 0, dp: 0, belum: 0, nLunas: 0, nDp: 0, nBelum: 0 };
  masuk.forEach((p) => {
    const i = pesananInfo(p);
    m.nilai += i.total;
    m.pcs += i.pcs;
    if (p.pelangganId) m.pel.add(p.pelangganId);
    m.estUntung += i.untung;
    if (i.sb === 'lunas') { m.lunas += i.total; m.nLunas++; }
    else if (i.sb === 'dp') { m.dp += i.dibayar; m.belum += i.sisa; m.nDp++; }
    else { m.belum += i.total; m.nBelum++; }
  });
  // Grafik: per bulan untuk tahunan, per hari untuk 7/30, per minggu untuk bulanan
  let grafik = [];
  if (per.jenis === 'tahun') {
    const y = r.dari.slice(0, 4);
    grafik = Array.from({ length: 12 }, (_, k) => ({ k: `${y}-${String(k + 1).padStart(2, '0')}`, v: 0 }));
    selesai.forEach((p) => { const g = grafik.find((x) => tglUntung(p).startsWith(x.k)); if (g) g.v += pesananInfo(p).untung; });
    dibuang.forEach((k) => { const g = grafik.find((x) => k.tanggal.startsWith(x.k)); if (g) g.v -= num(k.nilai); });
  } else if (per.jenis === '7' || per.jenis === '30' || per.jenis === 'bulan') {
    const hari = [];
    for (let d = r.dari; d <= r.sampai && hari.length < 31; d = C.addDays(d, 1)) hari.push({ k: d, v: 0 });
    selesai.forEach((p) => { const g = hari.find((x) => x.k === tglUntung(p)); if (g) g.v += pesananInfo(p).untung; });
    dibuang.forEach((k) => { const g = hari.find((x) => x.k === k.tanggal); if (g) g.v -= num(k.nilai); });
    grafik = hari;
  }
  const produk = Object.values(perProduk);
  return {
    r, untung, rugi, omzetSelesai, pcsSelesai, nSelesai: selesai.length,
    masuk: { ...m, pel: m.pel.size, n: masuk.length },
    grafik,
    laku: [...produk].sort((a, b) => b.qty - a.qty).slice(0, 5),
    cuan: [...produk].sort((a, b) => b.untung - a.untung).slice(0, 5),
  };
}

export function pelangganSetia(n = 5) {
  const agg = {};
  S.all('pesanan').filter((p) => p.status !== 'batal' && p.pelangganId).forEach((p) => {
    const a = (agg[p.pelangganId] = agg[p.pelangganId] || { id: p.pelangganId, n: 0, total: 0 });
    a.n++;
    a.total += pesananInfo(p).total;
  });
  return Object.values(agg).map((a) => ({ ...a, pel: S.get('pelanggan', a.id) })).filter((a) => a.pel).sort((a, b) => b.n - a.n || b.total - a.total).slice(0, n);
}

export function tagihanBerjalan() {
  return S.all('pesanan').filter((p) => p.status !== 'batal').map((p) => ({ p, i: pesananInfo(p) })).filter((x) => x.i.sisa > 0);
}

// Jadwal produksi: total per produk/varian untuk pesanan aktif di tanggal ambil tertentu.
export function jadwal(tanggal) {
  const ps = S.all('pesanan').filter((p) => p.tglAmbil === tanggal && !['batal', 'selesai', 'diambil'].includes(p.status));
  const agg = {};
  ps.forEach((p) => S.where('itemPesanan', 'pesananId', p.id).forEach((it) => {
    const k = it.varianId || it.produkId || it.nama;
    const a = (agg[k] = agg[k] || { nama: it.nama, varianId: it.varianId, produkId: it.produkId, qty: 0 });
    a.qty += num(it.qty);
  }));
  return { pesanan: ps, baris: Object.values(agg).sort((a, b) => a.nama.localeCompare(b.nama)) };
}

// Rencana produksi: varian yang memakai resep yang sama digabung dalam satuan hasil resep (pcs),
// lalu dibulatkan ke jumlah adonan.
export function rencanaProduksi(baris) {
  const bm = bahanMap();
  const per = {}, lain = [];
  baris.forEach((b) => {
    const v = S.get('varian', b.varianId);
    const r = v?.resepId ? S.get('resep', v.resepId) : null;
    if (!r) { lain.push(b); return; }
    const isi = isiVarian(v);
    const g = (per[r.id] = per[r.id] || { resep: r, pcs: 0, varian: [] });
    g.pcs += b.qty * isi;
    g.varian.push({ ...b, isi });
  });
  const resep = Object.values(per).map((g) => {
    const h = C.hitungResep(g.resep, barisResep(g.resep.id), bm, 1);
    const kali = h.hasilBersih > 0 ? Math.ceil(g.pcs / h.hasilBersih - 1e-9) : 0;
    return { ...g, kali, hasilPer: h.hasilBersih, jadi: Math.floor(kali * h.hasilBersih + 1e-9), satuan: g.resep.satuanHasil || 'pcs', hppIsi: h.hppIsi };
  }).sort((a, b) => a.resep.nama.localeCompare(b.resep.nama));
  return { resep, lain };
}

export function belanja(baris) {
  const bm = bahanMap();
  const butuh = {};
  const rp_ = rencanaProduksi(baris);
  rp_.resep.forEach((g) => {
    barisResep(g.resep.id).forEach((rb) => {
      const bahan = bm[rb.bahanId];
      if (!bahan) return;
      const k = rb.bahanId + '|' + rb.satuan;
      const a = (butuh[k] = butuh[k] || { bahan, satuan: rb.satuan, jumlah: 0, biaya: 0 });
      a.jumlah += num(rb.jumlah) * g.kali;
      a.biaya += (C.hargaPerSatuan(bahan, rb.satuan) || 0) * num(rb.jumlah) * g.kali;
    });
  });
  return { baris: Object.values(butuh).sort((a, b) => a.bahan.nama.localeCompare(b.bahan.nama)), tanpaResep: rp_.lain.map((b) => b.nama) };
}

// Resep yang memakai bahan tertentu, untuk info saat harga bahan berubah.
export const resepPakaiBahan = (bahanId) => {
  const ids = new Set(S.where('resepBahan', 'bahanId', bahanId).map((r) => r.resepId));
  return S.all('resep').filter((r) => ids.has(r.id));
};

// Item pesanan belum lunas yang HPP-nya berbeda dari HPP terkini.
export function itemBedaHpp() {
  const out = [];
  S.all('pesanan').filter((p) => p.status !== 'batal').forEach((p) => {
    const i = pesananInfo(p);
    if (i.sb === 'lunas' || p.status === 'selesai') return;
    i.items.forEach((it) => {
      const v = S.get('varian', it.varianId);
      if (!v) return;
      const baru = hppVarian(v);
      if (Math.abs(baru - num(it.hpp)) > 0.5) out.push({ it, p, baru });
    });
  });
  return out;
}

export function jumlahLunas() {
  return S.all('pesanan').filter((p) => p.status !== 'batal' && pesananInfo(p).sb === 'lunas').length;
}

// ---------- Stok ready ----------
// Sisa dihitung dari catatan (bukan disimpan), supaya dua HP tidak saling menimpa angka stok.
export function indexStok() {
  const terjual = {}, keluar = {};
  const ps = {};
  S.all('pesanan').forEach((p) => (ps[p.id] = p));
  S.all('itemPesanan').forEach((it) => {
    const p = ps[it.pesananId];
    if (!p || p.status === 'batal') return;
    if (it.stokId) terjual[it.stokId] = (terjual[it.stokId] || 0) + (num(it.pakai) || num(it.qty));
    ambilList(it).forEach((a) => (terjual[a.id] = (terjual[a.id] || 0) + num(a.pcs)));
  });
  S.all('stokKeluar').forEach((k) => (keluar[k.stokId] = (keluar[k.stokId] || 0) + num(k.jumlah)));
  return { terjual, keluar };
}
export function batchInfo(b, idx = indexStok()) {
  const terjual = idx.terjual[b.id] || 0, keluar = idx.keluar[b.id] || 0;
  return { ...b, terjual, keluar, sisa: Math.max(num(b.jumlah) - terjual - keluar, 0) };
}
export function stokAktif() {
  const idx = indexStok();
  return S.all('stok').map((b) => batchInfo(b, idx)).filter((b) => b.sisa > 0)
    .sort((a, b) => String(a.kedaluwarsa || '9999').localeCompare(String(b.kedaluwarsa || '9999')) || String(a.tanggal).localeCompare(String(b.tanggal)));
}
// Item yang dijual dari stok resep menyimpan daftar pengambilan [{ id, pcs }].
export function ambilList(it) {
  const v = it?.stokAmbil;
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch { return []; }
}

// Grup stok: per resep (dalam satuan hasil, misalnya pcs) atau per varian (titipan, tanpa resep, data lama).
export function stokGrup() {
  const m = {};
  stokAktif().forEach((b) => {
    const key = b.resepId ? 'r:' + b.resepId : 'v:' + b.varianId;
    const g = (m[key] = m[key] || { key, resepId: b.resepId || '', varianId: b.resepId ? '' : b.varianId, produkId: b.produkId || '', nama: b.nama, satuan: b.satuan || '', sisa: 0, batch: [] });
    g.sisa += b.sisa;
    g.batch.push(b);
  });
  return Object.values(m).sort((a, b) => a.nama.localeCompare(b.nama));
}

// Varian yang bisa dijual dari stok, beserta jumlah tersedia dalam unit varian.
export function opsiJual(grup = stokGrup()) {
  const out = [];
  const pool = {};
  grup.filter((g) => g.resepId).forEach((g) => (pool[g.resepId] = g));
  S.all('varian').forEach((v) => {
    const pr = S.get('produk', v.produkId);
    if (!pr) return;
    const gv = grup.find((g) => g.varianId === v.id);
    const isi = isiVarian(v);
    const dariPool = v.resepId && pool[v.resepId] ? Math.floor(pool[v.resepId].sisa / isi + 1e-9) : 0;
    const total = (gv ? gv.sisa : 0) + dariPool;
    if (total > 0) out.push({ varianId: v.id, produkId: pr.id, nama: `${pr.nama} · ${v.nama}`, isi, resepId: v.resepId || '', tersedia: total, harga: num(v.harga), fotoId: pr.fotoId || '' });
  });
  return out.sort((a, b) => a.nama.localeCompare(b.nama));
}

// Ambil stok untuk penjualan: stok khusus varian dulu, lalu stok resep (pcs). FIFO menurut kedaluwarsa.
// items: [{ varianId, qty, harga }]. Kembalikan { ops, total } atau { error }.
export function alokasiStok(items, pesananId) {
  const grup = stokGrup();
  const sisa = {};
  grup.forEach((g) => g.batch.forEach((b) => (sisa[b.id] = b.sisa)));
  const ops = [];
  let total = 0;
  for (const it of items) {
    const v = S.get('varian', it.varianId);
    const pr = v ? S.get('produk', v.produkId) : null;
    if (!v || !pr) return { error: 'Produk tidak ditemukan' };
    const nama = `${pr.nama} · ${v.nama}`;
    let q = num(it.qty);
    const harga = num(it.harga);
    const gv = grup.find((g) => g.varianId === v.id);
    for (const b of gv ? gv.batch : []) {
      if (q <= 0) break;
      const ambil = Math.min(q, sisa[b.id]);
      if (ambil <= 0) continue;
      sisa[b.id] -= ambil;
      q -= ambil;
      total += ambil * harga;
      ops.push(['itemPesanan', { pesananId, produkId: pr.id, varianId: v.id, stokId: b.id, nama, qty: ambil, harga, hpp: num(b.hpp) }]);
    }
    if (q > 0) {
      const gr = v.resepId ? grup.find((g) => g.resepId === v.resepId) : null;
      const isi = isiVarian(v);
      let perlu = q * isi;
      const poolSebelum = gr ? gr.batch.reduce((a, b) => a + sisa[b.id], 0) : 0;
      const ambilan = [];
      let modal = 0;
      for (const b of gr ? gr.batch : []) {
        if (perlu <= 1e-9) break;
        const a = Math.min(perlu, sisa[b.id]);
        if (a <= 0) continue;
        sisa[b.id] -= a;
        perlu -= a;
        modal += a * num(b.hpp);
        ambilan.push({ id: b.id, pcs: Math.round(a * 1000) / 1000 });
      }
      if (perlu > 1e-9) {
        return { error: gr ? `Stok tidak cukup untuk ${nama}. Sisa ${gr.nama} tinggal ${Math.round(poolSebelum * 100) / 100} ${gr.satuan || 'pcs'}.` : `Stok ${nama} tidak cukup.` };
      }
      const h = hitungResepId(v.resepId);
      const hpp = modal / q + kemasanVarian(v, h);
      total += q * harga;
      ops.push(['itemPesanan', { pesananId, produkId: pr.id, varianId: v.id, nama, qty: q, harga, hpp: Math.round(hpp * 100) / 100, stokAmbil: ambilan }]);
    }
  }
  return { ops, total };
}

// Umur simpan untuk stok resep: yang terpendek dari produk yang memakai resep itu.
export function umurResep(resepId) {
  const umur = S.all('varian').filter((v) => v.resepId === resepId).map((v) => num(S.get('produk', v.produkId)?.umurSimpan)).filter((u) => u > 0);
  return umur.length ? Math.min(...umur) : 0;
}
export function batchResep(resepId, tanggal, jumlah, sumber) {
  const r = S.get('resep', resepId);
  const h = hitungResepId(resepId);
  const u = umurResep(resepId);
  return { resepId, varianId: '', produkId: '', nama: r.nama, satuan: r.satuanHasil || 'pcs', tanggal, kedaluwarsa: u ? C.addDays(tanggal, u) : '', jumlah, hpp: Math.round((h?.hppIsi || 0) * 100) / 100, harga: '', sumber };
}

export function stokPerVarian() {
  const m = {};
  stokAktif().forEach((b) => {
    const a = (m[b.varianId] = m[b.varianId] || { varianId: b.varianId, produkId: b.produkId, nama: b.nama, sisa: 0, batch: [], harga: num(b.harga) });
    a.sisa += b.sisa;
    a.batch.push(b);
  });
  return Object.values(m).sort((a, b) => a.nama.localeCompare(b.nama));
}
export function sisaHari(b) {
  if (!b.kedaluwarsa) return null;
  return Math.round((new Date(b.kedaluwarsa + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
}
export const hampirKedaluwarsa = (hari = 1) => stokAktif().filter((b) => b.kedaluwarsa && sisaHari(b) <= hari);
export function tglKedaluwarsa(tanggal, produk) {
  const u = num(produk?.umurSimpan);
  return u > 0 ? C.addDays(tanggal, u) : '';
}

// ---------- Titipan ----------
export function titipanBelumSetor(penitipId) {
  const stok = {};
  S.all('stok').forEach((b) => { if (b.penitipId && (!penitipId || b.penitipId === penitipId)) stok[b.id] = b; });
  const ps = {};
  S.all('pesanan').forEach((p) => (ps[p.id] = p));
  const items = S.all('itemPesanan').filter((it) => it.stokId && stok[it.stokId] && !it.setoranId && ps[it.pesananId] && ps[it.pesananId].status !== 'batal')
    .map((it) => ({ it, b: stok[it.stokId], p: ps[it.pesananId] }));
  const kembali = S.all('stokKeluar').filter((k) => k.alasan === 'dikembalikan' && stok[k.stokId] && !k.setoranId).map((k) => ({ k, b: stok[k.stokId] }));
  const perProduk = {};
  let total = 0, untung = 0, qty = 0;
  items.forEach(({ it }) => {
    const o = (perProduk[it.nama] = perProduk[it.nama] || { nama: it.nama, qty: 0, setor: 0, hargaSetor: num(it.hpp) });
    o.qty += num(it.qty);
    o.setor += num(it.qty) * num(it.hpp);
    total += num(it.qty) * num(it.hpp);
    untung += num(it.qty) * (num(it.harga) - num(it.hpp));
    qty += num(it.qty);
  });
  const tanggal = items.map((x) => x.p.tglPesan).sort();
  return { items, kembali, perProduk: Object.values(perProduk), total, untung, qty, dari: tanggal[0] || '', sampai: tanggal[tanggal.length - 1] || '' };
}

// ---------- Open PO ----------
export function infoOpenPO(po) {
  const kuota = S.where('kuotaPO', 'openPOId', po.id);
  const ps = S.all('pesanan').filter((p) => p.openPOId === po.id && p.status !== 'batal');
  const pakai = {};
  ps.forEach((p) => S.where('itemPesanan', 'pesananId', p.id).forEach((it) => (pakai[it.varianId] = (pakai[it.varianId] || 0) + num(it.qty))));
  const baris = kuota.map((k) => {
    const v = S.get('varian', k.varianId);
    const pr = v ? S.get('produk', v.produkId) : null;
    return { ...k, nama: pr && v ? `${pr.nama} · ${v.nama}` : '(produk dihapus)', harga: num(v?.harga), kuota: num(k.kuota), terpakai: pakai[k.varianId] || 0, sisa: Math.max(num(k.kuota) - (pakai[k.varianId] || 0), 0) };
  });
  return { baris, pesanan: ps, aktif: !po.batas || po.batas >= today() };
}
export const openPOAktif = () => S.all('openPO').filter((po) => !po.batas || po.batas >= today()).sort((a, b) => String(a.batas).localeCompare(String(b.batas)));
