import { h, ic, rp, angka, tgl, tglPanjang, inisial, toast, openSheet, closeSheet, konfirmasi, konfeti, nomorWa, salin } from '../util.js';
import { num, isiTemplate } from '../calc.js';
import * as D from '../data.js';
import { chips, field, money, kosong, kv, formData, tagBayar } from './ui.js';
import { template } from './orders.js';
import { avProduk } from './products.js';
import { fotoUrl } from '../foto.js';
import { ilus } from '../ilustrasi.js';
import { dataUrlKeFile } from '../util.js';

let draftJual = null, draftTerima = null;

function labelSisa(b) {
  const d = D.sisaHari(b);
  if (d === null) return '';
  if (d < 0) return '<span class="tag bad">Kedaluwarsa</span>';
  if (d === 0) return '<span class="tag bad">Habis hari ini</span>';
  if (d <= 1) return '<span class="tag warn">Besok habis</span>';
  return `<span class="tag dim">${d} hari lagi</span>`;
}

// Pilihan tambah stok: resep (dicatat dalam satuan hasil, misalnya pcs) atau varian tanpa resep.
function opsiTambahStok(sel) {
  const S = D.store();
  const reseps = S.all('resep').filter((r) => S.all('varian').some((v) => v.resepId === r.id)).sort((a, b) => a.nama.localeCompare(b.nama));
  const tanpa = S.all('produk').filter((p) => p.jenis !== 'titipan').flatMap((p) => D.varianDari(p.id).filter((v) => !v.resepId).map((v) => ({ v, p })));
  return (reseps.length ? `<optgroup label="Dari resep (bisa dijual dalam berbagai paket)">${reseps.map((r) => `<option value="r:${h(r.id)}" ${'r:' + r.id === sel ? 'selected' : ''}>${h(r.nama)} (${h(r.satuanHasil || 'pcs')})</option>`).join('')}</optgroup>` : '')
    + (tanpa.length ? `<optgroup label="Produk tanpa resep">${tanpa.map(({ v, p }) => `<option value="v:${h(v.id)}" ${'v:' + v.id === sel ? 'selected' : ''}>${h(p.nama)} · ${h(v.nama)}</option>`).join('')}</optgroup>` : '');
}

// Contoh konversi stok resep ke paket, misalnya "40 pcs = 5 mika isi 8".
function konversi(g) {
  if (!g.resepId) return '';
  const vs = D.store().all('varian').filter((v) => v.resepId === g.resepId && D.isiVarian(v) > 1);
  if (!vs.length) return '';
  return vs.slice(0, 3).map((v) => `${angka(Math.floor(g.sisa / D.isiVarian(v) + 1e-9))} ${h(v.nama)}`).join(' atau ');
}

// Lembar keluar stok: dibuang (rugi) atau dikembalikan ke penitip.
export function bukaKeluar(stokId, ctx) {
  const b = D.batchInfo(ctx.S.get('stok', stokId));
  const titip = !!b.penitipId;
  openSheet({
    html: `<h2 id="sheet-t">Sisa ${h(b.nama)}</h2>
      <p class="small muted" style="margin-top:-6px">Produksi ${h(tgl(b.tanggal))} · sisa ${angka(b.sisa, 2)}</p>
      <form>
        <div class="field"><span class="lbl2">Alasan</span>${chips('alasan', titip ? [['dikembalikan', 'Dikembalikan ke penitip'], ['dibuang', 'Rusak/dibuang']] : [['dibuang', 'Dibuang/rusak']], titip ? 'dikembalikan' : 'dibuang', { bawaan: titip ? 'dikembalikan' : 'dibuang', label: 'Alasan' })}</div>
        ${field('Jumlah', `<input type="number" inputmode="decimal" min="0" step="any" id="k-j" name="jumlah" value="${h(b.sisa)}" required>`, { id: 'k-j' })}
        <p class="small muted">${titip ? 'Titipan yang dikembalikan atau rusak tidak mengurangi untungmu.' : `Dibuang dihitung sebagai rugi senilai modal (${rp(b.hpp)} per item).`}</p>
        <button class="btn pri block">Simpan</button>
      </form>`,
    submit: (form) => {
      const f = formData(form);
      const j = Math.min(num(f.jumlah), b.sisa);
      if (!(j > 0)) return toast('Isi jumlah');
      ctx.S.put('stokKeluar', { stokId, tanggal: D.today(), jumlah: j, alasan: f.alasan, nilai: titip ? 0 : Math.round(j * num(b.hpp)) });
      closeSheet();
      toast(f.alasan === 'dikembalikan' ? 'Dicatat dikembalikan' : 'Dicatat sebagai sisa dibuang');
      ctx.rerender();
    },
  });
}

