# BuKue

Aplikasi pencatatan bisnis kue rumahan di HP: pesanan PO, HPP dari harga bahan, jadwal produksi dan daftar belanja, serta tagihan WhatsApp dengan QRIS. Data tersimpan di Google Sheet milik kamu sendiri, dan bisa dipakai di beberapa HP sekaligus dengan satu akun.

Versi sekarang: **0.1.0**

---

## Fitur

**Sudah ada di v0.1**

- **Bahan baku**: harga beli, isi kemasan, konversi kg/g, L/ml, butir, sdm, sdt. Harga per gram/ml dihitung otomatis. Riwayat harga tersimpan, dan saat harga berubah BuKue memberi tahu resep mana yang ikut berubah.
- **Resep & HPP**: HPP per pcs/loyang/toples dari bahan, gas/listrik (persen atau Rp per adonan), tenaga, susut, dan kemasan. Ada saran harga jual (target margin atau untung Rp, dibulatkan ke Rp 500 atau Rp 1.000) dan simulasi "mau buat 50 pcs".
- **Produk & varian**: buatan sendiri (terhubung ke resep atau HPP manual) atau titipan (harga setor). Satuan jual bisa diatur per produk.
- **Pesanan**: pelanggan, produk dan varian, tanggal dan jam ambil, cara ambil (diambil, diantar, kurir), alamat, catatan, diskon, ongkir, DP. Status Baru sampai Selesai atau Batal.
- **Pembayaran**: dicatat sebagai riwayat. Status Belum bayar, DP, atau Lunas dihitung otomatis.
- **Modal terkunci**: HPP disimpan di setiap pesanan. Kalau harga bahan atau resep berubah, BuKue bertanya apakah pesanan yang belum lunas ikut diperbarui. Ada rincian untung per pesanan.
- **Biaya yang kamu tanggung** (misalnya ongkir) mengurangi untung.
- **Tagih lewat WhatsApp**: teks dari template, pilihan bagikan gambar QRIS + teks, salin teks lalu buka WhatsApp, atau simpan gambar QRIS. Bisa menggabung beberapa tagihan satu pelanggan.
- **Template pesan** yang bisa diubah sendiri, dengan kata kunci seperti `{nama}`, `{total}`, `{sisa}`. Baris yang kata kuncinya kosong otomatis hilang.
- **Produksi**: total yang harus dibuat per tanggal, daftar pesanan, daftar belanja dari resep (bisa dikurangi stok bahan kalau fitur stok dinyalakan), dan tombol "Produksi selesai" yang mengubah pesanan jadi Siap.
- **Beranda**: kartu untung per periode (7 hari, 30 hari, bulanan, tahunan dengan grafik 12 bulan, semua), kartu pesanan masuk dengan rincian lunas, DP, dan belum dibayar, produksi hari ini dan besok, tagihan berjalan, produk paling laku dan paling cuan, pelanggan setia.
- **Pelanggan**: riwayat pesanan, total belanja, tagihan berjalan, sapaan, WA, alamat, catatan.
- **Akun**: buat akun sekali, HP lain tinggal masuk. Pemilik bisa menambah akun anggota (misalnya asisten). Bisa melihat HP yang sedang masuk dan mengeluarkan HP lain.
- **Offline**: semua perubahan disimpan di HP dulu dan dikirim otomatis saat ada sinyal.
- **Tampilan**: 6 tema pastel (Baby Pink bawaan), mode terang, gelap, atau ikuti HP.
- **Mode coba** dengan data contoh, tanpa perlu menyambungkan Google Sheet.

**Rencana berikutnya**

- v0.2: stok ready (penjualan dari stok, peringatan kedaluwarsa, sisa dibuang), open PO dengan kuota dan teks promosi.
- v0.3: titipan dan setoran ke penitip, layar pembuka dengan 120 kalimat penyemangat, Google Sheet template siap salin.

---

## Cara kerja dan keamanan data

```
HP kamu (BuKue)  ⇄  Web App Apps Script  ⇄  Google Sheet milik kamu
```

- Aplikasinya hanya halaman web biasa yang di-hosting gratis di GitHub Pages. Tidak ada server lain.
- Semua data (bahan, resep, pesanan, pembayaran) disimpan di Google Sheet milik kamu. Gambar QRIS disimpan di folder Google Drive kamu bernama **BuKue File**.
- Untuk masuk, kamu memakai nama pengguna dan kata sandi. Kata sandi tidak disimpan sebagai teks asli, melainkan sebagai hash (acak satu arah) di tab **Akun**.
- Setelah masuk, HP mendapat token sesi. Token juga disimpan sebagai hash di tab **Sesi**, jadi orang yang membaca Sheet pun tidak bisa memakainya.
- Setelah 5 kali salah kata sandi, akun dikunci 10 menit.
- Akun pertama hanya bisa dibuat dengan **kode setup** dari menu Sheet, supaya orang lain yang kebetulan tahu link Web App tidak bisa mendaftar duluan.
- Data juga disimpan di HP (supaya cepat dan bisa offline). Saat kamu menekan Keluar, data di HP itu dihapus. Data di Google Sheet tetap aman.

