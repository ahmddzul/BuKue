/**
 * BuKue server (Google Apps Script).
 * Terbitkan sebagai Web App: Execute as = Me, Who has access = Anyone.
 * Data tetap di Sheet ini. Akses dijaga akun + token sesi.
 */
var VERSI_SERVER = '1.0.0';
var ITERASI_HASH = 300;
var BATAS_GAGAL = 5;
var KUNCI_MENIT = 10;

var TABS = {
  setelan: 'Setelan',
  bahan: 'Bahan',
  riwayatHarga: 'RiwayatHarga',
  resep: 'Resep',
  resepBahan: 'ResepBahan',
  produk: 'Produk',
  varian: 'Varian',
  pelanggan: 'Pelanggan',
  pesanan: 'Pesanan',
  itemPesanan: 'ItemPesanan',
  pembayaran: 'Pembayaran',
  biaya: 'Biaya',
  produksi: 'Produksi',
  template: 'Template',
  stok: 'StokReady',
  stokKeluar: 'StokKeluar',
  penitip: 'Penitip',
  setoran: 'Setoran',
  openPO: 'OpenPO',
  kuotaPO: 'KuotaPO'
};

// Urutan kolom awal supaya Sheet enak dibaca. Kolom baru ditambah otomatis.
var KOLOM = {
  setelan: ['namaToko', 'namaPemilik', 'rekening', 'qrisFileId', 'sapaanBawaan'],
  bahan: ['nama', 'isi', 'satuan', 'harga', 'isiButir', 'beratSdm', 'beratSdt', 'stok', 'catatan'],
  riwayatHarga: ['bahanId', 'tanggal', 'hargaLama', 'hargaBaru', 'isi', 'satuan'],
  resep: ['nama', 'hasil', 'satuanHasil', 'kemasan', 'gasMode', 'gasNilai', 'tenaga', 'susut', 'catatan'],
  resepBahan: ['resepId', 'bahanId', 'jumlah', 'satuan', 'urut'],
  produk: ['nama', 'jenis', 'satuan', 'umurSimpan', 'penitipId', 'fotoId', 'catatan'],
  varian: ['produkId', 'nama', 'harga', 'resepId', 'hppManual', 'hargaSetor', 'urut'],
  pelanggan: ['nama', 'sapaan', 'wa', 'alamat', 'catatan'],
  pesanan: ['kode', 'pelangganId', 'tglPesan', 'tglAmbil', 'jam', 'cara', 'alamat', 'catatan', 'diskon', 'ongkir', 'status', 'tglSelesai'],
  itemPesanan: ['pesananId', 'produkId', 'varianId', 'nama', 'qty', 'harga', 'hpp'],
  pembayaran: ['pesananId', 'tanggal', 'nominal', 'metode', 'catatan'],
  biaya: ['pesananId', 'tanggal', 'jenis', 'nominal', 'catatan'],
  produksi: ['tanggal', 'produkId', 'varianId', 'jumlah', 'status'],
  template: ['judul', 'teks'],
  stok: ['varianId', 'produkId', 'nama', 'tanggal', 'kedaluwarsa', 'jumlah', 'hpp', 'harga', 'sumber', 'penitipId', 'catatan'],
  stokKeluar: ['stokId', 'tanggal', 'jumlah', 'alasan', 'nilai', 'setoranId', 'catatan'],
  penitip: ['nama', 'sapaan', 'wa', 'rekening', 'catatan'],
  setoran: ['penitipId', 'tanggal', 'dari', 'sampai', 'terjual', 'total', 'untung', 'rincian'],
  openPO: ['judul', 'batas', 'tanggalProduksi', 'catatan'],
  kuotaPO: ['openPOId', 'varianId', 'kuota']
};
var TAB_TERLARANG = ['pengaturan', 'akun', 'sesi'];

