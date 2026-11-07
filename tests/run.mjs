import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from '../js/calc.js';
import { createStore, createApi, AuthError } from '../js/store.js';
import { buatServer } from './mock-gas.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
let lulus = 0;
const uji = async (nama, fn) => { await fn(); lulus++; console.log('  ok  ' + nama); };
const dekat = (a, b, e = 0.01) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);

console.log('Hitungan HPP');
const bahan = {
  tepung: { id: 'tepung', nama: 'Tepung terigu', isi: 1, satuan: 'kg', harga: 14000 },
  susu: { id: 'susu', nama: 'Susu cair', isi: 1, satuan: 'l', harga: 21000 },
  telur: { id: 'telur', nama: 'Telur', isi: 1, satuan: 'kg', harga: 30000, isiButir: 16 },
  mentega: { id: 'mentega', nama: 'Mentega', isi: 200, satuan: 'g', harga: 18500 },
  gula: { id: 'gula', nama: 'Gula', isi: 1, satuan: 'kg', harga: 17000, beratSdm: 12, beratSdt: 4 },
  telurButir: { id: 'tb', nama: 'Telur', isi: 10, satuan: 'butir', harga: 21000 },
};
await uji('harga per satuan terkecil', () => {
  assert.equal(C.hargaPerSatuan(bahan.tepung, 'g'), 14);
  assert.equal(C.hargaPerSatuan(bahan.susu, 'ml'), 21);
  assert.equal(C.hargaPerSatuan(bahan.telur, 'butir'), 1875);
  assert.equal(C.hargaPerSatuan(bahan.mentega, 'kg'), 92500);
  assert.equal(C.hargaPerSatuan(bahan.gula, 'sdm'), 204);
  assert.equal(C.hargaPerSatuan(bahan.gula, 'sdt'), 68);
  assert.equal(C.hargaPerSatuan(bahan.telurButir, 'butir'), 2100);
  assert.equal(C.hargaPerSatuan(bahan.tepung, 'ml'), null);
  assert.equal(C.hargaPerSatuan(bahan.telurButir, 'g'), null);
});
const resep = { hasil: 20, susut: 5, kemasan: 1000, gasMode: 'persen', gasNilai: 5, tenaga: 0 };
const baris = [
  { bahanId: 'tepung', jumlah: 250, satuan: 'g' },
  { bahanId: 'telur', jumlah: 3, satuan: 'butir' },
  { bahanId: 'mentega', jumlah: 100, satuan: 'g' },
  { bahanId: 'susu', jumlah: 200, satuan: 'ml' },
  { bahanId: 'gula', jumlah: 2, satuan: 'sdm' },
];
await uji('HPP per pcs = (bahan + gas) / hasil bersih + kemasan', () => {
  const r = C.hitungResep(resep, baris, bahan);
  assert.equal(r.biayaBahan, 3500 + 5625 + 9250 + 4200 + 408);
  dekat(r.gas, 1149.15);
  assert.equal(r.hasilBersih, 19);
  dekat(r.hppPcs, (22983 + 1149.15) / 19 + 1000);
  assert.equal(r.masalah, 0);
});
await uji('gas Rp per adonan dan tenaga', () => {
  const r = C.hitungResep({ ...resep, gasMode: 'rp', gasNilai: 3000, tenaga: 10000, susut: 0 }, baris, bahan);
  dekat(r.hppPcs, (22983 + 3000 + 10000) / 20 + 1000);
});
await uji('saran harga margin dan markup dengan pembulatan', () => {
  assert.equal(C.saranHarga(2270.11, { mode: 'margin', nilai: 40, bulat: 500 }), 4000);
  assert.equal(C.saranHarga(2270.11, { mode: 'margin', nilai: 40, bulat: 1000 }), 4000);
  assert.equal(C.saranHarga(2270.11, { mode: 'markup', nilai: 1500, bulat: 500 }), 4000);
  assert.equal(C.saranHarga(2400, { mode: "markup", nilai: 1000, bulat: 500 }), 3500);
});
await uji('simulasi 50 pcs: adonan dibulatkan ke atas', () => {
  const s = C.simulasi(resep, baris, bahan, 50, 0, 4000);
  assert.equal(s.kali, 3);
  assert.equal(s.jadi, 57);
  assert.equal(s.detail[0].jumlah, 750);
  const plus = C.simulasi(resep, baris, bahan, 50, 1, 4000);
  assert.equal(plus.kali, 4);
});
await uji('total, status bayar, untung pesanan', () => {
  const items = [{ qty: 2, harga: 85000, hpp: 40000 }, { qty: 1, harga: 60000, hpp: 25000 }];
  const t = C.untungPesanan({ diskon: 10000, ongkir: 15000 }, items, [{ nominal: 15000 }]);
  assert.equal(t.total, 230000 - 10000 + 15000);
  assert.equal(t.untung, 230000 - 10000 - 105000 - 15000);
  assert.equal(C.statusBayar(235000, 0), 'belum');
  assert.equal(C.statusBayar(235000, 100000), 'dp');
  assert.equal(C.statusBayar(235000, 235000), 'lunas');
});
await uji('periode bulanan dan tahunan mundur', () => {
  assert.deepEqual(C.rentang({ jenis: 'bulan', off: 0 }, '2026-11-07'), { dari: '2026-11-01', sampai: '2026-11-30' });
  assert.deepEqual(C.rentang({ jenis: 'bulan', off: 11 }, '2026-11-07'), { dari: '2025-12-01', sampai: '2025-12-31' });
  assert.deepEqual(C.rentang({ jenis: 'bulan', off: 9 }, '2026-03-31'), { dari: '2025-06-01', sampai: '2025-06-30' });
  assert.deepEqual(C.rentang({ jenis: 'tahun', off: 1 }, '2026-11-07'), { dari: '2025-01-01', sampai: '2025-12-31' });
  assert.deepEqual(C.rentang({ jenis: '7' }, '2026-11-07'), { dari: '2026-11-01', sampai: '2026-11-07' });
});
await uji('template: kata kunci kosong menghapus barisnya', () => {
  const t = 'Halo {sapaan} {nama}\nDP: {dp}\nSisa: {sisa}\n{rekening}';
  assert.equal(C.isiTemplate(t, { sapaan: 'Kak', nama: 'Rina', dp: '', sisa: 'Rp 5.000', rekening: '' }), 'Halo Kak Rina\nSisa: Rp 5.000');
});

