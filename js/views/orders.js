import { h, ic, rp, angka, tgl, tglPanjang, inisial, toast, openSheet, closeSheet, konfirmasi, konfeti, salin, nomorWa, dataUrlKeFile } from '../util.js';
import { num, isiTemplate, addDays } from '../calc.js';
import * as D from '../data.js';
import { TEMPLATE } from '../seed.js';
import { chips, field, money, kosong, tagBayar, tagStatus, kv, formData } from './ui.js';
import { itemPesanan } from './home.js';
import { qrisLokal } from '../qris.js';

const FILTER = [['aktif', 'Aktif'], ['belum', 'Belum lunas'], ['hariini', 'Hari ini'], ['selesai', 'Selesai'], ['batal', 'Batal'], ['semua', 'Semua']];
let cari = '';

export const template = (k) => {
  const t = D.store().get('template', k);
  return t && t.teks ? t : { id: k, ...TEMPLATE[k] };
};

export const qrisDataUrl = () => qrisLokal()?.data || '';

function daftarTeks(items) {
  return items.map((it) => `• ${it.nama} x${angka(it.qty)} = ${rp(num(it.qty) * num(it.harga))}`).join('\n');
}

export function dataTemplate(pesananList, extra = {}) {
  const st = D.setelan();
  const p0 = pesananList[0];
  const info = pesananList.map((p) => D.pesananInfo(p));
  const pel = info[0]?.pel;
  const items = info.flatMap((i) => i.items);
  const total = info.reduce((s, i) => s + i.total, 0);
  const dibayar = info.reduce((s, i) => s + i.dibayar, 0);
  const sisa = info.reduce((s, i) => s + i.sisa, 0);
  const ongkir = pesananList.reduce((s, p) => s + num(p.ongkir), 0);
  const diskon = pesananList.reduce((s, p) => s + num(p.diskon), 0);
  let daftar = daftarTeks(items);
  if (diskon) daftar += `\n• Diskon -${rp(diskon)}`;
  if (ongkir) daftar += `\n• Ongkir ${rp(ongkir)}`;
  return {
    sapaan: D.sapaanPel(pel), nama: pel?.nama || '', toko: st.namaToko || '',
    daftar, total: rp(total), dibayar: dibayar ? rp(dibayar) : '', sisa: sisa ? rp(sisa) : '',
    tanggalAmbil: p0?.tglAmbil ? tglPanjang(p0.tglAmbil) : '', jam: p0?.jam ? 'jam ' + p0.jam : '',
    alamat: p0?.cara && p0.cara !== 'ambil' ? p0.alamat || '' : '', rekening: st.rekening || '',
    resi: '', dp: '', ...extra,
  };
}