function barisJual(it, i, opsi) {
  return `<div class="line-edit" data-baris="${i}">
    <div class="row" style="align-items:flex-end">
      <div class="field grow" style="margin-bottom:8px"><label for="js-v-${i}">Produk</label><select id="js-v-${i}" name="varian[]"><option value="">Pilih dari stok</option>
        ${opsi.map((s) => `<option value="${h(s.varianId)}" ${s.varianId === it.varianId ? 'selected' : ''}>${h(s.nama)} (tersedia ${angka(s.tersedia, 2)})</option>`).join('')}</select></div>
      <button type="button" class="iconbtn" data-act="hapusItem" data-i="${i}" aria-label="Hapus baris ini" style="margin-bottom:8px">${ic('trash')}</button>
    </div>
    <div class="grid2"><div class="field" style="margin-bottom:0"><label for="js-q-${i}">Jumlah</label><input type="number" inputmode="numeric" min="0" step="any" id="js-q-${i}" name="qty[]" value="${h(it.qty ?? 1)}"></div>
    <div class="field" style="margin-bottom:0"><label for="js-h-${i}">Harga satuan</label>${money('harga[]', it.harga, { id: 'js-h-' + i })}</div></div>
  </div>`;
}
function bacaJual(form) {
  const f = formData(form);
  draftJual = { ...draftJual, ...f, items: (f.varian || []).map((v, i) => ({ varianId: v, qty: f.qty[i], harga: f.harga[i] })) };
}
const hargaVarian = (varianId) => num(D.store().get('varian', varianId)?.harga);