// Koleksi baru dari versi aplikasi yang lebih baru dibuat otomatis jadi tab,
// supaya fitur baru tidak mewajibkan pemasangan ulang Code.gs.
function namaTab_(col, buat) {
  if (TABS[col]) return TABS[col];
  if (!/^[a-z][A-Za-z0-9]{1,30}$/.test(String(col)) || TAB_TERLARANG.indexOf(String(col).toLowerCase()) >= 0) return null;
  var nama = col.charAt(0).toUpperCase() + col.slice(1);
  var props = PropertiesService.getScriptProperties();
  var daftar = JSON.parse(props.getProperty('tabTambahan') || '[]');
  if (daftar.indexOf(col) < 0) {
    if (!buat) return null;
    daftar.push(col);
    props.setProperty('tabTambahan', JSON.stringify(daftar));
  }
  if (buat && !ss_().getSheetByName(nama)) sheetDenganKolom_(nama, KOLOM_SISTEM);
  return nama;
}
function semuaKoleksi_() {
  return Object.keys(TABS).concat(JSON.parse(PropertiesService.getScriptProperties().getProperty('tabTambahan') || '[]'));
}
var KOLOM_SISTEM = ['id', 'updatedAt', 'deleted', '_ts', 'by'];

// ---------------- Menu Sheet ----------------
function onOpen() {
  SpreadsheetApp.getUi().createMenu('BuKue')
    .addItem('Siapkan', 'menuSiapkan')
    .addItem('Lihat kode setup', 'menuLihatKode')
    .addItem('Buat kode setup baru', 'menuKodeBaru')
    .addSeparator()
    .addItem('Reset kata sandi akun', 'menuResetSandi')
    .addItem('Keluarkan semua HP', 'menuKeluarSemua')
    .addToUi();
}

function menuSiapkan() {
  siapkan_();
  var ui = SpreadsheetApp.getUi();
  ui.alert('BuKue siap',
    'Tab sudah dibuat.\n\nKode setup: ' + ambilSetelanServer_('kodeSetup') +
    '\n\nKode ini dipakai sekali saja saat membuat akun pertama di aplikasi.\nLangkah berikutnya: Terapkan > Deployment baru > Aplikasi web.',
    ui.ButtonSet.OK);
}

function menuLihatKode() {
  siapkan_();
  var ui = SpreadsheetApp.getUi();
  var ada = bacaAkun_().length > 0;
  ui.alert('Kode setup', ambilSetelanServer_('kodeSetup') +
    (ada ? '\n\nAkun pertama sudah dibuat, jadi kode ini tidak dipakai lagi.' : '\n\nIsi kode ini saat membuat akun pertama.'),
    ui.ButtonSet.OK);
}

function menuKodeBaru() {
  siapkan_();
  simpanSetelanServer_('kodeSetup', buatKode_());
  SpreadsheetApp.getUi().alert('Kode setup baru: ' + ambilSetelanServer_('kodeSetup'));
}