Jangan mengubah isi tab **Akun**, **Sesi**, dan **Pengaturan** secara manual. Tab lain boleh dibaca dan dirapikan, tapi jangan mengubah kolom `id`, `updatedAt`, dan `_ts`.

---

## Cara pasang (5 langkah)

Perlu: akun Google dan akun GitHub (gratis). Langkah 2 sampai 4 paling nyaman dilakukan di komputer. Kalau hanya punya HP, lihat bagian **Setup dari HP** di bawah.

### 1. GitHub: unggah aplikasi

1. Masuk ke [github.com](https://github.com), klik **New** untuk membuat repository baru. Beri nama, misalnya `bukue`. Pilih **Public**, lalu **Create repository**.
2. Klik **uploading an existing file**. Ekstrak file zip BuKue di komputer, lalu seret **semua isi foldernya** (bukan foldernya) ke halaman itu. Klik **Commit changes**.
3. Buka **Settings** > **Pages**. Di **Branch**, pilih `main` dan folder `/ (root)`, lalu **Save**.
4. Tunggu sekitar 1 menit. Link aplikasi muncul di halaman itu, bentuknya `https://namakamu.github.io/bukue/`.

### 2. Google Sheet: siapkan tempat data

1. Buka [sheets.new](https://sheets.new) untuk membuat Google Sheet baru. Beri nama, misalnya **BuKue Data**.

### 3. Apps Script: pasang kode server

1. Di Google Sheet itu, buka menu **Ekstensi** > **Apps Script**.
2. Hapus semua isi `Code.gs`, lalu tempel isi file `apps-script/Code.gs` dari zip. Klik ikon simpan.
3. Kembali ke tab Google Sheet dan muat ulang halaman. Menu **BuKue** muncul di sebelah kanan menu Bantuan.
4. Klik **BuKue** > **Siapkan**. Google meminta izin:
   - Pilih akun kamu.
   - Kalau muncul "Google belum memverifikasi aplikasi ini", klik **Lanjutan** lalu **Buka (tidak aman)**. Ini wajar karena skrip ini milik kamu sendiri.
   - Klik **Izinkan**.
5. Klik lagi **BuKue** > **Siapkan**. Muncul **kode setup** (8 huruf). Catat kode ini.

### 4. Web App: terbitkan

1. Di Apps Script, klik **Terapkan** > **Deployment baru**.
2. Klik ikon roda gigi di samping "Pilih jenis", pilih **Aplikasi web**.
3. Isi:
   - **Jalankan sebagai**: Saya
   - **Yang memiliki akses**: Siapa saja
4. Klik **Terapkan**, izinkan kalau diminta, lalu salin **URL aplikasi web** (berakhiran `/exec`).
5. Kembali ke GitHub, buka file `js/config.js`, klik ikon pensil, dan tempel URL tadi di antara tanda kutip:
   ```js
   webAppUrl: 'https://script.google.com/macros/s/AKfy.../exec',
   ```
   Klik **Commit changes**. Dengan ini, semua HP cukup masuk dengan nama pengguna dan kata sandi.

   Kalau langkah 5 dilewati, BuKue akan menanyakan link ini sekali di setiap HP.

### 5. HP: buat akun dan pasang di layar utama

1. Buka link GitHub Pages dari langkah 1 di HP.
2. Pilih **Buat akun baru**. Isi nama, nama pengguna, kata sandi, dan kode setup dari langkah 3.
3. Pasang di layar utama:
   - **Android (Chrome)**: menu titik tiga > **Tambahkan ke layar utama** atau **Instal aplikasi**.
   - **iPhone (Safari)**: tombol **Bagikan** > **Tambah ke Layar Utama**.
4. Buka **Lainnya** > **Pengaturan**: isi nama toko, info rekening, dan unggah gambar QRIS.

---

## Setup dari HP (tanpa komputer)

Apps Script tidak bisa dibuka lewat aplikasi Google Sheets. Pakai browser:

1. Buka Google Sheet di **Chrome** (Android) atau **Safari** (iPhone), jangan di aplikasi Sheets.
2. Nyalakan mode desktop:
   - Chrome: menu titik tiga > centang **Situs desktop**.
   - Safari: ikon **aA** di bilah alamat > **Minta Situs Web Desktop**.
3. Ikuti langkah 3 dan 4 di atas. Tampilannya kecil, perbesar dengan dua jari.
4. Untuk GitHub, buka [github.com](https://github.com) di browser. Unggah file zip yang sudah diekstrak lewat **Add file** > **Upload files**. Di Android, ekstrak zip dengan aplikasi File bawaan. Di iPhone, ketuk file zip di aplikasi File untuk mengekstraknya.

---

## Menyambungkan HP kedua

1. Buka link BuKue di HP kedua.
2. Pilih **Masuk**, lalu pakai nama pengguna dan kata sandi yang sama.
3. Selesai. Data tersinkron sekitar tiap 90 detik, setiap aplikasi dibuka, dan setiap kali ada perubahan.

Untuk asisten atau keluarga yang ikut mencatat, sebaiknya buatkan akun sendiri: **Lainnya** > **Pengaturan** > **Akun anggota**. Datanya tetap sama, tapi kata sandimu tidak perlu dibagi.

Kalau HP hilang: **Pengaturan** > **HP yang masuk** > **Keluarkan semua HP lain**, lalu ganti kata sandi.

---

## Cara memperbarui

1. Unduh zip versi baru, ekstrak, lalu unggah semua isinya ke repository GitHub yang sama (**Add file** > **Upload files**). File lama otomatis ditimpa. **Jangan menimpa `js/config.js`** kalau kamu sudah mengisi link Web App di sana (atau isi ulang setelah mengunggah).
2. Kalau catatan rilis menyebut `Code.gs` berubah:
   1. Tempel ulang isi `Code.gs` di Apps Script, simpan.
   2. **Terapkan** > **Kelola deployment** > ikon pensil > **Versi**: **Versi baru** > **Terapkan**. Link Web App tetap sama, jadi HP tidak perlu diatur ulang.
3. Di HP, BuKue menampilkan kartu **Versi baru tersedia**. Ketuk **Muat ulang**.

---

## Masalah dan solusinya

| Masalah | Solusi |
|---|---|
| "Kode setup salah" | Buka Sheet > **BuKue** > **Lihat kode setup**. Huruf besar atau kecil tidak berpengaruh. |
| "Akun pertama sudah dibuat" | Akun sudah ada. Pilih **Masuk**. |
| "Tidak bisa terhubung" | Cek internet. Pastikan Web App diterbitkan dengan akses **Siapa saja** dan link berakhiran `/exec`. |
| "Balasan server tidak terbaca" | Link Web App salah, atau deployment belum diperbarui setelah `Code.gs` diubah. |
| "Sesi berakhir" | HP ini dikeluarkan dari HP lain atau kata sandi direset. Masuk lagi. Data yang belum terkirim tetap aman. |
| Lupa kata sandi | Buka Sheet > **BuKue** > **Reset kata sandi akun**. |
| "Terlalu banyak percobaan" | Tunggu 10 menit lalu coba lagi. |
| Tulisan di pojok kanan atas "Offline" atau "3 antre" | Perubahan belum terkirim. Akan dikirim otomatis saat sinyal kembali. Ketuk tulisan itu untuk mencoba sekarang. |
| Di iPhone, teks tagihan tidak ikut terkirim bersama QRIS | BuKue sudah menyalin teksnya. Tempel di kolom chat WhatsApp. |
| QRIS tidak muncul di HP kedua | Pastikan HP pertama mengunggah QRIS saat online. Kalau tidak, unggah ulang. |
| Tampilan tidak berubah setelah update | Tutup BuKue, buka lagi, lalu ketuk **Muat ulang** di kartu versi baru. |
| Angka untung Rp 0 | Untung hanya dari pesanan berstatus **Selesai**. |

---

## Dukungan dan kredit

Dibuat oleh **[@ahmddzul](https://instagram.com/ahmddzul)**.

Kalau BuKue membantu bisnismu, kamu bisa mendukung lewat [Saweria](https://saweria.co/ahmddzul). Semua fitur tetap bisa dipakai tanpa dukungan.

Huruf Plus Jakarta Sans memakai lisensi SIL Open Font License (`fonts/OFL.txt`).

---

## Untuk pengembang

- Tanpa proses build: HTML, CSS, dan JavaScript modul biasa.
- Uji hitungan dan sinkron (menjalankan `Code.gs` asli di atas tiruan Apps Script): `node tests/run.mjs`
- Server tiruan untuk uji di browser: `node tests/mock-server.mjs 8124`, lalu isi link Web App `http://localhost:8124/exec`.