export const views = {
  stok: {
    title: 'Stok ready',
    fab: { label: 'Tambah stok', go: 'stokForm' },
    render(p, ctx) {
      const list = D.stokGrup();
      const bisaJual = D.opsiJual(list).length > 0;
      let out = `<div class="btns" style="margin-bottom:12px"><button class="btn pri" data-go="jualStok" ${bisaJual ? '' : 'disabled'}>${ic('wallet')}Jual dari stok</button><button class="btn" data-act="promo" ${bisaJual ? '' : 'disabled'}>${ic('share')}Teks promosi</button></div>`;
      if (!list.length) return out + kosong('box', 'Stok kosong', 'Tambah stok saat produksi untuk dijual langsung, atau kelebihan produksi akan masuk ke sini otomatis.', `<button class="btn pri" data-go="stokForm">${ic('plus')}Tambah stok</button>`);
      const kd = D.hampirKedaluwarsa(1);
      if (kd.length) out += `<div class="banner">${ic('alert')}<span class="grow">${kd.length} stok mendekati atau lewat kedaluwarsa.</span></div>`;
      list.forEach((g) => {
        const sat = g.satuan ? ' ' + h(g.satuan) : '';
        const kv_ = konversi(g);
        const av = g.resepId ? `<div class="av ilus-av">${ilus('toples', 34)}</div>` : avProduk(ctx.S.get('produk', g.produkId));
        out += `<div class="sec"><span class="row" style="gap:10px">${av}<span>${h(g.nama)}${kv_ ? `<span class="small muted" style="display:block;font-weight:500">≈ ${kv_}</span>` : ''}</span></span><span class="small muted num">sisa ${angka(g.sisa, 2)}${sat}</span></div><div class="list">${g.batch.map((b) => `
          <div class="item"><div class="grow"><div class="t">${angka(b.sisa, 2)} dari ${angka(b.jumlah, 2)}${sat} ${labelSisa(b)}</div>
            <div class="s">${b.penitipId ? 'Titipan ' + h(ctx.S.get('penitip', b.penitipId)?.nama || '') + ' · ' : ''}Masuk ${h(tgl(b.tanggal))}${b.kedaluwarsa ? ' · tahan s.d. ' + h(tgl(b.kedaluwarsa, { hari: false })) : ''}</div></div>
            <button class="btn sm" data-act="keluar" data-id="${h(b.id)}">Sisa</button></div>`).join('')}</div>`;
      });
      return out;
    },
    actions: {
      keluar: (b, e, ctx) => bukaKeluar(b.dataset.id, ctx),
      promo: (b, e, ctx) => {
        const opsi = D.opsiJual();
        const daftar = opsi.map((s) => `• ${s.nama}: ${rp(s.harga)}`).join('\n');
        const teks = isiTemplate(template('promoReady').teks, { toko: D.setelan().namaToko || '', daftar });
        bukaTeksPromo('Promosi stok ready', teks, '', opsi.map((s) => s.fotoId));
      },
    },
  },

  stokForm: {
    form: true,
    title: 'Tambah stok',
    render(p, ctx) {
      const opsi = opsiTambahStok(p.pilih || '');
      if (!opsi) return kosong('cake', 'Belum ada produk', 'Tambahkan produk buatan sendiri dulu.', `<button class="btn pri" data-go="productForm">${ic('plus')}Tambah produk</button>`);
      return `<form novalidate><div class="card">
        <p class="small muted" style="margin-top:0">Untuk kue buatan sendiri yang dijual tanpa pesanan. Stok dari resep dicatat dalam satuan hasil (misalnya pcs), lalu bisa dijual satuan atau per paket. Titipan dicatat lewat menu Titipan & penitip.</p>
        ${field('Stok', `<select id="sf-v" name="pilih" required><option value="">Pilih</option>${opsi}</select>`, { id: 'sf-v' })}
        <div class="grid2">${field('Jumlah', `<input type="number" inputmode="numeric" min="0" step="any" id="sf-j" name="jumlah" value="${h(p.jumlah || '')}" required>`, { id: 'sf-j' })}
        ${field('Tanggal produksi', `<input type="date" id="sf-t" name="tanggal" value="${h(p.tanggal || D.today())}" required>`, { id: 'sf-t' })}</div>
        <div class="small muted" id="sf-info" aria-live="polite"></div>
      </div><button class="btn pri block">${ic('check')}Simpan stok</button></form>`;
    },
    mount(el) { const f = el.querySelector('form'); if (f) views.stokForm.input(f.pilih); },
    input(el, ctx) {
      const form = el?.form; if (!form) return;
      const [jenis, id] = (form.pilih.value || ':').split(':');
      const info = form.querySelector('#sf-info');
      if (jenis === 'r') {
        const r = D.store().get('resep', id);
        const b = D.batchResep(id, form.tanggal.value, 0, '');
        info.textContent = `Modal ${rp(b.hpp)} per ${r.satuanHasil || 'pcs'} (tanpa kemasan)${b.kedaluwarsa ? ` · tahan sampai ${tgl(b.kedaluwarsa)}` : ''}`;
      } else if (jenis === 'v') {
        const v = D.store().get('varian', id);
        const pr = v ? D.store().get('produk', v.produkId) : null;
        const kd = D.tglKedaluwarsa(form.tanggal.value, pr);
        info.textContent = v ? `Modal ${rp(D.hppVarian(v, pr))} per item${kd ? ` · tahan sampai ${tgl(kd)}` : ''}` : '';
      } else info.textContent = '';
    },
    change(el, ctx) { views.stokForm.input(el, ctx); },
    submit(form, ctx) {
      const f = formData(form);
      const [jenis, id] = (f.pilih || ':').split(':');
      if (!id || !(num(f.jumlah) > 0)) return toast('Pilih stok dan isi jumlah');
      if (jenis === 'r') ctx.S.put('stok', D.batchResep(id, f.tanggal, num(f.jumlah), 'manual'));
      else {
        const v = ctx.S.get('varian', id);
        const pr = ctx.S.get('produk', v.produkId);
        ctx.S.put('stok', { varianId: v.id, produkId: v.produkId, nama: `${pr.nama} · ${v.nama}`, tanggal: f.tanggal, kedaluwarsa: D.tglKedaluwarsa(f.tanggal, pr), jumlah: num(f.jumlah), hpp: Math.round(D.hppVarian(v, pr) * 100) / 100, harga: num(v.harga), sumber: 'manual' });
      }
      toast('Stok tersimpan');
      ctx.back();
    },
  },

  jualStok: {
    form: true,
    enter() { draftJual = null; },
    title: 'Jual dari stok',
    render(p, ctx) {
      const opsi = D.opsiJual();
      if (!opsi.length) return kosong('box', 'Stok kosong', 'Belum ada stok untuk dijual.');
      if (!draftJual) draftJual = { items: [{ qty: 1, varianId: p.varian || '', harga: p.varian ? hargaVarian(p.varian) : '' }], pelangganId: '', bayar: 'lunas', metode: 'Tunai' };
      const d = draftJual;
      const pels = ctx.S.all('pelanggan').sort((a, b) => a.nama.localeCompare(b.nama));
      return `<form novalidate>
        <div id="baris-jual">${d.items.map((it, i) => barisJual(it, i, opsi)).join('')}</div>
        <button type="button" class="btn block" data-act="tambahItem" style="margin-bottom:12px">${ic('plus')}Tambah produk</button>
        <div class="card">
          ${field('Pelanggan (opsional)', `<select id="js-pel" name="pelangganId"><option value="">Tanpa nama</option>${pels.map((x) => `<option value="${h(x.id)}" ${x.id === d.pelangganId ? 'selected' : ''}>${h(x.nama)}</option>`).join('')}</select>`, { id: 'js-pel' })}
          <div class="field"><span class="lbl2">Pembayaran</span>${chips('bayar', [['lunas', 'Sudah dibayar'], ['belum', 'Belum dibayar']], d.bayar, { bawaan: 'lunas', label: 'Pembayaran' })}</div>
          <div class="field"><span class="lbl2">Cara bayar</span>${chips('metode', [['Tunai', 'Tunai'], ['QRIS', 'QRIS'], ['Transfer', 'Transfer']], d.metode, { bawaan: 'Tunai', label: 'Cara bayar' })}</div>
        </div>
        <div class="card" id="ringkas-jual" aria-live="polite"></div>
        <button class="btn pri block">${ic('check')}Simpan penjualan</button></form>`;
    },
    mount(el) { const f = el.querySelector('form'); if (f) ringkasJual(f); },
    input(el, ctx) {
      const form = el.form || el.closest('form'); if (!form) return;
      if (el.name === 'varian[]') {
        const i = el.closest('[data-baris]').dataset.baris;
        form.querySelector('#js-h-' + i).value = hargaVarian(el.value) || '';
      }
      bacaJual(form);
      ringkasJual(form);
    },
    change(el, ctx) { views.jualStok.input(el, ctx); },
    actions: {
      tambahItem: (b, e, ctx) => { bacaJual(b.closest('form')); draftJual.items.push({ qty: 1 }); ctx.rerender(); },
      hapusItem: (b, e, ctx) => { bacaJual(b.closest('form')); draftJual.items.splice(Number(b.dataset.i), 1); if (!draftJual.items.length) draftJual.items.push({ qty: 1 }); ctx.rerender(); },
    },
    submit(form, ctx) {
      bacaJual(form);
      const items = draftJual.items.filter((it) => it.varianId && num(it.qty) > 0);
      if (!items.length) return toast('Pilih produk dari stok');
      const id = 'ps' + Date.now().toString(36);
      const t = D.today();
      const hasil = D.alokasiStok(items, id);
      if (hasil.error) return toast(hasil.error, 3500);
      const ops = [['pesanan', { id, kode: D.kodeBaru(), jenis: 'ready', pelangganId: draftJual.pelangganId || '', tglPesan: t, tglAmbil: t, jam: '', cara: 'ambil', diskon: 0, ongkir: 0, status: 'selesai', tglSelesai: t, catatan: '' }], ...hasil.ops];
      if (draftJual.bayar !== 'belum') ops.push(['pembayaran', { pesananId: id, nominal: hasil.total, tanggal: t, metode: draftJual.metode || 'Tunai' }]);
      ctx.S.putMany(ops);
      draftJual = null;
      konfeti();
      toast(`Terjual ${rp(hasil.total)}`);
      ctx.replace('order', { id });
    },
  },

  // ---------- Titipan ----------
  penitips: {
    title: 'Titipan & penitip',
    fab: { label: 'Tambah penitip', go: 'penitipForm' },
    render(p, ctx) {
      const S = ctx.S;
      const list = S.all('penitip').sort((a, b) => a.nama.localeCompare(b.nama));
      if (!list.length) return kosong('basket', 'Belum ada penitip', 'Catat orang yang menitipkan kue untuk kamu jual. Kamu setor hasil penjualan dengan harga setor, selisihnya jadi untungmu.', `<button class="btn pri" data-go="penitipForm">${ic('plus')}Tambah penitip</button>`);
      const blm = D.titipanBelumSetor();
      return `${blm.total ? `<div class="banner acc">${ic('wallet')}<span class="grow">Belum disetor ${rp(blm.total)} · untungmu ${rp(blm.untung)}</span></div>` : ''}
        <div class="list">${list.map((x) => {
          const b = D.titipanBelumSetor(x.id);
          const sisa = D.stokAktif().filter((s) => s.penitipId === x.id).reduce((a, s) => a + s.sisa, 0);
          return `<button class="item" data-go="penitip" data-id="${h(x.id)}"><div class="av">${h(inisial(x.nama))}</div><div class="grow"><div class="t ell">${h(x.nama)}</div><div class="s">Stok titipan ${angka(sisa, 2)}</div></div>${b.total ? `<div class="r"><span class="tag warn">${rp(b.total)}</span></div>` : ''}</button>`;
        }).join('')}</div>`;
    },
  },

  penitip: {
    title: (p, ctx) => ctx.S.get('penitip', p.id)?.nama || 'Penitip',
    render({ id }, ctx) {
      const S = ctx.S;
      const x = S.get('penitip', id);
      if (!x) return kosong('basket', 'Penitip tidak ditemukan', 'Mungkin sudah dihapus dari HP lain.');
      const b = D.titipanBelumSetor(id);
      const stok = D.stokAktif().filter((s) => s.penitipId === id);
      const riwayat = S.where('setoran', 'penitipId', id).sort((a, c) => String(c.tanggal).localeCompare(String(a.tanggal)));
      const produk = S.all('produk').filter((pr) => pr.jenis === 'titipan' && pr.penitipId === id);
      return `<div class="card"><div class="row"><div class="av">${h(inisial(x.nama))}</div><div class="grow"><b>${h(x.nama)}</b><div class="small muted">${h(x.wa || 'Belum ada nomor')}</div></div>
          ${x.wa ? `<a class="iconbtn" href="https://wa.me/${nomorWa(x.wa)}" target="_blank" rel="noopener" aria-label="Chat WhatsApp">${ic('chat')}</a>` : ''}</div>
          ${x.rekening ? `<p class="small" style="margin:10px 0 0">${ic('bank')} ${h(x.rekening)}</p>` : ''}</div>
        <div class="btns" style="margin-bottom:12px"><button class="btn pri" data-go="terimaTitipan" data-penitip="${h(id)}">${ic('plus')}Terima titipan</button><button class="btn" data-go="penitipForm" data-id="${h(id)}">${ic('edit')}Ubah</button></div>
        ${!produk.length ? `<div class="banner">${ic('alert')}<span class="grow">Belum ada produk titipan untuk penitip ini. Tambah di menu Produk, pilih jenis Titipan.</span></div>` : ''}
        <div class="card"><h2>Belum disetor</h2>
          ${b.perProduk.length ? b.perProduk.map((r) => kv(`${h(r.nama)} <span class="muted">x${angka(r.qty, 2)} @ ${rp(r.hargaSetor)}</span>`, rp(r.setor))).join('') : '<p class="small muted" style="margin:0">Belum ada titipan terjual sejak setoran terakhir.</p>'}
          ${b.kembali.length ? kv('Dikembalikan', angka(b.kembali.reduce((s, k) => s + num(k.k.jumlah), 0), 2) + ' item') : ''}
          ${kv('Harus dibayar ke penitip', rp(b.total), 'total')}${kv('Untungmu', rp(b.untung))}
          ${b.dari ? `<p class="small muted" style="margin:6px 0 0">Penjualan ${h(tgl(b.dari, { hari: false }))} sampai ${h(tgl(b.sampai, { hari: false }))}</p>` : ''}
          ${b.items.length || b.kembali.length ? `<div class="btns" style="margin-top:10px"><button class="btn" data-act="laporan">${ic('chat')}Kirim laporan</button><button class="btn pri" data-act="setor">${ic('check')}Tandai sudah disetor</button></div>` : ''}
        </div>
        <div class="sec"><span>Stok titipan</span></div>
        ${stok.length ? `<div class="list">${stok.map((s) => `<div class="item"><div class="grow"><div class="t">${h(s.nama)}</div><div class="s">Sisa ${angka(s.sisa, 2)} dari ${angka(s.jumlah, 2)} · masuk ${h(tgl(s.tanggal))} ${labelSisa(s)}</div></div><button class="btn sm" data-act="keluar" data-id="${h(s.id)}">Sisa</button></div>`).join('')}</div>` : '<p class="small muted">Tidak ada stok titipan.</p>'}
        <div class="sec"><span>Riwayat setoran</span></div>
        ${riwayat.length ? `<div class="list">${riwayat.map((r) => `<div class="item"><div class="grow"><div class="t">${rp(r.total)}</div><div class="s">${h(tgl(r.tanggal, { tahun: true }))} · ${angka(r.terjual, 2)} item · untungmu ${rp(r.untung)}</div></div></div>`).join('')}</div>` : '<p class="small muted">Belum ada setoran.</p>'}`;
    },
    actions: {
      keluar: (b, e, ctx) => bukaKeluar(b.dataset.id, ctx),
      laporan: (b, e, ctx) => {
        const id = curPenitip(ctx);
        const x = ctx.S.get('penitip', id);
        const bl = D.titipanBelumSetor(id);
        const sisa = D.stokAktif().filter((s) => s.penitipId === id);
        let daftar = bl.perProduk.map((r) => `• ${r.nama} terjual ${angka(r.qty, 2)} x ${rp(r.hargaSetor)} = ${rp(r.setor)}`).join('\n');
        if (bl.kembali.length) daftar += `\n• Dikembalikan: ${angka(bl.kembali.reduce((s, k) => s + num(k.k.jumlah), 0), 2)} item`;
        if (sisa.length) daftar += `\n• Masih di aku: ${sisa.map((s) => `${s.nama} ${angka(s.sisa, 2)}`).join(', ')}`;
        const teks = isiTemplate(template('laporanPenitip').teks, {
          sapaan: x.sapaan ?? D.setelan().sapaanBawaan ?? 'Kak', nama: x.nama, toko: D.setelan().namaToko || '',
          periode: bl.dari ? `${tgl(bl.dari, { hari: false })} sampai ${tgl(bl.sampai, { hari: false })}` : '', daftar, total: rp(bl.total), rekening: x.rekening ? `Ke rekening ${x.rekening}` : '',
        });
        bukaTeksPromo('Laporan ke penitip', teks, x.wa);
      },
      setor: async (b, e, ctx) => {
        const id = curPenitip(ctx);
        const bl = D.titipanBelumSetor(id);
        if (!(await konfirmasi('Tandai sudah disetor?', `${rp(bl.total)} ke ${ctx.S.get('penitip', id).nama}. Penjualan ini tidak akan muncul lagi di "Belum disetor".`, { ya: 'Sudah disetor' }))) return;
        const sid = 'st' + Date.now().toString(36);
        const ops = [['setoran', { id: sid, penitipId: id, tanggal: D.today(), dari: bl.dari, sampai: bl.sampai, terjual: bl.qty, total: Math.round(bl.total), untung: Math.round(bl.untung), rincian: bl.perProduk.map((r) => `${r.nama} x${r.qty}`).join(', ') }]];
        bl.items.forEach(({ it }) => ops.push(['itemPesanan', { ...it, setoranId: sid }]));
        bl.kembali.forEach(({ k }) => ops.push(['stokKeluar', { ...k, setoranId: sid }]));
        ctx.S.putMany(ops);
        konfeti();
        toast('Setoran dicatat');
      },
    },
  },

  penitipForm: {
    form: true,
    title: (p) => (p.id ? 'Ubah penitip' : 'Penitip baru'),
    render({ id }, ctx) {
      const x = id ? ctx.S.get('penitip', id) || {} : { sapaan: D.setelan().sapaanBawaan ?? 'Kak' };
      return `<form novalidate><div class="card">
        ${field('Nama', `<input type="text" id="pt-n" name="nama" value="${h(x.nama || '')}" required>`, { id: 'pt-n' })}
        <div class="field"><span class="lbl2">Sapaan</span>${chips('sapaan', D.SAPAAN.map((s) => [s, s]), x.sapaan ?? '', { label: 'Sapaan' })}</div>
        ${field('Nomor WhatsApp', `<input type="tel" id="pt-w" name="wa" inputmode="tel" value="${h(x.wa || '')}">`, { id: 'pt-w' })}
        ${field('Rekening', `<input type="text" id="pt-r" name="rekening" value="${h(x.rekening || '')}" placeholder="Bank, nomor, atas nama">`, { id: 'pt-r' })}
        ${field('Catatan', `<input type="text" id="pt-c" name="catatan" value="${h(x.catatan || '')}">`, { id: 'pt-c' })}
      </div><button class="btn pri block">${ic('check')}Simpan</button>
      ${id ? `<button type="button" class="btn danger block" data-act="hapus" style="margin-top:10px">${ic('trash')}Hapus penitip</button>` : ''}</form>`;
    },
    actions: {
      hapus: async (b, e, ctx) => {
        if (!(await konfirmasi('Hapus penitip?', 'Riwayat penjualan dan setoran tetap tersimpan.', { ya: 'Hapus', bahaya: true }))) return;
        ctx.S.remove('penitip', curForm);
        ctx.backN(2);
      },
    },
    submit(form, ctx) {
      const f = formData(form);
      if (!f.nama) return toast('Isi nama penitip');
      const lama = curForm ? ctx.S.get('penitip', curForm) : null;
      ctx.S.put('penitip', { ...(lama || {}), ...(curForm ? { id: curForm } : {}), nama: f.nama, sapaan: f.sapaan, wa: f.wa, rekening: f.rekening, catatan: f.catatan });
      toast('Penitip tersimpan');
      ctx.back();
    },
  },

  terimaTitipan: {
    form: true,
    enter() { draftTerima = null; },
    title: 'Terima titipan',
    render({ penitip }, ctx) {
      const S = ctx.S;
      const produk = S.all('produk').filter((p) => p.jenis === 'titipan' && p.penitipId === penitip);
      if (!produk.length) return kosong('cake', 'Belum ada produk titipan', 'Tambah produk dengan jenis Titipan dan pilih penitip ini.', `<button class="btn pri" data-go="productForm" data-penitip="${h(penitip)}">${ic('plus')}Tambah produk titipan</button>`);
      const vs = produk.flatMap((p) => D.varianDari(p.id).map((v) => ({ v, p })));
      if (!draftTerima) draftTerima = { tanggal: D.today(), items: vs.map(({ v }) => ({ varianId: v.id, jumlah: '', hargaSetor: v.hargaSetor, harga: v.harga })) };
      const d = draftTerima;
      return `<form novalidate>
        ${field('Tanggal terima', `<input type="date" id="tt-t" name="tanggal" value="${h(d.tanggal)}" required>`, { id: 'tt-t' })}
        <p class="small muted">Isi jumlah untuk produk yang dititipkan hari ini. Yang dikosongkan dilewati.</p>
        ${d.items.map((it, i) => {
          const x = vs.find((y) => y.v.id === it.varianId);
          return `<div class="line-edit"><b>${h(x.p.nama)} · ${h(x.v.nama)}</b><input type="hidden" name="varian[]" value="${h(it.varianId)}">
            <div class="grid3" style="margin-top:8px">
              <div class="field" style="margin-bottom:0"><label for="tt-j-${i}">Jumlah</label><input type="number" inputmode="numeric" min="0" step="any" id="tt-j-${i}" name="jumlah[]" value="${h(it.jumlah)}"></div>
              <div class="field" style="margin-bottom:0"><label for="tt-s-${i}">Harga setor</label>${money('setor[]', it.hargaSetor, { id: 'tt-s-' + i })}</div>
              <div class="field" style="margin-bottom:0"><label for="tt-h-${i}">Harga jual</label>${money('jual[]', it.harga, { id: 'tt-h-' + i })}</div>
            </div></div>`;
        }).join('')}
        <button class="btn pri block">${ic('check')}Simpan titipan</button></form>`;
    },
    submit(form, ctx) {
      const S = ctx.S;
      const f = formData(form);
      const ops = [];
      (f.varian || []).forEach((vid, i) => {
        const j = num(f.jumlah[i]);
        if (!(j > 0)) return;
        const v = S.get('varian', vid), pr = S.get('produk', v.produkId);
        ops.push(['stok', { varianId: vid, produkId: pr.id, nama: `${pr.nama} · ${v.nama}`, tanggal: f.tanggal, kedaluwarsa: D.tglKedaluwarsa(f.tanggal, pr), jumlah: j, hpp: num(f.setor[i]), harga: num(f.jual[i]), sumber: 'titipan', penitipId: pr.penitipId }]);
        if (num(f.setor[i]) !== num(v.hargaSetor) || num(f.jual[i]) !== num(v.harga)) ops.push(['varian', { ...v, hargaSetor: num(f.setor[i]), harga: num(f.jual[i]) }]);
      });
      if (!ops.length) return toast('Isi jumlah minimal satu produk');
      S.putMany(ops);
      draftTerima = null;
      toast('Titipan masuk stok');
      ctx.back();
    },
  },
};