function menuResetSandi() {
  siapkan_();
  var ui = SpreadsheetApp.getUi();
  var r1 = ui.prompt('Reset kata sandi', 'Nama pengguna:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var akun = cariAkun_(r1.getResponseText());
  if (!akun) { ui.alert('Akun tidak ditemukan.'); return; }
  var r2 = ui.prompt('Reset kata sandi', 'Kata sandi baru untuk ' + akun.username + ' (minimal 6 karakter):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var baru = r2.getResponseText();
  if (baru.length < 6) { ui.alert('Kata sandi minimal 6 karakter.'); return; }
  setSandi_(akun.id, baru);
  hapusSesi_(function (s) { return s.akunId === akun.id; });
  ui.alert('Selesai. Semua HP akun ini perlu masuk lagi dengan kata sandi baru.');
}

function menuKeluarSemua() {
  siapkan_();
  hapusSesi_(function () { return true; });
  SpreadsheetApp.getUi().alert('Semua HP sudah dikeluarkan. Masuk lagi dengan akun masing-masing.');
}

// ---------------- Web App ----------------
function doGet() {
  return ContentService.createTextOutput('BuKue server aktif, versi ' + VERSI_SERVER);
}

function doPost(e) {
  var res;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    res = tangani_(req);
  } catch (err) {
    res = { ok: false, error: err && err.kode ? err.kode : 'server', pesan: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function gagal_(kode, pesan) {
  var e = new Error(pesan || kode);
  e.kode = kode;
  throw e;
}

function tangani_(req) {
  siapkan_();
  var a = req.action;
  if (a === 'ping') return { ok: true, versi: VERSI_SERVER, adaAkun: bacaAkun_().length > 0 };
  if (a === 'daftar') return daftar_(req);
  if (a === 'masuk') return masuk_(req);

  var sesi = cekToken_(req.token);
  var akun = akunById_(sesi.akunId);
  if (!akun) gagal_('sesi', 'Akun sudah dihapus.');

  switch (a) {
    case 'saya': return { ok: true, akun: publik_(akun) };
    case 'keluar': hapusSesi_(function (s) { return s.tokenHash === sesi.tokenHash; }); return { ok: true };
    case 'keluarSemua':
      hapusSesi_(function (s) { return s.akunId === akun.id && (!req.kecualiIni || s.tokenHash !== sesi.tokenHash); });
      return { ok: true };
    case 'daftarSesi': return { ok: true, sesi: daftarSesi_(akun.id, sesi.tokenHash) };
    case 'gantiSandi': return gantiSandi_(akun, req);
    case 'daftarAkun': wajibPemilik_(akun); return { ok: true, akun: bacaAkun_().map(publik_) };
    case 'tambahAkun': wajibPemilik_(akun); return tambahAkun_(req);
    case 'hapusAkun': wajibPemilik_(akun); return hapusAkun_(akun, req);
    case 'push': return push_(req.ops || [], akun);
    case 'pull': return pull_(Number(req.since) || 0);
    case 'unggah': return unggah_(req);
    case 'file': return ambilFile_(req.id);
  }
  gagal_('aksi', 'Aksi tidak dikenal.');
}

// ---------------- Akun ----------------
function hex_(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function sha_(s) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}
function hashSandi_(salt, sandi) {
  var h = salt + ':' + sandi;
  for (var i = 0; i < ITERASI_HASH; i++) h = sha_(salt + h);
  return h;
}
function acak_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function buatKode_() {
  var huruf = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < 8; i++) s += huruf.charAt(Math.floor(Math.random() * huruf.length));
  return s;
}
function normUser_(u) { return String(u || '').trim().toLowerCase(); }
function publik_(a) { return { id: a.id, username: a.username, nama: a.nama, peran: a.peran }; }

function bacaAkun_() { return bacaObjek_(sheet_('Akun')); }
function cariAkun_(username) {
  var u = normUser_(username);
  return bacaAkun_().filter(function (a) { return a.username === u; })[0] || null;
}
function akunById_(id) { return bacaAkun_().filter(function (a) { return a.id === id; })[0] || null; }

function validasiAkun_(username, sandi) {
  var u = normUser_(username);
  if (!/^[a-z0-9._]{3,24}$/.test(u)) gagal_('username', 'Nama pengguna 3 sampai 24 karakter: huruf, angka, titik, atau garis bawah.');
  if (String(sandi || '').length < 6) gagal_('sandi', 'Kata sandi minimal 6 karakter.');
  return u;
}

function buatAkun_(username, sandi, nama, peran) {
  var u = validasiAkun_(username, sandi);
  if (cariAkun_(u)) gagal_('username', 'Nama pengguna sudah dipakai.');
  var salt = acak_().slice(0, 24);
  var akun = { id: 'ak_' + acak_().slice(0, 12), username: u, nama: String(nama || '').trim(), peran: peran, salt: salt, hash: hashSandi_(salt, sandi), dibuat: new Date().toISOString() };
  tulisObjek_(sheet_('Akun'), akun);
  return akun;
}

function buatSesi_(akun, perangkat) {
  var token = acak_();
  var now = new Date().toISOString();
  tulisObjek_(sheet_('Sesi'), { tokenHash: sha_(token), akunId: akun.id, perangkat: String(perangkat || 'HP').slice(0, 60), dibuat: now, terakhir: now });
  return token;
}

function daftar_(req) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (bacaAkun_().length > 0) gagal_('sudahAda', 'Akun pertama sudah dibuat. Masuk saja, atau minta pemilik menambahkan akun.');
    var kode = String(ambilSetelanServer_('kodeSetup') || '');
    if (!kode || String(req.kodeSetup || '').trim().toUpperCase() !== kode) gagal_('kodeSetup', 'Kode setup salah. Lihat di Sheet: menu BuKue > Lihat kode setup.');
    var akun = buatAkun_(req.username, req.sandi, req.nama, 'pemilik');
    return { ok: true, token: buatSesi_(akun, req.perangkat), akun: publik_(akun) };
  } finally { lock.releaseLock(); }
}

function masuk_(req) {
  var u = normUser_(req.username);
  var cache = CacheService.getScriptCache();
  var kunci = 'gagal_' + u;
  var gagal = Number(cache.get(kunci) || 0);
  if (gagal >= BATAS_GAGAL) gagal_('terkunci', 'Terlalu banyak percobaan. Coba lagi ' + KUNCI_MENIT + ' menit lagi.');
  var akun = cariAkun_(u);
  if (!akun || hashSandi_(akun.salt, String(req.sandi || '')) !== akun.hash) {
    cache.put(kunci, String(gagal + 1), KUNCI_MENIT * 60);
    gagal_('salah', 'Nama pengguna atau kata sandi salah.');
  }
  cache.remove(kunci);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return { ok: true, token: buatSesi_(akun, req.perangkat), akun: publik_(akun) }; }
  finally { lock.releaseLock(); }
}

