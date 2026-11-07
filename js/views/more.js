import { h, ic, rp, angka, tgl, inisial, toast, openSheet, closeSheet, konfirmasi, kecilkanGambar, nomorWa } from '../util.js';
import * as C from '../calc.js';
import * as D from '../data.js';
import { TEMPLATE } from '../seed.js';
import { chips, field, money, kosong, tagBayar, kv, formData } from './ui.js';
import { itemPesanan } from './home.js';
import { tawarkanUpdateHpp } from './products.js';
import { qrisLokal, simpanQrisLokal } from '../qris.js';
import { prefs, apiPublik, VERSI_APP } from '../shared.js';
import { tampilkanSplash, SEMUA } from '../splash.js';
import { etalase, sprinkle } from '../ilustrasi.js';

const { num } = C;
const IG = 'https://instagram.com/ahmddzul';
const SAWERIA = 'https://saweria.co/ahmddzul';
let cariBahan = '', cariPel = '';

export const kredit = () => `<a class="credit" href="${IG}" target="_blank" rel="noopener">${ic('insta')}Dibuat oleh @ahmddzul</a>`;

const TEMA = [['pink', 'Baby Pink', '#F8C8D8'], ['lavender', 'Lavender', '#D9CCF5'], ['blue', 'Baby Blue', '#C7E2F7'], ['koral', 'Koral', '#FAC6B8'], ['peach', 'Peach', '#FBD5B5'], ['mint', 'Mint', '#C2EBD9']];

function menuItem(go, icon, judul, sub = '', extra = '') {
  return `<button class="item" data-go="${go}"><div class="av">${ic(icon)}</div><div class="grow"><div class="t">${judul}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>${extra}${ic('next')}</button>`;
}
const segera = (icon, judul, ver) => `<div class="item" aria-disabled="true"><div class="av" style="opacity:.6">${ic(icon)}</div><div class="grow"><div class="t muted">${judul}</div><div class="s">Segera hadir di ${ver}</div></div></div>`;

function satuanBahanLabel(b) { return `${angka(b.isi, 2)} ${C.UNIT_LABEL[b.satuan] || b.satuan}`; }