let curForm = '';
const r0 = views.penitipForm.render;
views.penitipForm.render = (p, ctx) => { curForm = p.id || ''; return r0(p, ctx); };
let curP = '';
const r1 = views.penitip.render;
views.penitip.render = (p, ctx) => { curP = p.id; return r1(p, ctx); };
const curPenitip = () => curP;

function ringkasJual(form) {
  const f = formData(form);
  const tot = (f.qty || []).reduce((s, q, i) => s + num(q) * num(f.harga[i]), 0);
  form.querySelector('#ringkas-jual').innerHTML = kv('Total', rp(tot), 'total');
}

export function bukaTeksPromo(judul, teks, wa = '', fotoIds = []) {
  const fotos = [...new Set(fotoIds.filter(Boolean))].map((id) => fotoUrl(id)).filter(Boolean).slice(0, 4);
  const files = fotos.map((d, i) => dataUrlKeFile(d, `kue-${i + 1}.jpg`));
  const bisaFoto = files.length && navigator.canShare && navigator.canShare({ files });
  openSheet({
    html: `<h2 id="sheet-t">${h(judul)}</h2>
      ${field('Teks', `<textarea id="promo-t" rows="10">${h(teks)}</textarea>`, { id: 'promo-t', hint: 'Boleh diubah dulu. Cocok untuk status WhatsApp, Instagram, atau grup.' })}
      ${bisaFoto ? `<div class="chips wrapc" style="margin-bottom:10px">${fotos.map((f) => `<img src="${f}" alt="" width="56" height="56" style="border-radius:10px;object-fit:cover">`).join('')}</div><button class="btn pri block" data-act="bagiFoto" style="margin-bottom:8px">${ic('image')}Bagikan ${files.length} foto + teks</button>` : ''}
      <div class="btns"><button class="btn" data-act="salin">${ic('copy')}Salin</button>${navigator.share ? `<button class="btn" data-act="bagi">${ic('share')}Bagikan</button>` : ''}<button class="btn pri" data-act="wa">${ic('chat')}Buka WhatsApp</button></div>`,
    actions: {
      salin: async (b, e, sh) => { (await salin(sh.querySelector('#promo-t').value)) ? toast('Teks disalin') : toast('Gagal menyalin'); },
      bagi: async (b, e, sh) => { try { await navigator.share({ text: sh.querySelector('#promo-t').value }); } catch {} },
      bagiFoto: async (b, e, sh) => {
        const t = sh.querySelector('#promo-t').value;
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
        if (ios) await salin(t);
        try {
          await navigator.share({ files, text: t });
          if (ios) toast('Kalau teksnya tidak ikut, tempel saja. Sudah disalin.', 4500);
        } catch {}
      },
      wa: async (b, e, sh) => {
        const t = sh.querySelector('#promo-t').value;
        await salin(t);
        const n = wa ? nomorWa(wa) : '';
        window.open(`https://wa.me/${n}?text=${encodeURIComponent(t)}`, '_blank', 'noopener');
      },
    },
  });
}