function cekToken_(token) {
  if (!token) gagal_('sesi', 'Belum masuk.');
  var th = sha_(String(token));
  var sh = sheet_('Sesi');
  var data = bacaObjek_(sh);
  for (var i = 0; i < data.length; i++) {
    if (data[i].tokenHash === th) {
      var s = data[i];
      var lalu = Date.parse(s.terakhir) || 0;
      if (Date.now() - lalu > 3600 * 1000) {
        var hdr = header_(sh);
        sh.getRange(i + 2, hdr.indexOf('terakhir') + 1).setValue(new Date().toISOString());
      }
      return s;
    }
  }
  gagal_('sesi', 'Sesi berakhir. Silakan masuk lagi.');
}

function hapusSesi_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_('Sesi');
    var data = bacaObjek_(sh);
    for (var i = data.length - 1; i >= 0; i--) if (fn(data[i])) sh.deleteRow(i + 2);
  } finally { lock.releaseLock(); }
}

function daftarSesi_(akunId, ini) {
  return bacaObjek_(sheet_('Sesi')).filter(function (s) { return s.akunId === akunId; })
    .map(function (s) { return { perangkat: s.perangkat, dibuat: s.dibuat, terakhir: s.terakhir, ini: s.tokenHash === ini }; });
}

function setSandi_(akunId, baru) {
  var sh = sheet_('Akun');
  var hdr = header_(sh);
  var data = bacaObjek_(sh);
  for (var i = 0; i < data.length; i++) {
    if (data[i].id === akunId) {
      var salt = acak_().slice(0, 24);
      sh.getRange(i + 2, hdr.indexOf('salt') + 1).setValue(salt);
      sh.getRange(i + 2, hdr.indexOf('hash') + 1).setValue(hashSandi_(salt, baru));
      return;
    }
  }
}

function gantiSandi_(akun, req) {
  if (hashSandi_(akun.salt, String(req.lama || '')) !== akun.hash) gagal_('salah', 'Kata sandi lama salah.');
  if (String(req.baru || '').length < 6) gagal_('sandi', 'Kata sandi baru minimal 6 karakter.');
  setSandi_(akun.id, req.baru);
  return { ok: true };
}

function wajibPemilik_(akun) { if (akun.peran !== 'pemilik') gagal_('izin', 'Hanya pemilik yang bisa mengatur akun.'); }

function tambahAkun_(req) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return { ok: true, akun: publik_(buatAkun_(req.username, req.sandi, req.nama, 'anggota')) }; }
  finally { lock.releaseLock(); }
}

function hapusAkun_(saya, req) {
  if (req.id === saya.id) gagal_('izin', 'Akun sendiri tidak bisa dihapus.');
  var sh = sheet_('Akun');
  var data = bacaObjek_(sh);
  for (var i = data.length - 1; i >= 0; i--) if (data[i].id === req.id) sh.deleteRow(i + 2);
  hapusSesi_(function (s) { return s.akunId === req.id; });
  return { ok: true };
}

