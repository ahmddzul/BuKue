// Hitungan murni (tanpa DOM), supaya bisa diuji di Node.

export const num = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const UNITS = ['kg', 'g', 'l', 'ml', 'butir', 'pcs', 'pack', 'sdm', 'sdt'];
export const UNIT_LABEL = { kg: 'kg', g: 'g', l: 'L', ml: 'ml', butir: 'butir', pcs: 'pcs', pack: 'pack', sdm: 'sdm', sdt: 'sdt' };
const DIM = { kg: ['m', 1000], g: ['m', 1], l: ['v', 1000], ml: ['v', 1] };
const COUNT = ['butir', 'pcs', 'pack'];

// Isi kemasan dalam satuan dasar (g, ml, atau hitungan).
function baseOf(bahan) {
  const u = bahan.satuan;
  if (DIM[u]) return { dim: DIM[u][0], qty: num(bahan.isi) * DIM[u][1] };
  return { dim: u, qty: num(bahan.isi) };
}

// Harga per 1 satuan pakai. null kalau satuannya tidak bisa dikonversi.
export function hargaPerSatuan(bahan, unit) {
  if (!bahan) return null;
  const harga = num(bahan.harga);
  const b = baseOf(bahan);
  if (!(b.qty > 0)) return null;
  const perBase = harga / b.qty;
  if (DIM[unit]) {
    if (DIM[unit][0] === b.dim) return perBase * DIM[unit][1];
    return null;
  }
  if (unit === 'sdm' || unit === 'sdt') {
    const berat = num(unit === 'sdm' ? bahan.beratSdm : bahan.beratSdt);
    if (berat > 0 && (b.dim === 'm' || b.dim === 'v')) return perBase * berat;
    return null;
  }
  if (COUNT.includes(unit)) {
    if (b.dim === unit) return perBase;
    const isiButir = num(bahan.isiButir);
    if (isiButir > 0) return harga / isiButir;
    return null;
  }
  return null;
}

// Satuan pakai yang masuk akal untuk sebuah bahan.
export function satuanPakai(bahan) {
  if (!bahan) return UNITS;
  return UNITS.filter((u) => hargaPerSatuan(bahan, u) !== null);
}

export function labelHargaDasar(bahan) {
  const b = baseOf(bahan);
  if (b.dim === 'm') return { unit: 'g', harga: hargaPerSatuan(bahan, 'g') };
  if (b.dim === 'v') return { unit: 'ml', harga: hargaPerSatuan(bahan, 'ml') };
  return { unit: b.dim, harga: hargaPerSatuan(bahan, b.dim) };
}

// resep: { hasil, susut, kemasan, gasMode: 'persen'|'rp', gasNilai, tenaga }
// baris: [{ bahanId, jumlah, satuan }]
export function hitungResep(resep, baris, bahanById, kali = 1) {
  const detail = [];
  let biayaBahan = 0;
  let masalah = 0;
  for (const r of baris) {
    const bahan = bahanById[r.bahanId];
    const p = hargaPerSatuan(bahan, r.satuan);
    const jumlah = num(r.jumlah) * kali;
    const biaya = p === null ? 0 : p * jumlah;
    if (p === null) masalah++;
    biayaBahan += biaya;
    detail.push({ ...r, nama: bahan ? bahan.nama : '(bahan dihapus)', jumlah, biaya, ok: p !== null });
  }
  const gasNilai = num(resep.gasNilai);
  const gas = resep.gasMode === 'rp' ? gasNilai * kali : (biayaBahan * gasNilai) / 100;
  const tenaga = num(resep.tenaga) * kali;
  const hasilKotor = num(resep.hasil) * kali;
  const susut = Math.min(Math.max(num(resep.susut), 0), 90);
  const hasilBersih = hasilKotor * (1 - susut / 100);
  const kemasan = num(resep.kemasan);
  const biayaAdonan = biayaBahan + gas + tenaga;
  const hppPcs = hasilBersih > 0 ? biayaAdonan / hasilBersih + kemasan : 0;
  return {
    detail, biayaBahan, gas, tenaga, hasilKotor, hasilBersih, kemasan,
    biayaKemasan: kemasan * hasilBersih,
    totalBiaya: biayaAdonan + kemasan * hasilBersih,
    hppPcs, masalah,
  };
}