// ---------- Kirim ke WhatsApp ----------
async function bagikan(teks, wa, { pakaiQris }) {
  const q = pakaiQris ? qrisDataUrl() : '';
  if (q && navigator.canShare) {
    const file = dataUrlKeFile(q, 'qris.png');
    if (navigator.canShare({ files: [file] })) {
      // Di iPhone teks kadang tidak ikut, jadi disalin dulu.
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (ios) await salin(teks);
      try {
        await navigator.share({ files: [file], text: teks });
        if (ios) toast('Kalau teksnya tidak ikut, tempel saja di chat. Sudah disalin.', 4500);
        return true;
      } catch (e) {
        if (e.name === 'AbortError') return false;
      }
    }
  }
  if (navigator.share && !q) {
    try { await navigator.share({ text: teks }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  await salinBukaWa(teks, wa);
  return true;
}
async function salinBukaWa(teks, wa) {
  const ok = await salin(teks);
  const n = nomorWa(wa);
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(teks)}`, '_blank', 'noopener');
  toast(ok ? 'Teks disalin dan WhatsApp dibuka.' : 'WhatsApp dibuka dengan teks tagihan.');
}
function unduhQris() {
  const q = qrisDataUrl();
  if (!q) return toast('Belum ada gambar QRIS. Unggah dulu di Pengaturan.');
  const a = document.createElement('a');
  a.href = q;
  a.download = 'qris.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function bukaTagih(pesananId, ctx) {
  const S = ctx.S;
  const p = S.get('pesanan', pesananId);
  const info = D.pesananInfo(p);
  const lain = p.pelangganId ? S.all('pesanan').filter((x) => x.id !== p.id && x.pelangganId === p.pelangganId && x.status !== 'batal' && D.pesananInfo(x).sisa > 0) : [];
  let pilih = new Set([p.id]);
  let jenis = info.dibayar > 0 ? 'lunas' : 'dp';
  let dp = '';
  const ada = !!qrisDataUrl();
  const susun = () => {
    const list = [...pilih].map((id) => S.get('pesanan', id));
    const d = dataTemplate(list, { dp: dp ? rp(dp) : '' });
    return isiTemplate(template(jenis === 'dp' ? 'tagihDP' : 'tagihLunas').teks, d);
  };
  const html = () => `<h2 id="sheet-t">Tagih ${h(D.namaPel(info.pel))}</h2>
    ${chips('jenisTagih', [['dp', 'DP'], ['lunas', 'Pelunasan']], jenis, { bawaan: 'lunas', label: 'Jenis tagihan' })}
    <div data-dp ${jenis === 'dp' ? '' : 'hidden'}>${field('Nominal DP', money('dp', dp, { id: 'dp-tagih', placeholder: 'Isi sendiri' }), { id: 'dp-tagih', hint: 'Kosongkan kalau tidak mau mencantumkan DP.' })}</div>
    ${lain.length ? `<div class="field"><span class="lbl2">Gabung dengan tagihan lain</span><div class="chips wrapc">${lain.map((x) => `<button type="button" class="chip" data-act="gabung" data-id="${h(x.id)}" aria-pressed="${pilih.has(x.id)}">${tgl(x.tglAmbil, { hari: false })} · ${rp(D.pesananInfo(x).sisa)}</button>`).join('')}</div></div>` : ''}
    ${field('Teks tagihan', `<textarea id="teks-tagih" rows="9">${h(susun())}</textarea>`, { id: 'teks-tagih', hint: 'Boleh diubah dulu sebelum dikirim.' })}
    ${ada ? '<img class="qris-prev" alt="Gambar QRIS" width="220" height="220" src="' + qrisDataUrl() + '">' : `<div class="banner">${ic('qr')}<span class="grow">Belum ada gambar QRIS. Unggah di Lainnya, Pengaturan.</span></div>`}
    <div class="btns">
      ${ada ? `<button class="btn pri block" data-act="share">${ic('share')}Bagikan QRIS + teks</button>` : ''}
      <button class="btn ${ada ? '' : 'pri'} block" data-act="wa">${ic('chat')}Salin teks & buka WhatsApp</button>
      ${ada ? `<button class="btn block" data-act="unduh">${ic('download')}Simpan gambar QRIS</button>` : ''}
    </div>`;
  const ulang = (sheet) => { const t = sheet.querySelector('#teks-tagih'); if (t) t.value = susun(); };
  openSheet({
    html: html(),
    actions: {
      gabung: (b, e, sheet) => { const id = b.dataset.id; pilih.has(id) ? pilih.delete(id) : pilih.add(id); b.setAttribute('aria-pressed', String(pilih.has(id))); ulang(sheet); },
      share: (b, e, sheet) => bagikan(sheet.querySelector('#teks-tagih').value, info.pel?.wa, { pakaiQris: true }),
      wa: (b, e, sheet) => salinBukaWa(sheet.querySelector('#teks-tagih').value, info.pel?.wa),
      unduh: () => unduhQris(),
    },
    input: (el, sheet) => {
      if (el.name === 'jenisTagih') { jenis = el.value || 'lunas'; sheet.querySelector('[data-dp]').hidden = jenis !== 'dp'; ulang(sheet); }
      if (el.name === 'dp') { dp = num(el.value) || ''; ulang(sheet); }
    },
  });
}

export function bukaPesan(pesananId, ctx) {
  const p = ctx.S.get('pesanan', pesananId);
  const info = D.pesananInfo(p);
  let k = p.status === 'siap' ? 'siap' : p.cara === 'kurir' ? 'dikirim' : p.status === 'selesai' ? 'terimaKasih' : 'siap';
  let resi = '';
  const susun = () => isiTemplate(template(k).teks, dataTemplate([p], { resi }));
  openSheet({
    html: `<h2 id="sheet-t">Kirim pesan</h2>
      ${chips('tpl', [['siap', 'Siap diambil'], ['dikirim', 'Dikirim'], ['terimaKasih', 'Terima kasih']], k, { bawaan: 'siap', label: 'Template' })}
      <div data-resi ${k === 'dikirim' ? '' : 'hidden'}>${field('Nomor resi', '<input type="text" id="resi" name="resi" autocomplete="off">', { id: 'resi' })}</div>
      ${field('Teks', `<textarea id="teks-pesan" rows="8">${h(susun())}</textarea>`, { id: 'teks-pesan' })}
      <button class="btn pri block" data-act="wa">${ic('chat')}Salin teks & buka WhatsApp</button>`,
    input: (el, sheet) => {
      if (el.name === 'tpl') { k = el.value || 'siap'; sheet.querySelector('[data-resi]').hidden = k !== 'dikirim'; }
      if (el.name === 'resi') resi = el.value.trim();
      sheet.querySelector('#teks-pesan').value = susun();
    },
    actions: { wa: (b, e, sheet) => salinBukaWa(sheet.querySelector('#teks-pesan').value, info.pel?.wa) },
  });
}

function bukaBayar(pesananId, ctx, bayarId) {
  const S = ctx.S;
  const p = S.get('pesanan', pesananId);
  const info = D.pesananInfo(p);
  const lama = bayarId ? S.get('pembayaran', bayarId) : null;
  openSheet({
    html: `<h2 id="sheet-t">${lama ? 'Ubah pembayaran' : 'Catat pembayaran'}</h2>
      <form>
        <p class="small muted" style="margin-top:-6px">Total ${rp(info.total)} · sudah dibayar ${rp(info.dibayar)} · sisa ${rp(info.sisa)}</p>
        ${field('Nominal', money('nominal', lama ? lama.nominal : '', { id: 'nominal-bayar', placeholder: 'Isi nominal', attrs: 'required' }), { id: 'nominal-bayar' })}
        ${!lama && info.sisa > 0 ? `<button type="button" class="btn sm" data-act="lunasi" style="margin:-6px 0 12px">Isi sisa ${rp(info.sisa)}</button>` : ''}
        <div class="grid2">${field('Tanggal', `<input type="date" id="tgl-bayar" name="tanggal" value="${h(lama?.tanggal || D.today())}" required>`, { id: 'tgl-bayar' })}
        <div class="field"><span class="lbl2">Cara bayar</span>${chips('metode', [['QRIS', 'QRIS'], ['Transfer', 'Transfer'], ['Tunai', 'Tunai']], lama?.metode || 'QRIS', { bawaan: 'QRIS', label: 'Cara bayar' })}</div></div>
        <div class="btns">${lama ? '<button type="button" class="btn danger" data-act="hapus">Hapus</button>' : ''}<button class="btn pri">Simpan</button></div>
      </form>`,
    actions: {
      lunasi: (b, e, sheet) => { sheet.querySelector('#nominal-bayar').value = Math.round(info.sisa); },
      hapus: async () => { closeSheet(); if (await konfirmasi('Hapus pembayaran?', 'Catatan pembayaran ini akan dihapus.', { ya: 'Hapus', bahaya: true })) { S.remove('pembayaran', lama.id); toast('Pembayaran dihapus'); } },
    },
    submit: (form) => {
      const f = formData(form);
      const n = num(f.nominal);
      if (!(n > 0)) return toast('Isi nominal pembayaran');
      const sebelum = info.sb;
      S.put('pembayaran', { ...(lama || {}), pesananId, nominal: n, tanggal: f.tanggal, metode: f.metode });
      closeSheet();
      const sesudah = D.pesananInfo(S.get('pesanan', pesananId)).sb;
      if (sesudah === 'lunas' && sebelum !== 'lunas') { konfeti(); toast('Lunas! 🎉'); } else toast('Pembayaran tersimpan');
      ctx.rerender();
    },
  });
}

function bukaBiaya(pesananId, ctx, id) {
  const S = ctx.S;
  const lama = id ? S.get('biaya', id) : null;
  openSheet({
    html: `<h2 id="sheet-t">${lama ? 'Ubah biaya' : 'Biaya yang saya tanggung'}</h2>
      <form>
        <p class="small muted" style="margin-top:-6px">Misalnya ongkir yang kamu bayar sendiri. Biaya ini mengurangi untung.</p>
        <div class="field"><span class="lbl2">Jenis</span>${chips('jenis', [['Ongkir', 'Ongkir'], ['Kemasan tambahan', 'Kemasan'], ['Lainnya', 'Lainnya']], lama?.jenis || 'Ongkir', { bawaan: 'Ongkir', label: 'Jenis biaya' })}</div>
        ${field('Nominal', money('nominal', lama?.nominal ?? '', { id: 'nom-biaya', attrs: 'required' }), { id: 'nom-biaya' })}
        ${field('Catatan', `<input type="text" id="cat-biaya" name="catatan" value="${h(lama?.catatan || '')}">`, { id: 'cat-biaya' })}
        <div class="btns">${lama ? '<button type="button" class="btn danger" data-act="hapus">Hapus</button>' : ''}<button class="btn pri">Simpan</button></div>
      </form>`,
    actions: { hapus: () => { S.remove('biaya', id); closeSheet(); ctx.rerender(); } },
    submit: (form) => {
      const f = formData(form);
      if (!(num(f.nominal) > 0)) return toast('Isi nominal biaya');
      S.put('biaya', { ...(lama || {}), pesananId, tanggal: lama?.tanggal || D.today(), jenis: f.jenis, nominal: num(f.nominal), catatan: f.catatan });
      closeSheet();
      ctx.rerender();
    },
  });
}

// ---------- Form pesanan ----------
let draft = null;

function opsiVarian(sel) {
  const S = D.store();
  return S.all('produk').sort((a, b) => a.nama.localeCompare(b.nama)).map((p) => {
    const vs = D.varianDari(p.id);
    if (!vs.length) return '';
    return `<optgroup label="${h(p.nama)}">${vs.map((v) => `<option value="${h(v.id)}" ${v.id === sel ? 'selected' : ''}>${h(p.nama)} · ${h(v.nama)} (${rp(v.harga)})</option>`).join('')}</optgroup>`;
  }).join('');
}

function barisItem(it, i) {
  return `<div class="line-edit" data-baris="${i}">
    <div class="row" style="align-items:flex-end">
      <div class="field grow" style="margin-bottom:8px"><label for="v-${i}">Produk</label><select id="v-${i}" name="varian[]" required><option value="">Pilih produk</option>${opsiVarian(it.varianId)}</select></div>
      <button type="button" class="iconbtn" data-act="hapusItem" data-i="${i}" aria-label="Hapus baris ini" style="margin-bottom:8px">${ic('trash')}</button>
    </div>
    <div class="grid2"><div class="field" style="margin-bottom:0"><label for="q-${i}">Jumlah</label><input type="number" inputmode="numeric" min="0" step="any" id="q-${i}" name="qty[]" value="${h(it.qty ?? 1)}" required></div>
    <div class="field" style="margin-bottom:0"><label for="h-${i}">Harga satuan</label>${money('harga[]', it.harga, { id: 'h-' + i })}</div></div>
  </div>`;
}

function ringkasForm(form) {
  const f = formData(form);
  const qty = f.qty || [], harga = f.harga || [];
  const sub = qty.reduce((s, q, i) => s + num(q) * num(harga[i]), 0);
  const total = Math.max(sub - num(f.diskon) + num(f.ongkir), 0);
  return `${kv('Subtotal', rp(sub))}${num(f.diskon) ? kv('Diskon', '-' + rp(f.diskon)) : ''}${num(f.ongkir) ? kv('Ongkir', rp(f.ongkir)) : ''}${kv('Total', rp(total), 'total')}${num(f.dp) ? kv('DP diterima', rp(f.dp)) + kv('Sisa', rp(Math.max(total - num(f.dp), 0))) : ''}`;
}

function bacaDraft(form) {
  const f = formData(form);
  const vs = f.varian || [], qs = f.qty || [], hs = f.harga || [];
  draft = { ...draft, ...f, items: vs.map((v, i) => ({ ...(draft.items[i] || {}), varianId: v, qty: qs[i], harga: hs[i] })) };
}

export const views = {
  orders: {
    title: 'Pesanan',
    fab: { label: 'Catat pesanan baru', go: 'orderForm' },
    render(p, ctx) {
      const S = ctx.S;
      const f = localStorage.getItem('bukue:filterPesanan') || 'aktif';
      const t = D.today();
      let list = D.semuaPesanan().map((p) => ({ p, i: D.pesananInfo(p) }));
      list = list.filter(({ p, i }) => {
        if (f === 'aktif') return !['selesai', 'batal'].includes(p.status);
        if (f === 'belum') return p.status !== 'batal' && i.sisa > 0;
        if (f === 'hariini') return p.tglAmbil === t && p.status !== 'batal';
        if (f === 'selesai') return p.status === 'selesai';
        if (f === 'batal') return p.status === 'batal';
        return true;
      });
      if (cari) {
        const q = cari.toLowerCase();
        list = list.filter(({ p, i }) => [D.namaPel(i.pel), p.kode, p.catatan, ...i.items.map((x) => x.nama)].join(' ').toLowerCase().includes(q));
      }
      if (f === 'aktif' || f === 'belum' || f === 'hariini') list.sort((a, b) => String(a.p.tglAmbil).localeCompare(String(b.p.tglAmbil)));
      let out = chips('filter', FILTER, f, { bawaan: 'aktif', label: 'Saring pesanan', wrap: false });
      out += `<div class="field" style="margin-top:6px"><label for="cari-pesanan" class="sr">Cari pesanan</label><input type="search" id="cari-pesanan" placeholder="Cari nama, kode, atau produk" value="${h(cari)}"></div>`;
      if (!S.all('pesanan').length) return out + kosong('receipt', 'Belum ada pesanan', 'Pesanan yang kamu catat akan muncul di sini.', `<button class="btn pri" data-go="orderForm">${ic('plus')}Catat pesanan</button>`);
      if (!list.length) return out + kosong('search', 'Tidak ada yang cocok', 'Coba saringan lain atau kata kunci lain.');
      const tot = list.reduce((s, x) => s + (f === 'belum' ? x.i.sisa : x.i.total), 0);
      out += `<p class="small muted" style="margin:0 2px 8px">${list.length} pesanan · ${f === 'belum' ? 'sisa tagihan' : 'total'} ${rp(tot)}</p>`;
      out += `<div class="list stagger">${list.map(({ p, i }, k) => itemPesanan(p, i).replace('<button class="item"', `<button class="item" style="--i:${Math.min(k, 12)}"`)).join('')}</div>`;
      return out;
    },
    input(el, ctx) {
      if (el.name === 'filter') { localStorage.setItem('bukue:filterPesanan', el.value || 'aktif'); ctx.rerender(); }
      if (el.id === 'cari-pesanan') {
        cari = el.value;
        clearTimeout(views.orders._t);
        views.orders._t = setTimeout(() => { ctx.rerender(); const i = document.getElementById('cari-pesanan'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250);
      }
    },
  },

  order: {
    title: (p, ctx) => ctx.S.get('pesanan', p.id)?.kode || 'Pesanan',
    render({ id }, ctx) {
      const S = ctx.S;
      curId = id;
      const p = S.get('pesanan', id);
      if (!p) return kosong('receipt', 'Pesanan tidak ditemukan', 'Mungkin sudah dihapus dari HP lain.');
      const i = D.pesananInfo(p);
      const idx = D.STATUS.findIndex((s) => s[0] === p.status);
      const cara = (D.CARA.find((c) => c[0] === p.cara) || ['', 'Diambil'])[1];
      let out = `<div class="card">
        <div class="row"><div class="av">${h(inisial(D.namaPel(i.pel)))}</div>
          <div class="grow">${i.pel ? `<button class="link" style="padding:0;min-height:0;font-size:16px" data-go="customer" data-id="${h(i.pel.id)}">${h(i.pel.nama)}</button>` : '<b>Tanpa nama</b>'}
          <div class="small muted">${tagBayar(i.sb)} ${tagStatus(p.status)}</div></div>
          ${i.pel?.wa ? `<a class="iconbtn" href="https://wa.me/${nomorWa(i.pel.wa)}" target="_blank" rel="noopener" aria-label="Chat WhatsApp">${ic('chat')}</a>` : ''}
        </div>
        <div class="steps" aria-hidden="true">${D.STATUS.slice(0, 6).map((s, k) => `<i class="${p.status !== 'batal' && k <= idx ? 'on' : ''}"></i>`).join('')}</div>
        ${chips('status', D.STATUS, p.status, { bawaan: p.status, label: 'Ubah status pesanan', wrap: false })}
      </div>`;
      out += `<div class="card">
        ${kv(ic('calendar') + ' Ambil', h(tglPanjang(p.tglAmbil)) + (p.jam ? ' · ' + h(p.jam) : ''))}
        ${kv(ic('truck') + ' Cara', h(cara))}
        ${p.alamat && p.cara !== 'ambil' ? `<p class="small" style="margin:4px 0">${h(p.alamat)}</p>` : ''}
        ${p.catatan ? `<div class="banner acc" style="margin:8px 0 0">${ic('text')}<span class="grow" style="white-space:pre-wrap">${h(p.catatan)}</span></div>` : ''}
        <p class="small muted" style="margin:8px 0 0">Dicatat ${h(tgl(p.tglPesan, { tahun: true }))}</p>
      </div>`;
      out += `<div class="card"><h2>Isi pesanan</h2>
        ${i.items.map((it) => kv(`${h(it.nama)} <span class="muted">x${angka(it.qty, 2)}</span>`, rp(num(it.qty) * num(it.harga)))).join('')}
        ${num(p.diskon) ? kv('Diskon', '-' + rp(p.diskon)) : ''}${num(p.ongkir) ? kv('Ongkir dari pelanggan', rp(p.ongkir)) : ''}
        ${kv('Total', rp(i.total), 'total')}${kv('Sudah dibayar', rp(i.dibayar))}${kv('Sisa', rp(i.sisa))}
      </div>`;
      out += `<div class="btns" style="margin-bottom:12px">
        ${i.sisa > 0 ? `<button class="btn pri" data-act="tagih">${ic('wallet')}Tagih</button>` : ''}
        <button class="btn" data-act="pesan">${ic('chat')}Kirim pesan</button></div>`;
      out += `<div class="sec"><span>Pembayaran</span><button class="link" data-act="bayar">+ Catat</button></div>`;
      out += i.bayar.length ? `<div class="list">${i.bayar.map((b) => `<button class="item" data-act="ubahBayar" data-id="${h(b.id)}"><div class="av">${ic('wallet')}</div><div class="grow"><div class="t">${rp(b.nominal)}</div><div class="s">${h(tgl(b.tanggal))} · ${h(b.metode || '')}</div></div></button>`).join('')}</div>` : '<p class="small muted" style="margin:0 2px 12px">Belum ada pembayaran.</p>';
      out += `<div class="sec"><span>Biaya yang saya tanggung</span><button class="link" data-act="biaya">+ Tambah</button></div>`;
      out += i.biayaList.length ? `<div class="list">${i.biayaList.map((b) => `<button class="item" data-act="ubahBiaya" data-id="${h(b.id)}"><div class="grow"><div class="t">${h(b.jenis)}</div><div class="s">${h(b.catatan || '')}</div></div><div class="r num">${rp(b.nominal)}</div></button>`).join('')}</div>` : '<p class="small muted" style="margin:0 2px 12px">Tidak ada. Catat ongkir atau biaya lain yang kamu bayar sendiri.</p>';
      out += `<details class="card"><summary style="font-weight:700;min-height:28px">Rincian untung · ${rp(i.untung)}</summary>
        <p class="small muted">Modal (HPP) dikunci saat pesanan dibuat.</p>
        ${i.items.map((it) => kv(`${h(it.nama)} <span class="muted">(${rp(it.harga)} - modal ${rp(it.hpp)}) x${angka(it.qty, 2)}</span>`, rp(num(it.qty) * (num(it.harga) - num(it.hpp))))).join('')}
        ${num(p.diskon) ? kv('Diskon', '-' + rp(p.diskon)) : ''}
        ${i.biaya ? kv('Biaya saya tanggung', '-' + rp(i.biaya)) : ''}
        ${kv('Untung', rp(i.untung), 'total')}
      </details>`;
      out += `<div class="btns"><button class="btn" data-go="orderForm" data-id="${h(p.id)}">${ic('edit')}Ubah</button><button class="btn danger" data-act="hapus">${ic('trash')}Hapus</button></div>`;
      return out;
    },
    input(el, ctx) {
      if (el.name !== 'status') return;
      const S = ctx.S;
      const p = S.get('pesanan', ctx_id());
      const status = el.value;
      if (!status || status === p.status) return;
      S.put('pesanan', { ...p, status, tglSelesai: status === 'selesai' ? p.tglSelesai || D.today() : '' });
      if (status === 'selesai') konfeti();
      toast('Status: ' + D.labelStatus(status));
      ctx.rerender();
    },
    actions: {
      tagih: (b, e, ctx) => bukaTagih(ctx_id(), ctx),
      pesan: (b, e, ctx) => bukaPesan(ctx_id(), ctx),
      bayar: (b, e, ctx) => bukaBayar(ctx_id(), ctx),
      ubahBayar: (b, e, ctx) => bukaBayar(ctx_id(), ctx, b.dataset.id),
      biaya: (b, e, ctx) => bukaBiaya(ctx_id(), ctx),
      ubahBiaya: (b, e, ctx) => bukaBiaya(ctx_id(), ctx, b.dataset.id),
      hapus: async (b, e, ctx) => {
        if (!(await konfirmasi('Hapus pesanan?', 'Pesanan, isinya, dan catatan pembayarannya akan dihapus dari semua HP.', { ya: 'Hapus', bahaya: true }))) return;
        const S = ctx.S;
        const id = ctx_id();
        const ops = [['pesanan', { ...S.get('pesanan', id), deleted: true }]];
        ['itemPesanan', 'pembayaran', 'biaya'].forEach((c) => S.where(c, 'pesananId', id).forEach((r) => ops.push([c, { ...r, deleted: true }])));
        S.putMany(ops);
        toast('Pesanan dihapus');
        ctx.back();
      },
    },
  },

  orderForm: {
    form: true,
    enter() { draft = null; },
    title: (p) => (p.id ? 'Ubah pesanan' : 'Pesanan baru'),
    render({ id, pelanggan }, ctx) {
      const S = ctx.S;
      if (!draft || draft._for !== (id || 'baru')) {
        const lama = id ? S.get('pesanan', id) : null;
        draft = lama
          ? { _for: id, ...lama, items: S.where('itemPesanan', 'pesananId', id).map((x) => ({ ...x })) }
          : { _for: 'baru', pelangganId: pelanggan || '', tglAmbil: addDays(D.today(), 1), jam: '', cara: 'ambil', items: [{ qty: 1 }], diskon: '', ongkir: '', dp: '', metode: 'QRIS' };
      }
      const d = draft;
      if (!S.all('varian').length) {
        return kosong('cake', 'Belum ada produk', 'Tambahkan produk dan harganya dulu, baru bisa mencatat pesanan.', `<button class="btn pri" data-go="productForm">${ic('plus')}Tambah produk</button>`);
      }
      const pels = S.all('pelanggan').sort((a, b) => a.nama.localeCompare(b.nama));
      const baru = d.pelangganId === '_baru';
      return `<form novalidate>
        <div class="card">
          ${field('Pelanggan', `<select id="pel" name="pelangganId"><option value="">Tanpa nama</option><option value="_baru" ${baru ? 'selected' : ''}>+ Pelanggan baru</option>${pels.map((p) => `<option value="${h(p.id)}" ${p.id === d.pelangganId ? 'selected' : ''}>${h(p.nama)}</option>`).join('')}</select>`, { id: 'pel' })}
          <div data-pelbaru ${baru ? '' : 'hidden'}>
            ${field('Nama', `<input type="text" id="pb-nama" name="pbNama" value="${h(d.pbNama || '')}" autocomplete="off">`, { id: 'pb-nama' })}
            <div class="field"><span class="lbl2">Sapaan</span>${chips('pbSapaan', D.SAPAAN.map((s) => [s, s]), d.pbSapaan ?? D.setelan().sapaanBawaan ?? 'Kak', { label: 'Sapaan' })}</div>
            ${field('Nomor WhatsApp', `<input type="tel" id="pb-wa" name="pbWa" value="${h(d.pbWa || '')}" inputmode="tel" placeholder="08…">`, { id: 'pb-wa' })}
          </div>
        </div>
        <div class="sec"><span>Isi pesanan</span></div>
        <div id="baris-item">${d.items.map(barisItem).join('')}</div>
        <button type="button" class="btn block" data-act="tambahItem" style="margin-bottom:12px">${ic('plus')}Tambah produk</button>
        <div class="card">
          <div class="grid2">${field('Tanggal ambil/kirim', `<input type="date" id="tgl-ambil" name="tglAmbil" value="${h(d.tglAmbil)}" required>`, { id: 'tgl-ambil' })}
          ${field('Jam', `<input type="time" id="jam" name="jam" value="${h(d.jam || '')}">`, { id: 'jam' })}</div>
          <div class="field"><span class="lbl2">Cara ambil</span>${chips('cara', D.CARA, d.cara || 'ambil', { bawaan: 'ambil', label: 'Cara ambil' })}</div>
          <div data-antar ${d.cara && d.cara !== 'ambil' ? '' : 'hidden'}>
            ${field('Alamat', `<textarea id="alamat" name="alamat" rows="2" style="min-height:70px">${h(d.alamat || '')}</textarea>`, { id: 'alamat' })}
            ${field('Ongkir dibayar pelanggan', money('ongkir', d.ongkir, { id: 'ongkir' }), { id: 'ongkir', hint: 'Ongkir yang kamu bayar sendiri dicatat sebagai biaya di halaman pesanan.' })}
          </div>
          ${field('Catatan khusus', `<textarea id="catatan" name="catatan" rows="2" style="min-height:70px" placeholder="Tulisan di kue, pantangan, dll.">${h(d.catatan || '')}</textarea>`, { id: 'catatan' })}
          ${field('Diskon', money('diskon', d.diskon, { id: 'diskon' }), { id: 'diskon' })}
          ${!id ? `${field('DP diterima sekarang', money('dp', d.dp, { id: 'dp', placeholder: 'Kosongkan kalau belum ada' }), { id: 'dp' })}
          <div class="field"><span class="lbl2">Cara bayar DP</span>${chips('metode', [['QRIS', 'QRIS'], ['Transfer', 'Transfer'], ['Tunai', 'Tunai']], d.metode || 'QRIS', { bawaan: 'QRIS', label: 'Cara bayar' })}</div>` : ''}
        </div>
        <div class="card" id="ringkas" aria-live="polite"></div>
        <button class="btn pri block">${ic('check')}Simpan pesanan</button>
      </form>`;
    },
    mount(el) {
      const f = el.querySelector('form');
      if (f) el.querySelector('#ringkas').innerHTML = ringkasForm(f);
    },
    input(el, ctx) {
      const form = el.form || el.closest('form');
      if (!form) return;
      if (el.name === 'varian[]') {
        const v = ctx.S.get('varian', el.value);
        const i = el.closest('[data-baris]').dataset.baris;
        if (v) form.querySelector('#h-' + i).value = num(v.harga);
      }
      if (el.name === 'pelangganId') {
        form.querySelector('[data-pelbaru]').hidden = el.value !== '_baru';
        const pel = ctx.S.get('pelanggan', el.value);
        if (pel?.alamat && !form.alamat.value) form.alamat.value = pel.alamat;
      }
      if (el.name === 'cara') form.querySelector('[data-antar]').hidden = !el.value || el.value === 'ambil';
      bacaDraft(form);
      form.querySelector('#ringkas').innerHTML = ringkasForm(form);
    },
    change(el, ctx) { views.orderForm.input(el, ctx); },
    actions: {
      tambahItem: (b, e, ctx) => { bacaDraft(b.closest('form')); draft.items.push({ qty: 1 }); ctx.rerender(); setTimeout(() => document.getElementById('v-' + (draft.items.length - 1))?.focus(), 50); },
      hapusItem: (b, e, ctx) => { const form = b.closest('form'); bacaDraft(form); draft.items.splice(Number(b.dataset.i), 1); if (!draft.items.length) draft.items.push({ qty: 1 }); ctx.rerender(); },
    },
    submit(form, ctx) {
      const S = ctx.S;
      bacaDraft(form);
      const d = draft;
      const items = d.items.filter((it) => it.varianId && num(it.qty) > 0);
      if (!items.length) return toast('Pilih minimal satu produk');
      if (!d.tglAmbil) return toast('Isi tanggal ambil');
      let pelangganId = d.pelangganId;
      const ops = [];
      if (pelangganId === '_baru') {
        if (!d.pbNama) return toast('Isi nama pelanggan baru');
        pelangganId = 'pl' + Date.now().toString(36);
        ops.push(['pelanggan', { id: pelangganId, nama: d.pbNama, sapaan: d.pbSapaan ?? 'Kak', wa: d.pbWa || '', alamat: d.alamat || '', catatan: '' }]);
      }
      const id = d._for === 'baru' ? 'ps' + Date.now().toString(36) : d._for;
      const lama = d._for === 'baru' ? null : S.get('pesanan', id);
      ops.push(['pesanan', {
        ...(lama || {}), id, kode: lama?.kode || D.kodeBaru(), pelangganId: pelangganId || '', tglPesan: lama?.tglPesan || D.today(),
        tglAmbil: d.tglAmbil, jam: d.jam || '', cara: d.cara || 'ambil', alamat: d.cara !== 'ambil' ? d.alamat || '' : '',
        catatan: d.catatan || '', diskon: num(d.diskon), ongkir: d.cara !== 'ambil' ? num(d.ongkir) : 0, status: lama?.status || 'baru', tglSelesai: lama?.tglSelesai || '',
      }]);
      const lamaItems = lama ? S.where('itemPesanan', 'pesananId', id) : [];
      const dipakai = new Set();
      items.forEach((it) => {
        const v = S.get('varian', it.varianId);
        const pr = v ? S.get('produk', v.produkId) : null;
        const cocok = it.id && lamaItems.find((x) => x.id === it.id && x.varianId === it.varianId);
        if (cocok) dipakai.add(cocok.id);
        ops.push(['itemPesanan', {
          ...(cocok || {}), id: cocok ? cocok.id : undefined, pesananId: id, produkId: v?.produkId || '', varianId: it.varianId,
          nama: pr && v ? `${pr.nama} · ${v.nama}` : it.nama || 'Produk', qty: num(it.qty), harga: num(it.harga),
          hpp: cocok ? num(cocok.hpp) : D.hppVarian(v, pr),
        }]);
      });
      lamaItems.filter((x) => !dipakai.has(x.id)).forEach((x) => ops.push(['itemPesanan', { ...x, deleted: true }]));
      if (!lama && num(d.dp) > 0) ops.push(['pembayaran', { pesananId: id, nominal: num(d.dp), tanggal: D.today(), metode: d.metode || 'QRIS', catatan: 'DP' }]);
      S.putMany(ops.map(([c, r]) => [c, r.id === undefined ? (delete r.id, r) : r]));
      draft = null;
      toast(lama ? 'Pesanan diperbarui' : 'Pesanan tersimpan');
      if (lama) ctx.back(); else ctx.replace('order', { id });
    },
  },
};

// id pesanan dari halaman yang sedang tampil
let curId = '';
const ctx_id = () => curId;
