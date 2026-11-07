// Template pesan bawaan dan data contoh untuk mode coba.
import { addDays, ymd, hitungResep } from './calc.js';

export const TEMPLATE = {
  openPO: { judul: 'Open PO / promosi', teks: '✨ OPEN PO {toko} ✨\n\n{daftar}\n\n📅 Order paling lambat: {batas}\n🧁 Produksi: {tanggalProduksi}\nKuota terbatas, siapa cepat dia dapat ya!\n\nPesan langsung chat aku 💌' },
  promoReady: { judul: 'Promosi stok ready', teks: '🍪 READY STOCK hari ini di {toko}!\n\n{daftar}\n\nBisa diambil langsung atau diantar. Chat aku ya 💕' },
  tagihDP: { judul: 'Tagih DP', teks: 'Halo {sapaan} {nama} 👋\nTerima kasih sudah pesan di {toko}.\n\n{daftar}\n\nTotal: {total}\nDP: {dp}\nTanggal ambil: {tanggalAmbil}\n\nPembayaran bisa lewat QRIS (gambar terlampir) atau transfer ke:\n{rekening}\n\nDitunggu konfirmasinya ya 🙏' },
  tagihLunas: { judul: 'Tagih pelunasan', teks: 'Halo {sapaan} {nama} 👋\nPesanan {sapaan} hampir siap nih.\n\n{daftar}\n\nTotal: {total}\nSudah dibayar: {dibayar}\nSisa: {sisa}\nTanggal ambil: {tanggalAmbil}\n\nPelunasan bisa lewat QRIS (gambar terlampir) atau transfer ke:\n{rekening}\n\nTerima kasih 🙏' },
  siap: { judul: 'Pesanan siap diambil', teks: 'Halo {sapaan} {nama} 🎉\nPesanan {sapaan} sudah siap!\n\n{daftar}\n\nSisa pembayaran: {sisa}\nBisa diambil {tanggalAmbil} {jam}.\n{alamat}\n\nSampai ketemu 💕' },
  dikirim: { judul: 'Pesanan dikirim', teks: 'Halo {sapaan} {nama} 🚚\nPesanan {sapaan} sudah dikirim ya.\n\n{daftar}\n\nNo. resi: {resi}\nAlamat: {alamat}\n\nSemoga sampai dengan selamat dan cantik 🙏' },
  terimaKasih: { judul: 'Terima kasih', teks: 'Terima kasih banyak {sapaan} {nama} sudah pesan di {toko} 🥰\nSemoga suka sama kuenya. Kalau berkenan, kirim fotonya ya, aku senang banget lihatnya 💕' },
  laporanPenitip: { judul: 'Laporan ke penitip', teks: 'Halo {sapaan} {nama} 👋\nLaporan titipan periode {periode}:\n\n{daftar}\n\nYang aku setor: {total}\n{rekening}\n\nTerima kasih sudah titip di {toko} 🙏' },
};