export function bulatkan(n, ke) {
  const k = num(ke) || 1;
  return Math.ceil(n / k) * k;
}

// Saran harga: margin % dari harga jual, atau markup Rp di atas HPP.
export function saranHarga(hpp, { mode = 'margin', nilai = 40, bulat = 500 } = {}) {
  if (!(hpp > 0)) return 0;
  let h;
  if (mode === 'markup') h = hpp + num(nilai);
  else {
    const m = Math.min(num(nilai), 95);
    h = hpp / (1 - m / 100);
  }
  return bulatkan(h, bulat);
}

// Simulasi: mau buat N pcs. Kembalikan kali adonan (dibulatkan ke atas, bisa ditambah).
export function simulasi(resep, baris, bahanById, targetPcs, tambahAdonan = 0, hargaJual = 0) {
  const per = hitungResep(resep, baris, bahanById, 1);
  const bersihPer = per.hasilBersih;
  let kali = bersihPer > 0 ? Math.ceil(num(targetPcs) / bersihPer) : 0;
  kali = Math.max(kali + num(tambahAdonan), 0);
  const h = hitungResep(resep, baris, bahanById, kali);
  const jadi = h.hasilBersih;
  const jual = num(hargaJual);
  return { kali, ...h, jadi, omzet: jual * jadi, untung: (jual - h.hppPcs) * jadi };
}

// ---------- Pesanan ----------
export function totalPesanan(p, items) {
  const sub = items.reduce((s, it) => s + num(it.qty) * num(it.harga), 0);
  const total = Math.max(sub - num(p.diskon) + num(p.ongkir), 0);
  const modal = items.reduce((s, it) => s + num(it.qty) * num(it.hpp), 0);
  const pcs = items.reduce((s, it) => s + num(it.qty), 0);
  return { sub, total, modal, pcs };
}

export function statusBayar(total, dibayar) {
  if (total <= 0) return dibayar > 0 ? 'lunas' : 'belum';
  if (dibayar >= total - 0.5) return 'lunas';
  if (dibayar > 0) return 'dp';
  return 'belum';
}

// Untung = (jual - modal) - diskon - biaya yang saya tanggung. Ongkir dari pelanggan bukan untung.
export function untungPesanan(p, items, biayaList) {
  const t = totalPesanan(p, items);
  const biaya = biayaList.reduce((s, b) => s + num(b.nominal), 0);
  const kotor = t.sub - num(p.diskon) - t.modal;
  return { ...t, biaya, untung: kotor - biaya };
}

// ---------- Periode ----------
const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function addDays(s, n) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}

// per: { jenis: '7'|'30'|'bulan'|'tahun'|'semua', off: 0 (mundur) }
export function rentang(per, today) {
  const t = today || ymd(new Date());
  if (per.jenis === '7') return { dari: addDays(t, -6), sampai: t };
  if (per.jenis === '30') return { dari: addDays(t, -29), sampai: t };
  if (per.jenis === 'bulan') {
    const d = new Date(t + 'T00:00:00');
    d.setDate(1);
    d.setMonth(d.getMonth() - (per.off || 0));
    const akhir = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { dari: ymd(d), sampai: ymd(akhir) };
  }
  if (per.jenis === 'tahun') {
    const y = Number(t.slice(0, 4)) - (per.off || 0);
    return { dari: `${y}-01-01`, sampai: `${y}-12-31` };
  }
  return { dari: '0000-01-01', sampai: '9999-12-31' };
}
export const dalam = (s, r) => !!s && s >= r.dari && s <= r.sampai;

// ---------- Template ----------
// Ganti {kata}. Baris yang memuat kata kunci kosong dihapus.
export function isiTemplate(teks, data) {
  return String(teks || '')
    .split('\n')
    .map((baris) => {
      let kosong = false;
      const out = baris.replace(/\{(\w+)\}/g, (m, k) => {
        if (!(k in data)) return m;
        const v = data[k];
        if (v === '' || v === null || v === undefined) { kosong = true; return ''; }
        return String(v);
      });
      return kosong ? null : out;
    })
    .filter((b) => b !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