console.log('Server dan sinkron dua HP (server tiruan)');
const srv = buatServer(path.join(dir, '../apps-script/Code.gs'));
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const kode = () => srv.ss.getSheetByName('Pengaturan').rows.find((r) => r[0] === 'kodeSetup')[1];

let tokenA, tokenB;
await uji('ping sebelum ada akun', () => {
  const r = srv.post(JSON.stringify({ action: 'ping' }));
  assert.equal(r.ok, true);
  assert.equal(r.adaAkun, false);
});
await uji('daftar akun pertama butuh kode setup', () => {
  const salah = srv.post(JSON.stringify({ action: 'daftar', kodeSetup: 'SALAH', username: 'adzul', sandi: 'rahasia1' }));
  assert.equal(salah.error, 'kodeSetup');
  const ok = srv.post(JSON.stringify({ action: 'daftar', kodeSetup: kode().toLowerCase(), username: 'Adzul', sandi: 'rahasia1', nama: 'Adzul', perangkat: 'HP A' }));
  assert.equal(ok.ok, true);
  assert.equal(ok.akun.username, 'adzul');
  assert.equal(ok.akun.peran, 'pemilik');
  tokenA = ok.token;
  const lagi = srv.post(JSON.stringify({ action: 'daftar', kodeSetup: kode(), username: 'lain', sandi: 'rahasia1' }));
  assert.equal(lagi.error, 'sudahAda');
});
await uji('kata sandi tidak tersimpan polos, token tidak tersimpan polos', () => {
  const akun = srv.ss.getSheetByName('Akun').rows.flat().join('|');
  assert.ok(!akun.includes('rahasia1'));
  const sesi = srv.ss.getSheetByName('Sesi').rows.flat().join('|');
  assert.ok(!sesi.includes(tokenA));
});
await uji('masuk di HP kedua dengan akun yang sama', () => {
  const salah = srv.post(JSON.stringify({ action: 'masuk', username: 'adzul', sandi: 'salah123' }));
  assert.equal(salah.error, 'salah');
  const ok = srv.post(JSON.stringify({ action: 'masuk', username: 'ADZUL ', sandi: 'rahasia1', perangkat: 'HP B' }));
  assert.equal(ok.ok, true);
  tokenB = ok.token;
  assert.notEqual(tokenA, tokenB);
});
await uji('terkunci setelah 5 kali salah', () => {
  for (let i = 0; i < 5; i++) srv.post(JSON.stringify({ action: 'masuk', username: 'adzul', sandi: 'x' + i }));
  const r = srv.post(JSON.stringify({ action: 'masuk', username: 'adzul', sandi: 'rahasia1' }));
  assert.equal(r.error, 'terkunci');
  srv.ctx.CacheService.getScriptCache().remove('gagal_adzul');
});
await uji('tanpa token ditolak', () => {
  assert.equal(srv.post(JSON.stringify({ action: 'pull', since: 0 })).error, 'sesi');
  assert.equal(srv.post(JSON.stringify({ action: 'pull', token: 'palsu', since: 0 })).error, 'sesi');
});