export const views = {
  more: {
    title: 'Lainnya',
    render(p, ctx) {
      const S = ctx.S;
      const kiriman = S.all('pesanan').filter((x) => x.cara && x.cara !== 'ambil' && !['selesai', 'batal'].includes(x.status)).length;
      const akun = ctx.akun;
      return `
        <div class="menu-hero">${sprinkle(70, 40)}${sprinkle(70, 40, 'kanan')}${etalase()}<h2>${h(D.setelan().namaToko || 'BuKue')}</h2><p>Catatan dapur kue kamu</p></div>
        <div class="list">
          ${menuItem('bahan', 'sack', 'Bahan baku', `${S.all('bahan').length} bahan dan harganya`)}
          ${menuItem('customers', 'users', 'Pelanggan', `${S.all('pelanggan').length} pelanggan`)}
          ${menuItem('kiriman', 'truck', 'Kiriman', kiriman ? `${kiriman} pesanan perlu diantar` : 'Pesanan yang diantar atau lewat kurir')}
          ${menuItem('stok', 'box', 'Stok ready', (() => { const n = D.stokPerVarian().reduce((a, x) => a + x.sisa, 0); const kd = D.hampirKedaluwarsa(1).length; return n ? `${angka(n, 2)} item siap jual${kd ? ` · ${kd} hampir kedaluwarsa` : ''}` : 'Kue siap jual tanpa pesanan'; })())}
          ${menuItem('penitips', 'basket', 'Titipan & penitip', (() => { const b = D.titipanBelumSetor(); return b.total ? `Belum disetor ${rp(b.total)}` : `${S.all('penitip').length} penitip`; })())}
          ${menuItem('openPOs', 'calendar', 'Open PO', `${D.openPOAktif().length} sedang buka`)}
        </div>
        <div class="list">
          ${menuItem('settings', 'gear', 'Pengaturan', 'Toko, rekening & QRIS, tampilan, template, akun')}
          ${menuItem('faq', 'help', 'FAQ & panduan')}
        </div>
        <div class="card"><div class="row">${ic('coffee')}<div class="grow"><b>Beliin aku kopi?</b><div class="small muted">Semua fitur tetap bisa dipakai tanpa dukungan.</div></div></div>
          <a class="btn block" style="margin-top:10px" href="${SAWERIA}" target="_blank" rel="noopener">Dukung lewat Saweria</a></div>
        <div style="text-align:center;margin-top:8px">${kredit()}
          <p class="small muted" style="margin:2px 0">BuKue versi ${VERSI_APP}${akun ? ` · masuk sebagai ${h(akun.username)}` : ''}</p>
          <button class="btn" data-act="keluar" style="margin-top:8px">${ic('logout')}${ctx.demo ? 'Keluar dari mode coba' : 'Keluar'}</button></div>`;
    },
    actions: {
      keluar: async (b, e, ctx) => {
        const n = ctx.S.pending;
        const pesan = ctx.demo ? 'Data contoh akan dihapus dari HP ini.' : n ? `Ada ${n} perubahan yang belum terkirim ke Google Sheet. Kalau keluar sekarang, perubahan itu hilang.` : 'Data di HP ini dihapus. Data di Google Sheet tetap aman, dan muncul lagi saat kamu masuk.';
        if (!(await konfirmasi('Keluar?', pesan, { ya: 'Keluar', bahaya: !!n }))) return;
        ctx.keluar({ hapusLokal: true });
      },
    },
  },

  // ---------- Bahan ----------
  bahan: {
    title: 'Bahan baku',
    fab: { label: 'Tambah bahan', go: 'bahanForm' },
    render(p, ctx) {
      const S = ctx.S;
      const all = S.all('bahan').sort((a, b) => a.nama.localeCompare(b.nama));
      if (!all.length) return kosong('sack', 'Belum ada bahan', 'Catat bahan yang kamu beli beserta harga dan isi kemasannya. Contoh: Tepung terigu, 1 kg, Rp 14.000.', `<button class="btn pri" data-go="bahanForm">${ic('plus')}Tambah bahan</button>`);
      const q = cariBahan.toLowerCase();
      const list = all.filter((b) => !q || b.nama.toLowerCase().includes(q));
      const stok = !!D.setelan().stokBahan;
      return `<div class="field"><label for="cari-bahan" class="sr">Cari bahan</label><input type="search" id="cari-bahan" placeholder="Cari bahan" value="${h(cariBahan)}"></div>
        ${list.length ? `<div class="list stagger">${list.map((b, k) => {
          const d = C.labelHargaDasar(b);
          return `<button class="item" style="--i:${Math.min(k, 12)}" data-go="bahanForm" data-id="${h(b.id)}"><div class="grow"><div class="t ell">${h(b.nama)}</div><div class="s">${satuanBahanLabel(b)} · ${rp(b.harga)}${stok && b.stok !== '' && b.stok !== undefined ? ` · stok ${angka(b.stok, 2)} ${C.UNIT_LABEL[b.satuan] || b.satuan}` : ''}</div></div><div class="r small num">${d.harga !== null ? `${rp(d.harga)}<div class="muted">per ${C.UNIT_LABEL[d.unit] || d.unit}</div>` : ''}</div></button>`;
        }).join('')}</div>` : kosong('search', 'Tidak ketemu', 'Coba kata lain.')}`;
    },
    input(el, ctx) {
      if (el.id === 'cari-bahan') {
        cariBahan = el.value;
        clearTimeout(views.bahan._t);
        views.bahan._t = setTimeout(() => { ctx.rerender(); const i = document.getElementById('cari-bahan'); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }, 200);
      }
    },
  },

  bahanForm: {
    form: true,
    title: (p) => (p.id ? 'Ubah bahan' : 'Bahan baru'),
    render({ id }, ctx) {
      const S = ctx.S;
      const b = id ? S.get('bahan', id) || {} : { satuan: 'kg', isi: 1 };
      const riwayat = id ? S.where('riwayatHarga', 'bahanId', id).sort((a, c) => String(c.tanggal).localeCompare(String(a.tanggal))).slice(0, 6) : [];
      const dipakai = id ? D.resepPakaiBahan(id) : [];
      const stok = !!D.setelan().stokBahan;
      return `<form novalidate>
        <div class="card">
          ${field('Nama bahan', `<input type="text" id="b-nama" name="nama" value="${h(b.nama || '')}" required placeholder="Misal: Tepung terigu">`, { id: 'b-nama' })}
          ${field('Harga beli', money('harga', b.harga ?? '', { id: 'b-harga', attrs: 'required' }), { id: 'b-harga' })}
          <div class="grid2">${field('Isi kemasan', `<input type="number" inputmode="decimal" min="0" step="any" id="b-isi" name="isi" value="${h(b.isi ?? '')}" required>`, { id: 'b-isi' })}
          ${field('Satuan', `<select id="b-sat" name="satuan">${['kg', 'g', 'l', 'ml', 'butir', 'pcs', 'pack'].map((u) => `<option value="${u}" ${u === b.satuan ? 'selected' : ''}>${C.UNIT_LABEL[u]}</option>`).join('')}</select>`, { id: 'b-sat' })}</div>
          <div class="hpp-box" id="b-info" aria-live="polite" style="margin-bottom:14px"></div>
          <details ${b.isiButir || b.beratSdm || b.beratSdt ? 'open' : ''}><summary class="small" style="font-weight:700;min-height:44px;display:flex;align-items:center">Konversi tambahan (butir, sdm, sdt)</summary>
            ${field('Isi per kemasan dalam butir/pcs', `<input type="number" inputmode="decimal" min="0" step="any" id="b-butir" name="isiButir" value="${h(b.isiButir ?? '')}" placeholder="Misal: telur 1 kg isi 16">`, { id: 'b-butir', hint: 'Supaya resep bisa memakai satuan butir.' })}
            <div class="grid2">${field('Berat 1 sdm (g/ml)', `<input type="number" inputmode="decimal" min="0" step="any" id="b-sdm" name="beratSdm" value="${h(b.beratSdm ?? '')}">`, { id: 'b-sdm' })}
            ${field('Berat 1 sdt (g/ml)', `<input type="number" inputmode="decimal" min="0" step="any" id="b-sdt" name="beratSdt" value="${h(b.beratSdt ?? '')}">`, { id: 'b-sdt' })}</div>
          </details>
          ${stok ? field('Stok sekarang', `<input type="number" inputmode="decimal" min="0" step="any" id="b-stok" name="stok" value="${h(b.stok ?? '')}">`, { id: 'b-stok', hint: 'Dalam satuan di atas, misalnya 2,5 kg.' }) : ''}
        </div>
        ${dipakai.length ? `<p class="small muted" style="margin:0 2px 12px">Dipakai di resep: ${h(dipakai.map((r) => r.nama).join(', '))}.</p>` : ''}
        ${riwayat.length ? `<div class="card"><h2>Riwayat harga</h2>${riwayat.map((r) => kv(h(tgl(r.tanggal, { tahun: true })), `${rp(r.hargaLama)} → ${rp(r.hargaBaru)}`)).join('')}</div>` : ''}
        <button class="btn pri block">${ic('check')}Simpan bahan</button>
        ${id ? `<button type="button" class="btn danger block" data-act="hapus" style="margin-top:10px">${ic('trash')}Hapus bahan</button>` : ''}
      </form>`;
    },
    mount(el) { const f = el.querySelector('form'); if (f) infoBahan(f); },
    input(el) { const f = el.form || el.closest('form'); if (f) infoBahan(f); },
    change(el) { views.bahanForm.input(el); },
    actions: {
      hapus: async (b, e, ctx) => {
        const id = currentId();
        const n = D.resepPakaiBahan(id).length;
        if (!(await konfirmasi('Hapus bahan?', n ? `Bahan ini dipakai ${n} resep. HPP resep itu akan berkurang.` : 'Bahan ini akan dihapus.', { ya: 'Hapus', bahaya: true }))) return;
        ctx.S.remove('bahan', id);
        ctx.back();
      },
    },
    submit(form, ctx) {
      const S = ctx.S;
      const f = formData(form);
      if (!f.nama) return toast('Isi nama bahan');
      if (!(num(f.isi) > 0)) return toast('Isi kemasan harus lebih dari 0');
      const id = currentId();
      const lama = id ? S.get('bahan', id) : null;
      const baru = { ...(lama || {}), ...(id ? { id } : {}), nama: f.nama, harga: num(f.harga), isi: num(f.isi), satuan: f.satuan, isiButir: f.isiButir === '' ? '' : num(f.isiButir), beratSdm: f.beratSdm === '' ? '' : num(f.beratSdm), beratSdt: f.beratSdt === '' ? '' : num(f.beratSdt) };
      if ('stok' in f) baru.stok = f.stok === '' ? '' : num(f.stok);
      const ops = [['bahan', baru]];
      const berubah = lama && (num(lama.harga) !== baru.harga || num(lama.isi) !== baru.isi || lama.satuan !== baru.satuan);
      if (berubah) ops.push(['riwayatHarga', { bahanId: id, tanggal: D.today(), hargaLama: num(lama.harga), hargaBaru: baru.harga, isi: baru.isi, satuan: baru.satuan }]);
      S.putMany(ops);
      if (berubah) {
        const rs = D.resepPakaiBahan(id);
        toast(rs.length ? `Harga diperbarui. HPP ${rs.length} resep ikut berubah: ${rs.map((r) => r.nama).join(', ')}` : 'Harga diperbarui', 4000);
      } else toast('Bahan tersimpan');
      ctx.back();
      if (berubah) setTimeout(() => tawarkanUpdateHpp(ctx), 300);
    },
  },

  // ---------- Pelanggan ----------
  customers: {
    title: 'Pelanggan',
    fab: { label: 'Tambah pelanggan', go: 'customerForm' },
    render(p, ctx) {
      const S = ctx.S;
      const all = S.all('pelanggan').sort((a, b) => a.nama.localeCompare(b.nama));
      if (!all.length) return kosong('users', 'Belum ada pelanggan', 'Pelanggan juga otomatis tersimpan saat kamu mencatat pesanan.', `<button class="btn pri" data-go="customerForm">${ic('plus')}Tambah pelanggan</button>`);
      const q = cariPel.toLowerCase();
      const list = all.filter((x) => !q || (x.nama + ' ' + (x.wa || '')).toLowerCase().includes(q));
      return `<div class="field"><label for="cari-pel" class="sr">Cari pelanggan</label><input type="search" id="cari-pel" placeholder="Cari nama atau nomor" value="${h(cariPel)}"></div>
        ${list.length ? `<div class="list stagger">${list.map((x, k) => {
          const ps = S.where('pesanan', 'pelangganId', x.id).filter((p) => p.status !== 'batal');
          const sisa = ps.reduce((s, p) => s + D.pesananInfo(p).sisa, 0);
          return `<button class="item" style="--i:${Math.min(k, 12)}" data-go="customer" data-id="${h(x.id)}"><div class="av">${h(inisial(x.nama))}</div><div class="grow"><div class="t ell">${h(x.nama)}</div><div class="s">${ps.length} pesanan${x.wa ? ' · ' + h(x.wa) : ''}</div></div>${sisa > 0 ? `<div class="r"><span class="tag bad">${rp(sisa)}</span></div>` : ''}</button>`;
        }).join('')}</div>` : kosong('search', 'Tidak ketemu', 'Coba kata lain.')}`;
    },
    input(el, ctx) {
      if (el.id === 'cari-pel') {
        cariPel = el.value;
        clearTimeout(views.customers._t);
        views.customers._t = setTimeout(() => { ctx.rerender(); const i = document.getElementById('cari-pel'); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }, 200);
      }
    },
  },

  customer: {
    title: (p, ctx) => ctx.S.get('pelanggan', p.id)?.nama || 'Pelanggan',
    fab: (p) => ({ label: 'Pesanan baru untuk pelanggan ini', go: 'orderForm', params: { pelanggan: p.id } }),
    render({ id }, ctx) {
      const S = ctx.S;
      const x = S.get('pelanggan', id);
      if (!x) return kosong('users', 'Pelanggan tidak ditemukan', 'Mungkin sudah dihapus dari HP lain.');
      const ps = S.where('pesanan', 'pelangganId', id).sort((a, b) => String(b.tglPesan).localeCompare(String(a.tglPesan)));
      const aktif = ps.filter((p) => p.status !== 'batal').map((p) => ({ p, i: D.pesananInfo(p) }));
      const total = aktif.reduce((s, a) => s + a.i.total, 0);
      const sisa = aktif.reduce((s, a) => s + a.i.sisa, 0);
      return `<div class="card"><div class="row"><div class="av">${h(inisial(x.nama))}</div><div class="grow"><b>${h(x.sapaan ? x.sapaan + ' ' : '')}${h(x.nama)}</b><div class="small muted">${h(x.wa || 'Belum ada nomor WA')}</div></div>
          ${x.wa ? `<a class="iconbtn" href="https://wa.me/${nomorWa(x.wa)}" target="_blank" rel="noopener" aria-label="Chat WhatsApp">${ic('chat')}</a>` : ''}</div>
          ${x.alamat ? `<p class="small" style="margin:10px 0 0">${h(x.alamat)}</p>` : ''}
          ${x.catatan ? `<div class="banner acc" style="margin:10px 0 0">${ic('text')}<span class="grow">${h(x.catatan)}</span></div>` : ''}
        </div>
        <div class="stats"><div class="stat"><b class="num">${aktif.length}</b><span>pesanan</span></div><div class="stat"><b class="num">${rp(total)}</b><span>total belanja</span></div><div class="stat"><b class="num">${rp(sisa)}</b><span>tagihan</span></div></div>
        <div class="sec"><span>Riwayat pesanan</span></div>
        ${ps.length ? `<div class="list">${ps.map((p) => itemPesanan(p)).join('')}</div>` : '<p class="small muted">Belum ada pesanan.</p>'}
        <div class="btns" style="margin-top:12px"><button class="btn" data-go="customerForm" data-id="${h(id)}">${ic('edit')}Ubah</button></div>`;
    },
  },

  customerForm: {
    form: true,
    title: (p) => (p.id ? 'Ubah pelanggan' : 'Pelanggan baru'),
    render({ id }, ctx) {
      const x = id ? ctx.S.get('pelanggan', id) || {} : { sapaan: D.setelan().sapaanBawaan ?? 'Kak' };
      return `<form novalidate><div class="card">
        ${field('Nama', `<input type="text" id="c-nama" name="nama" value="${h(x.nama || '')}" required>`, { id: 'c-nama' })}
        <div class="field"><span class="lbl2">Sapaan</span>${chips('sapaan', D.SAPAAN.map((s) => [s, s]), x.sapaan ?? '', { label: 'Sapaan' })}<div class="hint">Ketuk lagi untuk tanpa sapaan.</div></div>
        ${field('Nomor WhatsApp', `<input type="tel" id="c-wa" name="wa" inputmode="tel" value="${h(x.wa || '')}" placeholder="08…">`, { id: 'c-wa' })}
        ${field('Alamat', `<textarea id="c-al" name="alamat" rows="2" style="min-height:70px">${h(x.alamat || '')}</textarea>`, { id: 'c-al' })}
        ${field('Catatan', `<textarea id="c-cat" name="catatan" rows="2" style="min-height:70px" placeholder="Alergi, kesukaan, dll.">${h(x.catatan || '')}</textarea>`, { id: 'c-cat' })}
      </div>
      <button class="btn pri block">${ic('check')}Simpan</button>
      ${id ? `<button type="button" class="btn danger block" data-act="hapus" style="margin-top:10px">${ic('trash')}Hapus pelanggan</button>` : ''}</form>`;
    },
    actions: {
      hapus: async (b, e, ctx) => {
        if (!(await konfirmasi('Hapus pelanggan?', 'Pesanan lama tetap ada tapi tanpa nama pelanggan.', { ya: 'Hapus', bahaya: true }))) return;
        ctx.S.remove('pelanggan', currentId());
        ctx.backN(2);
      },
    },
    submit(form, ctx) {
      const f = formData(form);
      if (!f.nama) return toast('Isi nama pelanggan');
      const id = currentId();
      ctx.S.put('pelanggan', { ...(id ? ctx.S.get('pelanggan', id) : {}), ...(id ? { id } : {}), nama: f.nama, sapaan: f.sapaan, wa: f.wa, alamat: f.alamat, catatan: f.catatan });
      toast('Pelanggan tersimpan');
      ctx.back();
    },
  },

  kiriman: {
    title: 'Kiriman',
    render(p, ctx) {
      const list = ctx.S.all('pesanan').filter((x) => x.cara && x.cara !== 'ambil' && !['selesai', 'batal'].includes(x.status)).sort((a, b) => String(a.tglAmbil).localeCompare(String(b.tglAmbil)));
      if (!list.length) return kosong('truck', 'Tidak ada kiriman', 'Pesanan dengan cara Diantar atau Kurir yang belum selesai muncul di sini.');
      return `<div class="list">${list.map((x) => itemPesanan(x)).join('')}</div>`;
    },
  },

  // ---------- Pengaturan ----------
  settings: {
    title: 'Pengaturan',
    form: true,
    render(p, ctx) {
      const st = D.setelan();
      const pr = prefs.get();
      const q = qrisLokal();
      const akun = ctx.akun;
      return `
        <form data-form="toko"><div class="card"><h2>Toko</h2>
          ${field('Nama toko', `<input type="text" id="s-toko" name="namaToko" value="${h(st.namaToko || '')}" placeholder="Muncul di template pesan">`, { id: 's-toko' })}
          ${field('Nama kamu', `<input type="text" id="s-nama" name="namaPemilik" value="${h(st.namaPemilik || '')}" placeholder="Untuk sapaan di Beranda">`, { id: 's-nama' })}
          <div class="field"><span class="lbl2">Sapaan bawaan pelanggan</span>${chips('sapaanBawaan', D.SAPAAN.map((s) => [s, s]), st.sapaanBawaan ?? 'Kak', { label: 'Sapaan bawaan' })}<div class="hint">Ketuk lagi untuk tanpa sapaan.</div></div>
          <label class="switch"><span><b>Catat stok bahan</b><div class="small muted">Daftar belanja dikurangi stok yang ada.</div></span><input type="checkbox" name="stokBahan" ${st.stokBahan ? 'checked' : ''}></label>
          <button class="btn pri block" style="margin-top:8px">Simpan</button>
        </div></form>

        <form data-form="bayar"><div class="card"><h2>Rekening & QRIS</h2>
          ${field('Info rekening', `<textarea id="s-rek" name="rekening" rows="3" style="min-height:80px" placeholder="BCA 1234567890 a.n. Nama">${h(st.rekening || '')}</textarea>`, { id: 's-rek', hint: 'Muncul di teks tagihan lewat {rekening}.' })}
          <div class="field"><span class="lbl2">Gambar QRIS</span>
            ${q?.data ? `<img class="qris-prev" src="${q.data}" alt="QRIS tersimpan" width="220" height="220">` : '<p class="small muted" style="margin:0 0 8px">Belum ada. Unggah tangkapan layar QRIS dari aplikasi bank atau e-wallet.</p>'}
            <label class="btn block" for="s-qris">${ic('image')}${q?.data ? 'Ganti gambar QRIS' : 'Unggah gambar QRIS'}</label>
            <input type="file" id="s-qris" accept="image/*" class="sr">
            ${q?.data ? `<button type="button" class="btn danger block" data-act="hapusQris" style="margin-top:8px">Hapus QRIS</button>` : ''}
          </div>
          <button class="btn pri block">Simpan rekening</button>
        </div></form>

        <div class="card"><h2>Tampilan</h2>
          <div class="field"><span class="lbl2">Tema warna</span><div class="chips wrapc" role="group" aria-label="Tema warna">${TEMA.map(([k, l, c]) => `<button type="button" class="chip" data-act="tema" data-k="${k}" aria-pressed="${pr.theme === k}"><span aria-hidden="true" style="width:16px;height:16px;border-radius:5px;background:${c};border:1px solid rgba(0,0,0,.12)"></span>${l}</button>`).join('')}</div></div>
          <div class="field" style="margin-bottom:0"><span class="lbl2">Mode</span>${chips('mode', [['auto', 'Ikuti HP'], ['light', 'Terang'], ['dark', 'Gelap']], pr.mode, { bawaan: 'auto', label: 'Mode terang atau gelap' })}</div>
          <p class="small muted" style="margin:8px 0 0">Tema dan mode disimpan per HP.</p>
        </div>

        <div class="list">
          <button type="button" class="item" data-act="template"><div class="av">${ic('text')}</div><div class="grow"><div class="t">Template pesan</div><div class="s">Tagihan, pesanan siap, promosi</div></div>${ic('next')}</button>
        </div>
        <div class="card"><h2>Kalimat penyemangat</h2>
          <label class="switch"><span><b>Layar pembuka</b><div class="small muted">Sapaan dan satu dari ${SEMUA.length} kalimat penyemangat setiap aplikasi dibuka.</div></span><input type="checkbox" data-act="splash" ${pr.splash !== false ? 'checked' : ''}></label>
          <button type="button" class="btn block" data-act="lihatSplash" style="margin-top:8px">${ic('hand')}Lihat contoh</button>
        </div>

        ${ctx.demo ? `<div class="card"><h2>Mode coba</h2><p class="small muted">Data contoh hanya ada di HP ini. Untuk mulai serius, keluar dari mode coba lalu buat akun.</p><button class="btn block" data-act="keluarCoba">${ic('logout')}Keluar dari mode coba</button></div>` : `
        <div class="card"><h2>Akun & HP tersambung</h2>
          ${kv('Nama pengguna', h(akun?.username || ''))}${kv('Peran', akun?.peran === 'pemilik' ? 'Pemilik' : 'Anggota')}
          <p class="small muted">HP lain cukup masuk dengan nama pengguna dan kata sandi yang sama.</p>
          <div class="btns"><button type="button" class="btn" data-act="sesi">${ic('phone')}HP yang masuk</button><button type="button" class="btn" data-act="sandi">${ic('key')}Ganti kata sandi</button>
          ${akun?.peran === 'pemilik' ? `<button type="button" class="btn" data-act="anggota">${ic('users')}Akun anggota</button>` : ''}</div>
        </div>
        <div class="card"><h2>Koneksi Google Sheet</h2>
          ${kv('Status', ctx.S.status === 'offline' ? 'Offline, akan dicoba lagi' : ctx.S.pending ? `${ctx.S.pending} perubahan antre` : 'Tersambung')}
          ${kv('Terakhir ambil data', ctx.S.lastPull ? new Date(ctx.S.lastPull).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum')}
          <button type="button" class="btn block" data-act="sinkron" style="margin-top:8px">${ic('refresh')}Sinkron sekarang</button>
        </div>`}`;
    },
    submit(form, ctx) {
      const f = formData(form);
      if (form.dataset.form === 'toko') {
        D.simpanSetelan({ namaToko: f.namaToko, namaPemilik: f.namaPemilik, sapaanBawaan: f.sapaanBawaan, stokBahan: !!form.stokBahan.checked });
        toast('Pengaturan toko tersimpan');
      } else {
        D.simpanSetelan({ rekening: f.rekening });
        toast('Rekening tersimpan');
      }
    },
    input(el) {
      if (el.name === 'mode') prefs.set({ mode: el.value || 'auto' });
    },
    async change(el, ctx) {
      if (el.id !== 's-qris' || !el.files?.[0]) return;
      try {
        const data = await kecilkanGambar(el.files[0], 900, 'image/png');
        let id = 'lokal';
        if (!ctx.demo) {
          toast('Mengunggah QRIS…');
          try {
            const r = await apiPublik().call('unggah', { nama: 'qris.png', mime: 'image/png', base64: data.split(',')[1] });
            id = r.id;
            D.simpanSetelan({ qrisFileId: id });
          } catch (e) { toast('QRIS tersimpan di HP ini saja. Unggah ulang saat online supaya HP lain ikut dapat.', 4500); }
        }
        simpanQrisLokal(id, data);
        toast('QRIS tersimpan');
        ctx.rerender();
      } catch { toast('Gambar tidak bisa dibaca. Coba gambar lain.'); }
    },
    actions: {
      tema: (b, e, ctx) => { prefs.set({ theme: b.dataset.k }); ctx.rerender(); },
      splash: (b) => { prefs.set({ splash: b.checked }); toast(b.checked ? 'Layar pembuka dinyalakan' : 'Layar pembuka dimatikan'); },
      lihatSplash: () => tampilkanSplash((D.setelan().namaPemilik || '').trim()),
      hapusQris: async (b, e, ctx) => {
        if (!(await konfirmasi('Hapus QRIS?', 'Gambar QRIS dihapus dari semua HP.', { ya: 'Hapus', bahaya: true }))) return;
        simpanQrisLokal('', null);
        D.simpanSetelan({ qrisFileId: '' });
        ctx.rerender();
      },
      template: (b, e, ctx) => bukaDaftarTemplate(ctx),
      sinkron: async (b, e, ctx) => { toast('Menyinkronkan…'); await ctx.S.sync(); ctx.rerender(); toast(ctx.S.status === 'ok' ? 'Sudah sinkron' : 'Belum tersambung. Coba lagi nanti.'); },
      sesi: (b, e, ctx) => bukaSesi(ctx),
      sandi: (b, e, ctx) => bukaSandi(),
      anggota: (b, e, ctx) => bukaAnggota(ctx),
      keluarCoba: (b, e, ctx) => ctx.keluar(),
    },
  },

  faq: {
    title: 'FAQ & panduan',
    render() {
      const qa = [
        ['Kenapa untung masih Rp 0 padahal sudah ada pesanan?', 'Untung hanya dihitung dari pesanan berstatus Selesai. Pesanan yang belum selesai terlihat di kartu Pesanan masuk sebagai perkiraan untung.'],
        ['Kalau harga bahan naik, untung pesanan lama ikut berubah?', 'Tidak. Modal (HPP) dikunci di setiap pesanan saat pesanan dibuat. Setelah harga bahan atau resep berubah, BuKue menawarkan untuk memperbarui modal pesanan yang belum lunas saja.'],
        ['Bagaimana menyambungkan HP kedua?', 'Buka BuKue di HP kedua, pilih Masuk, lalu pakai nama pengguna dan kata sandi yang sama. Data akan tersinkron lewat Google Sheet kamu sekitar tiap 90 detik dan setiap aplikasi dibuka.'],
        ['Bisa dipakai tanpa internet?', 'Bisa. Semua perubahan disimpan di HP dulu dan dikirim otomatis saat sinyal kembali. Jumlah yang belum terkirim terlihat di pojok kanan atas.'],
        ['Lupa kata sandi?', 'Buka Google Sheet BuKue di komputer, lalu menu BuKue > Reset kata sandi akun.'],
        ['Di iPhone, teks tagihan tidak ikut terkirim bersama QRIS.', 'WhatsApp di iPhone kadang hanya menerima gambar. BuKue sudah menyalin teksnya lebih dulu, jadi tinggal tempel di kolom chat.'],
        ['Di mana data saya disimpan?', 'Di Google Sheet milik kamu sendiri. Kata sandi disimpan dalam bentuk acak (hash), bukan teks asli. Gambar QRIS ada di folder Google Drive kamu.'],
        ['Bagaimana kelebihan produksi masuk ke stok ready?', 'Di menu Produksi, ketuk "Produksi selesai" lalu isi jumlah yang benar-benar jadi. Kalau lebih dari pesanan, kelebihannya otomatis masuk Stok ready.'],
        ['Apakah kue yang dibuang mengurangi untung?', 'Ya. Sisa buatan sendiri yang dibuang dihitung rugi senilai modalnya. Titipan yang rusak atau dikembalikan tidak mengurangi untungmu.'],
        ['Bagaimana menghitung setoran ke penitip?', 'Buka Titipan & penitip, pilih penitip. "Belum disetor" berisi semua titipan yang terjual sejak setoran terakhir dikali harga setor. Setelah transfer, ketuk "Tandai sudah disetor".'],
        ['Kuota open PO berkurang dari mana?', 'Dari pesanan yang memilih open PO itu di form pesanan. BuKue memberi peringatan kalau jumlahnya melebihi sisa kuota, tapi tetap boleh disimpan.'],
        ['HPP dihitung dari mana?', 'HPP per satuan = (biaya bahan + gas/listrik + tenaga) dibagi hasil bersih setelah susut, ditambah kemasan per satuan.'],
      ];
      return `<div class="card"><h2>Tujuan</h2><p style="margin:0">BuKue membantu bisnis kue rumahan mencatat pesanan PO, menghitung HPP dari harga bahan, merencanakan produksi dan belanja, menagih lewat WhatsApp dengan QRIS, dan melihat untung per bulan dan per tahun.</p></div>
        <div class="card"><h2>Deskripsi</h2><p style="margin:0">Aplikasi web yang bisa dipasang di layar utama HP. Data tersimpan di Google Sheet milikmu, bisa dipakai di beberapa HP dengan satu akun, dan tetap jalan saat offline.</p></div>
        <div class="card"><h2>Fitur</h2><ul style="margin:0;padding-left:20px;line-height:1.7">
          <li>Bahan baku dan riwayat harga, resep, HPP, saran harga, simulasi produksi</li>
          <li>Pesanan PO dengan DP dan pelunasan, open PO dengan kuota</li>
          <li>Jadwal produksi dan daftar belanja</li>
          <li>Stok ready, jual cepat, peringatan kedaluwarsa, catat sisa dibuang</li>
          <li>Titipan, laporan dan setoran ke penitip</li>
          <li>Tagihan WhatsApp dengan rekening dan QRIS, template pesan</li>
          <li>Beranda: untung per periode, pesanan masuk, tagihan berjalan, produk terlaris</li></ul></div>
        <div class="card"><h2>Cara pakai singkat</h2><ol style="margin:0;padding-left:20px;line-height:1.7">
          <li>Catat bahan baku dan harganya (Lainnya, Bahan baku).</li>
          <li>Buat resep dari bahan itu. HPP langsung terhitung (Produk, Resep & HPP).</li>
          <li>Tambah produk dan varian, hubungkan ke resepnya.</li>
          <li>Catat pesanan, isi DP kalau ada, lalu tagih lewat tombol Tagih.</li>
          <li>Lihat jadwal dan daftar belanja di menu Produksi. Kelebihan produksi masuk stok ready.</li>
          <li>Jual kue dari stok lewat Pesanan, "Jual dari stok". Titipan dicatat di Lainnya, Titipan & penitip.</li>
          <li>Ubah status pesanan sampai Selesai supaya masuk hitungan untung.</li></ol></div>
        <div class="sec"><span>Tanya jawab</span></div>
        <div class="list">${qa.map(([q, a]) => `<details class="item" style="display:block"><summary style="font-weight:650;min-height:28px">${h(q)}</summary><p class="small" style="margin:8px 0 0">${h(a)}</p></details>`).join('')}</div>
        <p class="small muted" style="margin:12px 2px">Kalau BuKue membantu, kamu bisa mendukung lewat <a href="${SAWERIA}" target="_blank" rel="noopener">Saweria</a>. Tidak wajib.</p>
        <div style="text-align:center">${kredit()}</div>`;
    },
  },
};

let _id = '';
function currentId() { return _id; }
// Simpan id halaman form yang sedang tampil
['bahanForm', 'customerForm'].forEach((k) => {
  const r = views[k].render;
  views[k].render = (p, ctx) => { _id = p.id || ''; return r(p, ctx); };
});

function infoBahan(form) {
  const f = formData(form);
  const b = { harga: f.harga, isi: f.isi, satuan: f.satuan, isiButir: f.isiButir, beratSdm: f.beratSdm, beratSdt: f.beratSdt };
  const d = C.labelHargaDasar(b);
  const ext = [];
  if (num(f.isiButir) > 0) ext.push(`${rp(C.hargaPerSatuan(b, 'butir'))} per butir/pcs`);
  if (num(f.beratSdm) > 0) ext.push(`${rp(C.hargaPerSatuan(b, 'sdm'))} per sdm`);
  if (num(f.beratSdt) > 0) ext.push(`${rp(C.hargaPerSatuan(b, 'sdt'))} per sdt`);
  form.querySelector('#b-info').innerHTML = d.harga !== null && num(f.harga) > 0
    ? `<div class="small muted">Harga per satuan terkecil</div><div class="big num" style="font-size:22px">${rp(d.harga)} <span class="small muted">per ${C.UNIT_LABEL[d.unit] || d.unit}</span></div>${ext.length ? `<div class="small">${ext.join(' · ')}</div>` : ''}`
    : '<div class="small muted">Isi harga dan isi kemasan untuk melihat harga per gram/ml.</div>';
}

// ---------- Lembar-lembar ----------
function bukaDaftarTemplate(ctx) {
  openSheet({
    html: `<h2 id="sheet-t">Template pesan</h2><div class="list">${Object.keys(TEMPLATE).map((k) => `<button class="item" data-act="buka" data-k="${k}"><div class="grow"><div class="t">${h(TEMPLATE[k].judul)}</div></div>${ic('next')}</button>`).join('')}</div>`,
    actions: { buka: (b) => bukaTemplate(ctx, b.dataset.k) },
  });
}
function bukaTemplate(ctx, k) {
  const S = ctx.S;
  const t = S.get('template', k);
  const teks = t?.teks || TEMPLATE[k].teks;
  const kata = ['sapaan', 'nama', 'toko', 'daftar', 'total', 'dp', 'dibayar', 'sisa', 'tanggalAmbil', 'jam', 'alamat', 'rekening', 'resi', 'batas', 'tanggalProduksi', 'periode'];
  openSheet({
    html: `<h2 id="sheet-t">${h(TEMPLATE[k].judul)}</h2><form>
      ${field('Isi template', `<textarea id="t-teks" name="teks" rows="10">${h(teks)}</textarea>`, { id: 't-teks', hint: 'Kata dalam kurung kurawal diganti otomatis. Baris yang kata kuncinya kosong akan hilang.' })}
      <div class="chips wrapc" style="margin-bottom:12px">${kata.map((w) => `<button type="button" class="chip" data-act="sisip" data-w="{${w}}" style="min-height:36px;font-size:13px">{${w}}</button>`).join('')}</div>
      <div class="btns"><button type="button" class="btn" data-act="reset">Kembalikan bawaan</button><button class="btn pri">Simpan</button></div></form>`,
    actions: {
      sisip: (b, e, sheet) => { const ta = sheet.querySelector('#t-teks'); const p = ta.selectionStart ?? ta.value.length; ta.value = ta.value.slice(0, p) + b.dataset.w + ta.value.slice(ta.selectionEnd ?? p); ta.focus(); ta.setSelectionRange(p + b.dataset.w.length, p + b.dataset.w.length); },
      reset: (b, e, sheet) => { sheet.querySelector('#t-teks').value = TEMPLATE[k].teks; },
    },
    submit: (form) => { S.put('template', { id: k, judul: TEMPLATE[k].judul, teks: form.teks.value }); closeSheet(); toast('Template tersimpan'); },
  });
}

async function bukaSesi(ctx) {
  const sheet = openSheet({ html: `<h2 id="sheet-t">HP yang masuk</h2><p class="muted">Memuat…</p>` });
  try {
    const r = await apiPublik().call('daftarSesi');
    sheet.innerHTML = `<div class="grab"></div><h2 id="sheet-t">HP yang masuk</h2>
      <div class="list">${r.sesi.map((s) => `<div class="item"><div class="av">${ic('phone')}</div><div class="grow"><div class="t">${h(s.perangkat)}${s.ini ? ' <span class="tag acc">HP ini</span>' : ''}</div><div class="s">Terakhir aktif ${h(new Date(s.terakhir).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }))}</div></div></div>`).join('')}</div>
      <p class="small muted">Kalau ada HP yang hilang atau tidak dikenal, keluarkan semua HP lain. HP itu harus masuk lagi dengan kata sandi.</p>
      <button class="btn danger block" data-act="keluarLain">Keluarkan semua HP lain</button>`;
    sheet.parentElement._opt.actions = {
      keluarLain: async () => {
        if (!(await konfirmasi('Keluarkan HP lain?', 'Semua HP selain HP ini harus masuk lagi.', { ya: 'Keluarkan', bahaya: true }))) return;
        try { await apiPublik().call('keluarSemua', { kecualiIni: true }); toast('HP lain sudah dikeluarkan'); } catch (e) { toast(e.message); }
      },
    };
  } catch (e) { sheet.innerHTML = `<div class="grab"></div><h2 id="sheet-t">HP yang masuk</h2><div class="banner">${ic('cloudOff')}<span class="grow">${h(e.message)}</span></div>`; }
}

