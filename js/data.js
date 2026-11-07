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
    if (h) return h.hppPcs;
  }
  return num(v.hppManual);
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
  } else if (per.jenis === '7' || per.jenis === '30' || per.jenis === 'bulan') {
    const hari = [];
    for (let d = r.dari; d <= r.sampai && hari.length < 31; d = C.addDays(d, 1)) hari.push({ k: d, v: 0 });
    selesai.forEach((p) => { const g = hari.find((x) => x.k === tglUntung(p)); if (g) g.v += pesananInfo(p).untung; });
    grafik = hari;
  }
  const produk = Object.values(perProduk);
  return {
    r, untung, omzetSelesai, pcsSelesai, nSelesai: selesai.length,
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

// Kebutuhan bahan dari jadwal: per varian yang punya resep, adonan dibulatkan ke atas.
export function belanja(baris) {
  const bm = bahanMap();
  const butuh = {};
  const tanpaResep = [];
  baris.forEach((b) => {
    const v = S.get('varian', b.varianId);
    const r = v?.resepId ? S.get('resep', v.resepId) : null;
    if (!r) { tanpaResep.push(b.nama); return; }
    const per = C.hitungResep(r, barisResep(r.id), bm, 1);
    const kali = per.hasilBersih > 0 ? Math.ceil(b.qty / per.hasilBersih) : 0;
    barisResep(r.id).forEach((rb) => {
      const bahan = bm[rb.bahanId];
      if (!bahan) return;
      const k = rb.bahanId + '|' + rb.satuan;
      const a = (butuh[k] = butuh[k] || { bahan, satuan: rb.satuan, jumlah: 0, biaya: 0 });
      a.jumlah += num(rb.jumlah) * kali;
      a.biaya += (C.hargaPerSatuan(bahan, rb.satuan) || 0) * num(rb.jumlah) * kali;
    });
  });
  return { baris: Object.values(butuh).sort((a, b) => a.bahan.nama.localeCompare(b.bahan.nama)), tanpaResep };
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