let jam = 1_800_000_000_000;
const now = () => jam;
const apiA = createApi('x', () => tokenA, srv.fetch);
let putus = false;
const apiB = createApi('x', () => tokenB, (u, o) => (putus ? Promise.reject(new Error('offline')) : srv.fetch(u, o)));
const A = createStore({ storage: memStorage(), key: 'a', api: apiA, now });
const B = createStore({ storage: memStorage(), key: 'b', api: apiB, now });

await uji('data dari HP A muncul di HP B', async () => {
  A.put('pelanggan', { id: 'p1', nama: 'Rina', sapaan: 'Kak', wa: '081234567890' });
  A.put('pesanan', { id: 'o1', pelangganId: 'p1', tglAmbil: '2026-11-08', diskon: 0, status: 'baru' });
  await A.flush();
  assert.equal(A.pending, 0);
  await B.pull();
  const p = B.get('pelanggan', 'p1');
  assert.equal(p.nama, 'Rina');
  assert.equal(p.wa, '081234567890', 'nol di depan nomor WA tetap ada');
  assert.equal(B.get('pesanan', 'o1').tglAmbil, '2026-11-08', 'tanggal tetap teks');
});
await uji('HP B offline: perubahan antre lalu terkirim saat online', async () => {
  putus = true;
  jam += 1000;
  B.put('pembayaran', { id: 'b1', pesananId: 'o1', nominal: 50000, tanggal: '2026-11-07' });
  await B.flush();
  assert.equal(B.pending, 1);
  assert.equal(B.status, 'offline');
  putus = false;
  await B.flush();
  assert.equal(B.pending, 0);
  await A.pull();
  assert.equal(C.num(A.get('pembayaran', 'b1').nominal), 50000);
});
await uji('edit bersamaan: yang terakhir diubah menang', async () => {
  jam += 1000;
  A.put('pelanggan', { ...A.get('pelanggan', 'p1'), nama: 'Rina A' });
  jam += 1000;
  B.put('pelanggan', { ...B.get('pelanggan', 'p1'), nama: 'Rina B' });
  await B.flush();
  await A.flush();
  await A.pull();
  await B.pull();
  assert.equal(A.get('pelanggan', 'p1').nama, 'Rina B');
  assert.equal(B.get('pelanggan', 'p1').nama, 'Rina B');
});
await uji('hapus ikut tersinkron', async () => {
  jam += 1000;
  A.remove('pembayaran', 'b1');
  await A.flush();
  await B.pull();
  assert.equal(B.get('pembayaran', 'b1'), null);
});
await uji('kolom baru otomatis ditambahkan', async () => {
  jam += 1000;
  A.put('pelanggan', { id: 'p2', nama: 'Dewi', kolomBaru: 'x' });
  await A.flush();
  const hdr = srv.ss.getSheetByName('Pelanggan').rows[0];
  assert.ok(hdr.includes('kolomBaru'));
});
await uji('unggah dan ambil gambar QRIS', () => {
  const up = srv.post(JSON.stringify({ action: 'unggah', token: tokenA, nama: 'qris.png', mime: 'image/png', base64: Buffer.from('gambar').toString('base64') }));
  assert.equal(up.ok, true);
  const f = srv.post(JSON.stringify({ action: 'file', token: tokenB, id: up.id }));
  assert.equal(Buffer.from(f.base64, 'base64').toString(), 'gambar');
});
await uji('keluar dari semua HP lain', async () => {
  srv.post(JSON.stringify({ action: 'keluarSemua', token: tokenA, kecualiIni: true }));
  let e;
  try { await apiB.pull(0); } catch (x) { e = x; }
  assert.ok(e instanceof AuthError);
  await B.pull();
  assert.equal(B.status, 'auth');
  assert.equal((await apiA.pull(0)).ok, true);
});
await uji('pemilik menambah akun anggota', () => {
  const r = srv.post(JSON.stringify({ action: 'tambahAkun', token: tokenA, username: 'asisten', sandi: 'dapur123', nama: 'Asisten' }));
  assert.equal(r.akun.peran, 'anggota');
  const m = srv.post(JSON.stringify({ action: 'masuk', username: 'asisten', sandi: 'dapur123' }));
  const tolak = srv.post(JSON.stringify({ action: 'tambahAkun', token: m.token, username: 'x12', sandi: 'dapur123' }));
  assert.equal(tolak.error, 'izin');
});
await uji('ganti kata sandi', () => {
  assert.equal(srv.post(JSON.stringify({ action: 'gantiSandi', token: tokenA, lama: 'salah', baru: 'baru1234' })).error, 'salah');
  assert.equal(srv.post(JSON.stringify({ action: 'gantiSandi', token: tokenA, lama: 'rahasia1', baru: 'baru1234' })).ok, true);
  assert.equal(srv.post(JSON.stringify({ action: 'masuk', username: 'adzul', sandi: 'baru1234' })).ok, true);
});

console.log(`\n${lulus} uji lulus`);
