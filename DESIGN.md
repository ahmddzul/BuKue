# DESIGN.md · BuKue

## Identitas

BuKue adalah buku catatan dapur untuk pembuat kue rumahan yang jualan lewat status WhatsApp dan Instagram. Rasanya seperti etalase toko kue yang rapi: putih bersih, satu warna pastel yang hangat, dan angka yang mudah dibaca sambil tangan masih kena tepung.

Bahasa: santai dan kekinian, menyapa dengan "kamu". Tanpa tanda pisah panjang. Emoji hanya di sapaan Beranda dan template WhatsApp.

## Dial desain

`ENERGY 2 / RHYTHM 2 / MOTION 2`

- **ENERGY 2**: ceria tapi tetap alat kerja. Satu titik fokus per layar.
- **RHYTHM 2**: daftar dan kartu konsisten, dengan satu jeda yang jelas di Beranda (kartu untung).
- **MOTION 2**: animasi pendek yang membantu memahami perpindahan, semuanya mati saat HP diatur "kurangi gerakan".

## Motif identitas

**Tepi bergerigi** seperti kertas alas kue (doily) atau cup kertas muffin. Dipakai di bawah kartu untung Beranda dan di ikon aplikasi. Tidak dipakai di tempat lain supaya tetap istimewa.

## Warna

Satu warna aksen pastel per tema, plus netral. Tiga token per tema:

- `--acc`: isian pastel (chip aktif, tombol utama, tombol tambah).
- `--on-acc`: tulisan di atas pastel. Selalu warna tua senada, tidak pernah putih.
- `--acc-ink`: tulisan berwarna di latar putih (link, angka HPP). Di mode gelap diganti versi muda.

| Tema | `--acc` | `--on-acc` | Kontras on-acc/acc | `--acc-ink` | Kontras ink/putih | Ink mode gelap | Kontras di permukaan gelap |
|---|---|---|---|---|---|---|---|
| Baby Pink (bawaan) | #F8C8D8 | #5E1A33 | 8,52 | #A8285A | 6,74 | #F5B3CA | 9,61 |
| Lavender | #D9CCF5 | #3D2770 | 8,07 | #6A45C2 | 6,48 | #CDBDF5 | 9,61 |
| Baby Blue | #C7E2F7 | #163E5F | 8,29 | #1D669F | 6,08 | #A9D3F2 | 10,48 |
| Koral | #FAC6B8 | #6A2414 | 7,38 | #AD381C | 6,25 | #F8B4A2 | 9,49 |
| Peach | #FBD5B5 | #633110 | 7,73 | #9C4C14 | 6,07 | #F8C59B | 10,60 |
| Mint | #C2EBD9 | #134A35 | 7,86 | #1C7450 | 5,73 | #9FE0C3 | 10,98 |

Netral: latar `#FBF8F9` (gelap `#16131A`), permukaan `#FFFFFF` (gelap `#211D26`), teks `#24202A`, teks kedua `#6B6470` (5,70 di putih; gelap `#ABA3B2`, 6,79).

Semua angka di atas lolos WCAG AA (minimal 4,5:1). Diuji otomatis di 6 tema × 2 mode pada Beranda, Pesanan, detail pesanan, Produksi, Produk, Lainnya, dan Pengaturan.

Warna status (hijau lunas, kuning DP, merah belum bayar) selalu disertai tulisan, tidak hanya warna.

## Efek, masing-masing di satu tempat

| Efek | Hanya di | Alasan |
|---|---|---|
| Gradien | Kartu untung Beranda | Satu-satunya titik fokus. Angka yang paling ingin dilihat pemilik usaha. |
| Kaca (blur) | Menu bawah dan baris periode di kartu untung | Menu tetap terasa ringan di atas isi yang digulir. |
| Glow | Tombol tambah | Aksi paling sering: mencatat pesanan. |
| Bayangan | Lapisan melayang (lembar bawah, toast, kartu versi baru, tombol tambah) | Menandai yang ada di atas halaman. |

## Huruf

**Plus Jakarta Sans**, disimpan di aplikasi (tidak dimuat dari Google). Dirancang untuk Jakarta, bentuknya ramah dan bulat tanpa kekanak-kanakan, dan angkanya jelas untuk nominal rupiah. Satu file variabel (berat 200 sampai 800), sekitar 30 KB.

Angka rupiah memakai `tabular-nums` supaya kolom nominal sejajar.

## Ikon

Ikon garis 2 px yang digambar sendiri, masing-masing benda nyata di dapur atau toko: oven (Produksi), kue dengan lilin (Produk), karung tepung (Bahan baku), struk (Pesanan), dompet (Pembayaran), keranjang (Titipan). Tidak memakai pustaka ikon.

## Logo

**Sementara**: tulisan "Bu" dengan tepi bergerigi di atas gradien Baby Pink. Ini placeholder. Kalau sudah punya logo sendiri, ganti file di folder `icons/` (192, 512, 512 maskable, dan 180 untuk iPhone).

## Animasi dan tujuannya

| Animasi | Tujuan |
|---|---|
| Halaman masuk (geser 8 px + muncul, 0,22 detik) | Memberi tanda halaman berganti. |
| Daftar muncul berurutan | Mata mengikuti isi dari atas ke bawah. |
| Angka untung menghitung naik | Menarik perhatian ke satu angka terpenting saat periode diganti. |
| Lembar bawah naik | Menunjukkan lembar itu bisa ditutup ke bawah. |
| Konfeti kecil saat Lunas, produksi selesai, penjualan stok, atau setoran | Merayakan momen yang ditunggu. Hanya 1,4 detik. |
| Layar pembuka (muncul pelan, hilang setelah 2,4 detik atau diketuk) | Sapaan dan kalimat penyemangat sebelum mulai bekerja. Bisa dimatikan. |

## Kalimat penyemangat

120 kalimat di `js/kalimat.js`: 78 gaya sedang (65%), 30 santai/lucu (25%), 12 formal (10%). Semuanya tentang dunia kue dan usaha rumahan. Urutan diacak dan disimpan di HP, sehingga tidak ada kalimat yang muncul dua kali sebelum semuanya tampil.

Semua mati dengan `prefers-reduced-motion: reduce`.

## Tata letak

- Mobile-first, 320 px sampai desktop. Isi dibatasi 720 px di layar lebar.
- Hanya area isi (`#view`) yang digulir. Judul menempel di atas, menu bawah menempel di bawah (perbaikan gulir iPhone).
- Target sentuh minimal 44 px.