// ---------------- Sinkron ----------------
function push_(ops, akun) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var now = Date.now();
    var grup = {};
    ops.forEach(function (op) {
      if (!op || !op.row || !op.row.id || !namaTab_(op.col, true)) return;
      (grup[op.col] = grup[op.col] || []).push(op.row);
    });
    var diterima = 0;
    Object.keys(grup).forEach(function (col) {
      var sh = sheet_(namaTab_(col, true));
      var rows = grup[col];
      var keys = {};
      rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (k !== '_ts') keys[k] = 1; }); });
      var hdr = pastikanKolom_(sh, Object.keys(keys));
      var n = sh.getLastRow() - 1;
      var data = n > 0 ? sh.getRange(2, 1, n, hdr.length).getValues() : [];
      var idx = {};
      for (var i = 0; i < data.length; i++) idx[String(data[i][0])] = i;
      var iUpd = hdr.indexOf('updatedAt'), iTs = hdr.indexOf('_ts'), iBy = hdr.indexOf('by');
      rows.forEach(function (r) {
        var pos = idx[String(r.id)];
        var baris;
        if (pos !== undefined) {
          if (Number(data[pos][iUpd]) > Number(r.updatedAt)) return;
          baris = data[pos];
        } else {
          baris = hdr.map(function () { return ''; });
          data.push(baris);
          pos = data.length - 1;
          idx[String(r.id)] = pos;
        }
        Object.keys(r).forEach(function (k) {
          var c = hdr.indexOf(k);
          if (c < 0 || k === '_ts') return;
          var v = r[k];
          if (v !== null && typeof v === 'object') v = JSON.stringify(v);
          if (v === null || v === undefined) v = '';
          baris[c] = v;
        });
        baris[iTs] = now;
        if (iBy >= 0) baris[iBy] = akun.username;
        diterima++;
      });
      if (data.length) {
        var rg = sh.getRange(2, 1, data.length, hdr.length);
        rg.setNumberFormat('@');
        rg.setValues(data);
      }
    });
    return { ok: true, diterima: diterima, now: now };
  } finally { lock.releaseLock(); }
}

function pull_(since) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var now = Date.now();
    var out = {};
    semuaKoleksi_().forEach(function (col) {
      var sh = ss_().getSheetByName(namaTab_(col, false) || '');
      if (!sh) return;
      var rows = bacaObjek_(sh).filter(function (r) { return Number(r._ts) > since; });
      if (rows.length) out[col] = rows;
    });
    // Kurangi 1 ms supaya perubahan yang tertulis di milidetik yang sama tetap terambil di tarikan berikutnya.
    return { ok: true, now: now - 1, data: out };
  } finally { lock.releaseLock(); }
}