export function dataContoh() {
  const t = ymd(new Date());
  const d = (n) => addDays(t, n);
  const bahan = [
    { id: 'bh-tepung', nama: 'Tepung terigu protein rendah', isi: 1, satuan: 'kg', harga: 14000 },
    { id: 'bh-mentega', nama: 'Mentega', isi: 200, satuan: 'g', harga: 18500 },
    { id: 'bh-margarin', nama: 'Margarin', isi: 1, satuan: 'kg', harga: 32000 },
    { id: 'bh-gula', nama: 'Gula halus', isi: 500, satuan: 'g', harga: 9500, beratSdm: 8, beratSdt: 3 },
    { id: 'bh-telur', nama: 'Telur', isi: 1, satuan: 'kg', harga: 30000, isiButir: 16 },
    { id: 'bh-susu', nama: 'Susu bubuk', isi: 400, satuan: 'g', harga: 46000, beratSdm: 7 },
    { id: 'bh-selai', nama: 'Selai nanas', isi: 1, satuan: 'kg', harga: 38000 },
    { id: 'bh-coklat', nama: 'Dark cooking chocolate', isi: 1, satuan: 'kg', harga: 72000 },
    { id: 'bh-coklatbubuk', nama: 'Coklat bubuk', isi: 250, satuan: 'g', harga: 24000, beratSdm: 6 },
    { id: 'bh-keju', nama: 'Keju edam', isi: 250, satuan: 'g', harga: 52000 },
  ];
  const resep = [
    { id: 'rs-nastar', nama: 'Nastar klasik', hasil: 4, satuanHasil: 'toples', kemasan: 6500, gasMode: 'persen', gasNilai: 5, tenaga: 0, susut: 3 },
    { id: 'rs-brownies', nama: 'Brownies panggang 20x20', hasil: 1, satuanHasil: 'loyang', kemasan: 4000, gasMode: 'rp', gasNilai: 3000, tenaga: 0, susut: 0 },
    { id: 'rs-kastengel', nama: 'Kastengel', hasil: 3, satuanHasil: 'toples', kemasan: 6500, gasMode: 'persen', gasNilai: 5, tenaga: 0, susut: 3 },
  ];
  let u = 0;
  const rb = (resepId, bahanId, jumlah, satuan) => ({ id: 'rb-' + ++u, resepId, bahanId, jumlah, satuan, urut: u });
  const resepBahan = [
    rb('rs-nastar', 'bh-tepung', 500, 'g'), rb('rs-nastar', 'bh-mentega', 200, 'g'), rb('rs-nastar', 'bh-margarin', 150, 'g'),
    rb('rs-nastar', 'bh-gula', 4, 'sdm'), rb('rs-nastar', 'bh-telur', 3, 'butir'), rb('rs-nastar', 'bh-susu', 3, 'sdm'), rb('rs-nastar', 'bh-selai', 600, 'g'),
    rb('rs-brownies', 'bh-coklat', 200, 'g'), rb('rs-brownies', 'bh-mentega', 150, 'g'), rb('rs-brownies', 'bh-gula', 150, 'g'),
    rb('rs-brownies', 'bh-telur', 3, 'butir'), rb('rs-brownies', 'bh-tepung', 100, 'g'), rb('rs-brownies', 'bh-coklatbubuk', 2, 'sdm'),
    rb('rs-kastengel', 'bh-tepung', 400, 'g'), rb('rs-kastengel', 'bh-mentega', 200, 'g'), rb('rs-kastengel', 'bh-keju', 200, 'g'),
    rb('rs-kastengel', 'bh-telur', 2, 'butir'), rb('rs-kastengel', 'bh-susu', 2, 'sdm'),
  ];
  const produk = [
    { id: 'pr-nastar', nama: 'Nastar', jenis: 'sendiri', satuan: 'toples', umurSimpan: 30 },
    { id: 'pr-brownies', nama: 'Brownies Panggang', jenis: 'sendiri', satuan: 'loyang', umurSimpan: 4 },
    { id: 'pr-kastengel', nama: 'Kastengel', jenis: 'sendiri', satuan: 'toples', umurSimpan: 30 },
  ];
  const varian = [
    { id: 'vr-nastar', produkId: 'pr-nastar', nama: 'Klasik 500 g', harga: 95000, resepId: 'rs-nastar', urut: 1 },
    { id: 'vr-brownies-o', produkId: 'pr-brownies', nama: 'Original', harga: 85000, resepId: 'rs-brownies', urut: 1 },
    { id: 'vr-brownies-k', produkId: 'pr-brownies', nama: 'Topping keju', harga: 95000, resepId: 'rs-brownies', hppManual: '', urut: 2 },
    { id: 'vr-kastengel', produkId: 'pr-kastengel', nama: '500 g', harga: 105000, resepId: 'rs-kastengel', urut: 1 },
  ];
  const pelanggan = [
    { id: 'pl-1', nama: 'Rina Wulandari', sapaan: 'Kak', wa: '081234567801', alamat: 'Jl. Melati 12, Bekasi', catatan: 'Tidak suka terlalu manis' },
    { id: 'pl-2', nama: 'Bu Hartini', sapaan: 'Bu', wa: '081234567802', alamat: 'Perum Griya Asri B4', catatan: '' },
    { id: 'pl-3', nama: 'Dimas', sapaan: 'Mas', wa: '081234567803', alamat: '', catatan: 'Alergi kacang' },
    { id: 'pl-4', nama: 'Sari', sapaan: 'Kak', wa: '081234567804', alamat: 'Kos Mawar kamar 3', catatan: '' },
  ];
  const pesanan = [], itemPesanan = [], pembayaran = [], biaya = [];
  let no = 0, ib = 0;
  const bm = Object.fromEntries(bahan.map((b) => [b.id, b]));
  const hppResep = (id) => hitungResep(resep.find((r) => r.id === id), resepBahan.filter((x) => x.resepId === id), bm).hppPcs;
  const hppDemo = { 'vr-nastar': hppResep('rs-nastar'), 'vr-brownies-o': hppResep('rs-brownies'), 'vr-brownies-k': hppResep('rs-brownies'), 'vr-kastengel': hppResep('rs-kastengel') };
  const nama = { 'vr-nastar': 'Nastar · Klasik 500 g', 'vr-brownies-o': 'Brownies Panggang · Original', 'vr-brownies-k': 'Brownies Panggang · Topping keju', 'vr-kastengel': 'Kastengel · 500 g' };
  const harga = { 'vr-nastar': 95000, 'vr-brownies-o': 85000, 'vr-brownies-k': 95000, 'vr-kastengel': 105000 };
  const prod = { 'vr-nastar': 'pr-nastar', 'vr-brownies-o': 'pr-brownies', 'vr-brownies-k': 'pr-brownies', 'vr-kastengel': 'pr-kastengel' };
  function order(pel, pesan, ambil, status, isi, bayar = [], extra = {}) {
    const id = 'ps-' + ++no;
    pesanan.push({ id, kode: 'BK-DEMO-' + String(no).padStart(2, '0'), pelangganId: pel, tglPesan: d(pesan), tglAmbil: d(ambil), jam: '16:00', cara: 'ambil', diskon: 0, ongkir: 0, status, tglSelesai: status === 'selesai' ? d(ambil) : '', catatan: '', ...extra });
    isi.forEach(([v, q]) => itemPesanan.push({ id: 'it-' + ++ib, pesananId: id, produkId: prod[v], varianId: v, nama: nama[v], qty: q, harga: harga[v], hpp: hppDemo[v] }));
    bayar.forEach(([n, hari]) => pembayaran.push({ id: 'by-' + ++ib, pesananId: id, nominal: n, tanggal: d(hari), metode: 'QRIS' }));
    return id;
  }
  order('pl-1', -58, -55, 'selesai', [['vr-nastar', 3]], [[285000, -55]]);
  order('pl-2', -44, -40, 'selesai', [['vr-kastengel', 2], ['vr-nastar', 2]], [[400000, -40]]);
  order('pl-3', -33, -30, 'selesai', [['vr-brownies-o', 1]], [[85000, -30]]);
  order('pl-1', -24, -21, 'selesai', [['vr-brownies-k', 2]], [[190000, -21]]);
  const o5 = order('pl-4', -16, -14, 'selesai', [['vr-nastar', 1]], [[110000, -14]], { cara: 'kurir', ongkir: 15000, alamat: 'Kos Mawar kamar 3' });
  biaya.push({ id: 'bi-1', pesananId: o5, tanggal: d(-14), jenis: 'Ongkir', nominal: 15000, catatan: 'Ongkir kurir' });
  order('pl-2', -9, -7, 'selesai', [['vr-kastengel', 3]], [[315000, -7]], { diskon: 15000 });
  order('pl-3', -5, -3, 'selesai', [['vr-brownies-o', 2]], [[170000, -3]]);
  order('pl-1', -3, 0, 'siap', [['vr-nastar', 2], ['vr-brownies-o', 1]], [[100000, -3]], { catatan: 'Tulisan: Selamat Ulang Tahun Ibu' });
  order('pl-4', -2, 0, 'produksi', [['vr-brownies-k', 1]], []);
  order('pl-2', -1, 1, 'konfirmasi', [['vr-nastar', 4], ['vr-kastengel', 2]], [[300000, -1]]);
  order('pl-3', 0, 2, 'baru', [['vr-kastengel', 1]], []);
  return {
    setelan: [{ id: 'toko', namaToko: 'Dapur Contoh', namaPemilik: '', rekening: 'BCA 1234567890 a.n. Contoh', sapaanBawaan: 'Kak' }],
    bahan, resep, resepBahan, produk, varian, pelanggan, pesanan, itemPesanan, pembayaran, biaya,
  };
}