function bukaSandi() {
  openSheet({
    html: `<h2 id="sheet-t">Ganti kata sandi</h2><form>
      ${field('Kata sandi lama', '<input type="password" id="pw-l" name="lama" autocomplete="current-password" required>', { id: 'pw-l' })}
      ${field('Kata sandi baru', '<input type="password" id="pw-b" name="baru" autocomplete="new-password" minlength="6" required>', { id: 'pw-b', hint: 'Minimal 6 karakter.' })}
      <div class="banner" data-err hidden></div>
      <button class="btn pri block">Simpan kata sandi</button></form>`,
    submit: async (form, sheet) => {
      const err = sheet.querySelector('[data-err]');
      const btn = form.querySelector('button.pri');
      btn.disabled = true;
      try {
        await apiPublik().call('gantiSandi', { lama: form.lama.value, baru: form.baru.value });
        closeSheet();
        toast('Kata sandi diganti');
      } catch (e) { err.hidden = false; err.textContent = e.message; btn.disabled = false; }
    },
  });
}

async function bukaAnggota(ctx) {
  const sheet = openSheet({ html: `<h2 id="sheet-t">Akun anggota</h2><p class="muted">Memuat…</p>` });
  const muat = async () => {
    try {
      const r = await apiPublik().call('daftarAkun');
      sheet.innerHTML = `<div class="grab"></div><h2 id="sheet-t">Akun anggota</h2>
        <p class="small muted">Untuk asisten atau keluarga yang ikut mencatat. Mereka melihat data yang sama.</p>
        <div class="list">${r.akun.map((a) => `<div class="item"><div class="av">${h(inisial(a.nama || a.username))}</div><div class="grow"><div class="t">${h(a.username)}</div><div class="s">${a.peran === 'pemilik' ? 'Pemilik' : 'Anggota'}${a.nama ? ' · ' + h(a.nama) : ''}</div></div>${a.peran !== 'pemilik' ? `<button class="iconbtn" data-act="hapusAkun" data-id="${h(a.id)}" aria-label="Hapus akun ${h(a.username)}">${ic('trash')}</button>` : ''}</div>`).join('')}</div>
        <form><h2 style="font-size:15px">Tambah akun</h2>
          ${field('Nama', '<input type="text" id="ag-n" name="nama">', { id: 'ag-n' })}
          ${field('Nama pengguna', '<input type="text" id="ag-u" name="username" autocapitalize="none" autocomplete="off" required>', { id: 'ag-u', hint: 'Huruf kecil, angka, titik, atau garis bawah.' })}
          ${field('Kata sandi', '<input type="password" id="ag-p" name="sandi" autocomplete="new-password" minlength="6" required>', { id: 'ag-p' })}
          <div class="banner" data-err hidden></div>
          <button class="btn pri block">Tambah akun</button></form>`;
    } catch (e) { sheet.innerHTML = `<div class="grab"></div><h2 id="sheet-t">Akun anggota</h2><div class="banner">${h(e.message)}</div>`; }
  };
  const opt = sheet.parentElement._opt;
  opt.actions = {
    hapusAkun: async (b) => {
      try { await apiPublik().call('hapusAkun', { id: b.dataset.id }); toast('Akun dihapus'); muat(); } catch (e) { toast(e.message); }
    },
  };
  opt.submit = async (form) => {
    const err = sheet.querySelector('[data-err]');
    try {
      await apiPublik().call('tambahAkun', { nama: form.nama.value, username: form.username.value, sandi: form.sandi.value });
      toast('Akun ditambahkan');
      muat();
    } catch (e) { err.hidden = false; err.textContent = e.message; }
  };
  muat();
}