// ---------------- File (QRIS, foto) ----------------
function folder_() {
  var id = ambilSetelanServer_('folderId');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('BuKue File');
  simpanSetelanServer_('folderId', f.getId());
  return f;
}
function unggah_(req) {
  var b64 = String(req.base64 || '');
  if (b64.length > 4 * 1024 * 1024) gagal_('besar', 'File terlalu besar.');
  var mime = /^image\/(png|jpeg|webp)$/.test(req.mime) ? req.mime : 'image/png';
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, String(req.nama || 'file').slice(0, 80));
  var f = folder_().createFile(blob);
  return { ok: true, id: f.getId() };
}
function ambilFile_(id) {
  var f;
  try { f = DriveApp.getFileById(String(id)); } catch (e) { gagal_('file', 'File tidak ditemukan.'); }
  var parents = f.getParents();
  var folderId = ambilSetelanServer_('folderId');
  var boleh = false;
  while (parents.hasNext()) if (parents.next().getId() === folderId) boleh = true;
  if (!boleh) gagal_('file', 'File bukan milik BuKue.');
  var blob = f.getBlob();
  return { ok: true, mime: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

// ---------------- Sheet helper ----------------
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function siapkan_() {
  if (PropertiesService.getScriptProperties().getProperty('versiTab') === VERSI_SERVER && ss_().getSheetByName('Pengaturan')) return;
  sheetDenganKolom_('Pengaturan', ['kunci', 'nilai']);
  sheetDenganKolom_('Akun', ['id', 'username', 'nama', 'peran', 'salt', 'hash', 'dibuat']);
  sheetDenganKolom_('Sesi', ['tokenHash', 'akunId', 'perangkat', 'dibuat', 'terakhir']);
  Object.keys(TABS).forEach(function (col) { sheetDenganKolom_(TABS[col], KOLOM_SISTEM.concat(KOLOM[col] || [])); });
  if (!ambilSetelanServer_('kodeSetup')) simpanSetelanServer_('kodeSetup', buatKode_());
  var def = ss_().getSheetByName('Sheet1') || ss_().getSheetByName('Lembar1');
  if (def && def.getLastRow() === 0 && ss_().getSheets().length > 1) ss_().deleteSheet(def);
  PropertiesService.getScriptProperties().setProperty('versiTab', VERSI_SERVER);
}

function sheetDenganKolom_(nama, kolom) {
  var sh = ss_().getSheetByName(nama) || ss_().insertSheet(nama);
  pastikanKolom_(sh, kolom);
  if (sh.getFrozenRows() < 1) sh.setFrozenRows(1);
  return sh;
}

function sheet_(nama) {
  var sh = ss_().getSheetByName(nama);
  if (!sh) gagal_('sheet', 'Tab ' + nama + ' belum ada. Jalankan menu BuKue > Siapkan.');
  return sh;
}

function header_(sh) {
  var c = sh.getLastColumn();
  if (c < 1) return [];
  return sh.getRange(1, 1, 1, c).getValues()[0].map(String).filter(function (h) { return h !== ''; });
}

// Tambah kolom yang belum ada di ujung kanan. Kembalikan header lengkap.
function pastikanKolom_(sh, kolom) {
  var hdr = header_(sh);
  var baru = kolom.filter(function (k) { return hdr.indexOf(k) < 0; });
  if (baru.length) {
    var mulai = hdr.length + 1;
    if (sh.getMaxColumns() < hdr.length + baru.length) sh.insertColumnsAfter(sh.getMaxColumns(), hdr.length + baru.length - sh.getMaxColumns());
    sh.getRange(1, mulai, 1, baru.length).setValues([baru]).setFontWeight('bold');
    sh.getRange(1, mulai, sh.getMaxRows(), baru.length).setNumberFormat('@');
    hdr = hdr.concat(baru);
  }
  return hdr;
}

function nilai_(v) {
  if (v instanceof Date) {
    var tz = Session.getScriptTimeZone();
    var jam = Utilities.formatDate(v, tz, 'HH:mm:ss');
    return Utilities.formatDate(v, tz, jam === '00:00:00' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss");
  }
  if (v === 'TRUE' || v === 'true') return true;
  if (v === 'FALSE' || v === 'false') return false;
  return v;
}

function bacaObjek_(sh) {
  var hdr = header_(sh);
  var n = sh.getLastRow() - 1;
  if (n < 1 || !hdr.length) return [];
  return sh.getRange(2, 1, n, hdr.length).getValues().map(function (r) {
    var o = {};
    for (var i = 0; i < hdr.length; i++) o[hdr[i]] = nilai_(r[i]);
    return o;
  }).filter(function (o) { return o[hdr[0]] !== ''; });
}

function tulisObjek_(sh, obj) {
  var hdr = pastikanKolom_(sh, Object.keys(obj));
  var baris = hdr.map(function (k) { return obj[k] === undefined ? '' : obj[k]; });
  var r = sh.getLastRow() + 1;
  var rg = sh.getRange(r, 1, 1, hdr.length);
  rg.setNumberFormat('@');
  rg.setValues([baris]);
}

function ambilSetelanServer_(k) {
  var sh = ss_().getSheetByName('Pengaturan');
  if (!sh) return '';
  var rows = bacaObjek_(sh);
  for (var i = 0; i < rows.length; i++) if (rows[i].kunci === k) return String(rows[i].nilai);
  return '';
}

function simpanSetelanServer_(k, v) {
  var sh = sheetDenganKolom_('Pengaturan', ['kunci', 'nilai']);
  var rows = bacaObjek_(sh);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].kunci === k) { sh.getRange(i + 2, 2).setValue(v); return; }
  }
  tulisObjek_(sh, { kunci: k, nilai: v });
}
