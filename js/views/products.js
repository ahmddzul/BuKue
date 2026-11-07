import { h, ic, rp, angka, toast, openSheet, closeSheet, konfirmasi } from '../util.js';
import * as C from '../calc.js';
import * as D from '../data.js';
import { chips, field, money, kosong, kv, formData } from './ui.js';
import { ilus } from '../ilustrasi.js';
import { fotoUrl, simpanFoto } from '../foto.js';
import { kecilkanGambar } from '../util.js';

export function avProduk(p) {
  const f = p?.fotoId ? fotoUrl(p.fotoId) : '';
  return f ? `<div class="av foto"><img src="${f}" alt="" width="40" height="40" loading="lazy"></div>` : `<div class="av ilus-av">${ilus(p?.jenis === 'titipan' ? 'keranjang' : 'kue', 34)}</div>`;
}

const { num } = C;
let seg = 'produk';
let draftP = null, draftR = null;
let saran = { mode: 'margin', nilai: 40, bulat: 500 };
let sim = { target: '', tambah: 0, harga: '' };

// Setelah harga bahan atau resep berubah: tawarkan perbarui modal pesanan yang belum lunas.
export function tawarkanUpdateHpp(ctx) {
  const beda = D.itemBedaHpp();
  if (!beda.length) return;
  const nPesanan = new Set(beda.map((b) => b.p.id)).size;
  openSheet({
    html: `<h2 id="sheet-t">Perbarui modal pesanan?</h2>
      <p class="muted">HPP berubah. Ada ${nPesanan} pesanan belum lunas yang masih memakai modal lama. Pesanan yang sudah lunas atau selesai tidak diubah.</p>
      <div class="list">${beda.slice(0, 6).map((b) => `<div class="item"><div class="grow"><div class="t ell">${h(b.it.nama)}</div><div class="s">${h(b.p.kode || '')}</div></div><div class="r small num">${rp(b.it.hpp)} → ${rp(b.baru)}</div></div>`).join('')}</div>
      <div class="btns"><button class="btn" data-act="close">Biarkan</button><button class="btn pri" data-act="ya">Perbarui ${beda.length} item</button></div>`,
    actions: {
      ya: () => {
        ctx.S.putMany(beda.map((b) => ['itemPesanan', { ...b.it, hpp: Math.round(b.baru * 100) / 100 }]));
        closeSheet();
        toast('Modal pesanan diperbarui');
      },
    },
  });
}

function opsiBahan(sel) {
  return D.store().all('bahan').sort((a, b) => a.nama.localeCompare(b.nama))
    .map((b) => `<option value="${h(b.id)}" ${b.id === sel ? 'selected' : ''}>${h(b.nama)}</option>`).join('');
}
function opsiSatuan(bahan, sel) {
  const list = bahan ? C.satuanPakai(bahan) : C.UNITS;
  const s = list.includes(sel) ? sel : list[0];
  return list.map((u) => `<option value="${u}" ${u === s ? 'selected' : ''}>${C.UNIT_LABEL[u]}</option>`).join('');
}

function barisBahan(r, i) {
  const bahan = D.store().get('bahan', r.bahanId);
  return `<div class="line-edit" data-rb="${i}">
    <div class="row" style="align-items:flex-end">
      <div class="field grow" style="margin-bottom:8px"><label for="rb-b-${i}">Bahan</label><select id="rb-b-${i}" name="bahan[]"><option value="">Pilih bahan</option>${opsiBahan(r.bahanId)}</select></div>
      <button type="button" class="iconbtn" data-act="hapusBahan" data-i="${i}" aria-label="Hapus bahan ini" style="margin-bottom:8px">${ic('trash')}</button>
    </div>
    <div class="grid2"><div class="field" style="margin-bottom:0"><label for="rb-j-${i}">Jumlah</label><input type="number" inputmode="decimal" min="0" step="any" id="rb-j-${i}" name="jumlah[]" value="${h(r.jumlah ?? '')}"></div>
    <div class="field" style="margin-bottom:0"><label for="rb-s-${i}">Satuan</label><select id="rb-s-${i}" name="satuan[]">${opsiSatuan(bahan, r.satuan)}</select></div></div>
    <div class="small muted" data-biaya="${i}" style="margin-top:6px"></div>
  </div>`;
}

function resepDariForm(form) {
  const f = formData(form);
  const bs = f.bahan || [], js = f.jumlah || [], ss = f.satuan || [];
  return {
    resep: { hasil: num(f.hasil), susut: num(f.susut), kemasan: num(f.kemasan), gasMode: f.gasMode || 'persen', gasNilai: f.gasNilai === '' ? 0 : num(f.gasNilai), tenaga: num(f.tenaga) },
    baris: bs.map((b, i) => ({ bahanId: b, jumlah: js[i], satuan: ss[i] })),
    f,
  };
}

function kotakHpp(form) {
  const { resep, baris, f } = resepDariForm(form);
  const bm = D.bahanMap();
  const r = C.hitungResep(resep, baris.filter((b) => b.bahanId), bm);
  baris.forEach((b, i) => {
    const el = form.querySelector(`[data-biaya="${i}"]`);
    if (!el) return;
    const p = C.hargaPerSatuan(bm[b.bahanId], b.satuan);
    el.innerHTML = !b.bahanId ? '' : p === null ? `<span style="color:var(--bad)">Satuan ini tidak bisa dihitung untuk bahan ini. Isi berat per sdm/sdt atau isi butir di data bahan.</span>` : `${rp(p)} per ${C.UNIT_LABEL[b.satuan]} · biaya ${rp(p * num(b.jumlah))}`;
  });
  const satuan = f.satuanHasil || 'pcs';
  const s = C.saranHarga(r.hppPcs, saran);
  const marginNyata = (harga) => (harga > 0 ? Math.round(((harga - r.hppPcs) / harga) * 100) : 0);
  form.querySelector('#hpp-box').innerHTML = `
    <div class="small muted">HPP per ${h(satuan)}</div>
    <div class="big num">${rp(r.hppPcs)}</div>
    ${kv('Biaya bahan per adonan', rp(r.biayaBahan))}
    ${kv(resep.gasMode === 'rp' ? 'Gas/listrik' : `Gas/listrik (${angka(resep.gasNilai, 1)}%)`, rp(r.gas))}
    ${r.tenaga ? kv('Tenaga kerja', rp(r.tenaga)) : ''}
    ${kv('Hasil bersih', `${angka(r.hasilBersih, 2)} ${h(satuan)}${resep.susut ? ` (susut ${angka(resep.susut, 1)}%)` : ''}`)}
    ${kv('Kemasan per ' + h(satuan), rp(r.kemasan))}
    ${r.masalah ? `<p class="small" style="color:var(--bad);margin:6px 0 0">${r.masalah} bahan belum bisa dihitung.</p>` : ''}`;
  form.querySelector('#saran-box').innerHTML = r.hppPcs > 0
    ? `<div class="row between"><span>Saran harga jual</span><b class="num" style="font-size:20px;color:var(--ink)">${rp(s)}</b></div>
       <p class="small muted" style="margin:4px 0 0">Untung ${rp(s - r.hppPcs)} per ${h(satuan)} · margin ${marginNyata(s)}%</p>`
    : '<p class="small muted" style="margin:0">Isi bahan dan hasil jadi untuk melihat saran harga.</p>';
  // Simulasi
  const simBox = form.querySelector('#sim-box');
  if (num(sim.target) > 0) {
    const x = C.simulasi(resep, baris.filter((b) => b.bahanId), bm, sim.target, sim.tambah, num(sim.harga) || s);
    simBox.innerHTML = `<p class="small" style="margin:0 0 8px"><b>${x.kali} adonan</b> menghasilkan ${angka(x.jadi, 2)} ${h(satuan)}</p>
      ${x.detail.map((d) => kv(h(d.nama), `${angka(d.jumlah, 2)} ${C.UNIT_LABEL[d.satuan] || d.satuan}`)).join('')}
      ${kv('Biaya bahan', rp(x.biayaBahan))}${kv('Gas, tenaga, kemasan', rp(x.gas + x.tenaga + x.biayaKemasan))}
      ${kv('Total modal', rp(x.totalBiaya), 'total')}
      ${kv(`Omzet di ${rp(num(sim.harga) || s)}`, rp(x.omzet))}${kv('Perkiraan untung', rp(x.untung))}`;
  } else simBox.innerHTML = '<p class="small muted" style="margin:0">Ketik jumlah yang mau dibuat, misalnya 50.</p>';
}

function barisVarian(v, i, jenis) {
  const S = D.store();
  const reseps = S.all('resep').sort((a, b) => a.nama.localeCompare(b.nama));
  return `<div class="line-edit" data-vr="${i}">
    <div class="row" style="align-items:flex-end">
      <div class="field grow" style="margin-bottom:8px"><label for="vr-n-${i}">Nama varian</label><input type="text" id="vr-n-${i}" name="vnama[]" value="${h(v.nama || '')}" placeholder="Misal: Original, 500 g, Topping keju"></div>
      <button type="button" class="iconbtn" data-act="hapusVarian" data-i="${i}" aria-label="Hapus varian ini" style="margin-bottom:8px">${ic('trash')}</button>
    </div>
    <div class="grid2">
      <div class="field" style="margin-bottom:8px"><label for="vr-h-${i}">Harga jual</label>${money('vharga[]', v.harga, { id: 'vr-h-' + i })}</div>
      ${jenis === 'titipan'
        ? `<div class="field" style="margin-bottom:8px"><label for="vr-s-${i}">Harga setor</label>${money('vsetor[]', v.hargaSetor, { id: 'vr-s-' + i })}</div><input type="hidden" name="vresep[]" value=""><input type="hidden" name="vhpp[]" value="">`
        : `<div class="field" style="margin-bottom:8px"><label for="vr-r-${i}">Resep</label><select id="vr-r-${i}" name="vresep[]"><option value="">Tanpa resep</option>${reseps.map((r) => `<option value="${h(r.id)}" ${r.id === v.resepId ? 'selected' : ''}>${h(r.nama)}</option>`).join('')}</select></div><input type="hidden" name="vsetor[]" value="">`}
    </div>
    ${jenis === 'titipan' ? '' : `<div class="field" data-hppm="${i}" ${v.resepId ? 'hidden' : ''} style="margin-bottom:8px"><label for="vr-m-${i}">HPP manual</label>${money('vhpp[]', v.hppManual, { id: 'vr-m-' + i, placeholder: 'Kalau belum punya resep' })}</div>`}
    <div class="small muted" data-vinfo="${i}"></div>
  </div>`;
}

function infoVarian(form) {
  const f = formData(form);
  const jenis = f.jenis || 'sendiri';
  (f.vnama || []).forEach((_, i) => {
    const el = form.querySelector(`[data-vinfo="${i}"]`);
    if (!el) return;
    const resepId = (f.vresep || [])[i];
    const hppm = form.querySelector(`[data-hppm="${i}"]`);
    if (hppm) hppm.hidden = !!resepId;
    const hpp = D.hppVarian({ resepId, hppManual: (f.vhpp || [])[i], hargaSetor: (f.vsetor || [])[i] }, { jenis });
    const harga = num((f.vharga || [])[i]);
    el.textContent = hpp > 0 ? `Modal ${rp(hpp)} · untung ${rp(harga - hpp)}${harga > 0 ? ` (${Math.round(((harga - hpp) / harga) * 100)}%)` : ''}` : 'Modal belum diketahui';
  });
}

function bacaDraftP(form) {
  const f = formData(form);
  draftP = { ...draftP, ...f, varian: (f.vnama || []).map((n, i) => ({ ...(draftP.varian[i] || {}), nama: n, harga: f.vharga[i], resepId: f.vresep?.[i] || '', hppManual: f.vhpp?.[i] || '', hargaSetor: f.vsetor?.[i] || '' })) };
}
function bacaDraftR(form) {
  const { f, baris } = resepDariForm(form);
  draftR = { ...draftR, ...f, baris: baris.map((b, i) => ({ ...(draftR.baris[i] || {}), ...b })) };
}

export const views = {
  products: {
    title: 'Produk',
    fab: () => ({ label: seg === 'resep' ? 'Tambah resep' : 'Tambah produk', go: seg === 'resep' ? 'recipeForm' : 'productForm' }),
    render(p, ctx) {
      const S = ctx.S;
      let out = chips('seg', [['produk', 'Produk'], ['resep', 'Resep & HPP']], seg, { bawaan: 'produk', label: 'Tampilan', wrap: false });
      if (seg === 'resep') {
        const rs = S.all('resep').sort((a, b) => a.nama.localeCompare(b.nama));
        if (!rs.length) return out + kosong('book', 'Belum ada resep', S.all('bahan').length ? 'Buat resep dari bahan yang sudah dicatat, HPP-nya langsung terhitung.' : 'Isi daftar bahan dulu, lalu buat resep.', `<div class="btns">${S.all('bahan').length ? '' : `<button class="btn" data-go="bahan">${ic('sack')}Bahan baku</button>`}<button class="btn pri" data-go="recipeForm">${ic('plus')}Buat resep</button></div>`);
        return out + `<div class="list stagger">${rs.map((r, k) => {
          const x = D.hitungResepId(r.id);
          return `<button class="item" style="--i:${k}" data-go="recipeForm" data-id="${h(r.id)}"><div class="av ilus-av">${ilus('mangkuk', 34)}</div><div class="grow"><div class="t ell">${h(r.nama)}</div><div class="s">${angka(r.hasil, 2)} ${h(r.satuanHasil || 'pcs')} per adonan</div></div><div class="r"><div class="num" style="font-weight:700">${rp(x?.hppPcs || 0)}</div><div class="s">per ${h(r.satuanHasil || 'pcs')}</div></div></button>`;
        }).join('')}</div>`;
      }
      const ps = S.all('produk').sort((a, b) => a.nama.localeCompare(b.nama));
      if (!ps.length) return out + kosong('cake', 'Belum ada produk', 'Tambah kue yang kamu jual beserta variannya dan harganya.', `<button class="btn pri" data-go="productForm">${ic('plus')}Tambah produk</button>`);
      return out + `<div class="list stagger">${ps.map((p, k) => {
        const vs = D.varianDari(p.id);
        const harga = vs.map((v) => num(v.harga));
        const v0 = vs[0];
        const hpp = v0 ? D.hppVarian(v0, p) : 0;
        const m = v0 && num(v0.harga) > 0 && hpp > 0 ? Math.round(((num(v0.harga) - hpp) / num(v0.harga)) * 100) : null;
        const range = harga.length ? (Math.min(...harga) === Math.max(...harga) ? rp(harga[0]) : `${rp(Math.min(...harga))} - ${rp(Math.max(...harga))}`) : 'Belum ada harga';
        return `<button class="item" style="--i:${k}" data-go="productForm" data-id="${h(p.id)}">${avProduk(p)}
          <div class="grow"><div class="t ell">${h(p.nama)} ${p.jenis === 'titipan' ? '<span class="tag acc">Titipan</span>' : ''}</div><div class="s ell">${vs.length} varian · per ${h(p.satuan || 'pcs')}${m !== null ? ` · margin ${m}%` : ''}</div></div>
          <div class="r num small" style="font-weight:700">${range}</div></button>`;
      }).join('')}</div>`;
    },
    input(el, ctx) { if (el.name === 'seg') { seg = el.value || 'produk'; ctx.rerender(); } },
  },

  productForm: {
    form: true,
    enter() { draftP = null; },
    title: (p) => (p.id ? 'Ubah produk' : 'Produk baru'),
    render({ id, penitip }, ctx) {
      const S = ctx.S;
      if (!draftP) {
        const lama = id ? S.get('produk', id) : null;
        draftP = lama ? { ...lama, varian: D.varianDari(id).map((v) => ({ ...v })) } : { jenis: penitip ? 'titipan' : 'sendiri', penitipId: penitip || '', satuan: 'pcs', umurSimpan: '', varian: [{ nama: 'Original' }] };
        if (!draftP.varian.length) draftP.varian.push({ nama: 'Original' });
      }
      const d = draftP;
      const satuanList = D.SATUAN_PRODUK.includes(d.satuan) || !d.satuan ? D.SATUAN_PRODUK : [...D.SATUAN_PRODUK, d.satuan];
      return `<form novalidate>
        <div class="card">
          <div class="field"><span class="lbl2">Foto produk (opsional)</span>
            ${d.fotoId && fotoUrl(d.fotoId) ? `<img class="foto-prev" src="${fotoUrl(d.fotoId)}" alt="Foto ${h(d.nama || 'produk')}" width="280" height="280">` : `<div class="foto-prev" style="display:grid;place-items:center">${ilus(d.jenis === 'titipan' ? 'keranjang' : 'kue', 140)}</div>`}
            <div class="btns"><label class="btn" for="p-foto">${ic('image')}${d.fotoId ? 'Ganti foto' : 'Pilih foto'}</label>${d.fotoId ? '<button type="button" class="btn danger" data-act="hapusFoto">Hapus foto</button>' : ''}</div>
            <input type="file" id="p-foto" accept="image/*" class="sr">
            <div class="hint">Foto diperkecil otomatis supaya hemat kuota. Bisa ambil dari galeri atau kamera.</div>
          </div>
          ${field('Nama produk', `<input type="text" id="p-nama" name="nama" value="${h(d.nama || '')}" required placeholder="Misal: Nastar, Brownies">`, { id: 'p-nama' })}
          <div class="field"><span class="lbl2">Jenis</span>${chips('jenis', [['sendiri', 'Buatan sendiri'], ['titipan', 'Titipan']], d.jenis, { bawaan: 'sendiri', label: 'Jenis produk' })}</div>
          ${d.jenis === 'titipan' ? (() => {
            const pts = S.all('penitip').sort((a, b) => a.nama.localeCompare(b.nama));
            return pts.length ? field('Penitip', `<select id="p-pen" name="penitipId" required><option value="">Pilih penitip</option>${pts.map((x) => `<option value="${h(x.id)}" ${x.id === d.penitipId ? 'selected' : ''}>${h(x.nama)}</option>`).join('')}</select>`, { id: 'p-pen' })
              : `<div class="banner">${ic('alert')}<span class="grow">Belum ada penitip. Tambah dulu di Lainnya, Titipan & penitip.</span></div>`;
          })() : ''}
          <div class="field"><span class="lbl2">Dijual per</span>${chips('satuan', satuanList.map((s) => [s, s]), d.satuan, { bawaan: 'pcs', label: 'Satuan jual' })}
            <input type="text" name="satuanLain" aria-label="Satuan lain" placeholder="Satuan lain, misal: dus" style="margin-top:8px" value=""></div>
          ${field('Umur simpan (hari)', `<input type="number" inputmode="numeric" min="0" id="p-umur" name="umurSimpan" value="${h(d.umurSimpan ?? '')}" placeholder="Misal: 3">`, { id: 'p-umur', hint: 'Dipakai untuk peringatan stok yang hampir kedaluwarsa.' })}
        </div>
        <div class="sec"><span>Varian dan harga</span></div>
        ${d.jenis === 'titipan' ? '<p class="small muted" style="margin:-4px 2px 10px">Harga setor = yang kamu bayar ke penitip per item terjual.</p>' : ''}
        <div>${d.varian.map((v, i) => barisVarian(v, i, d.jenis)).join('')}</div>
        <button type="button" class="btn block" data-act="tambahVarian" style="margin-bottom:12px">${ic('plus')}Tambah varian</button>
        <button class="btn pri block">${ic('check')}Simpan produk</button>
        ${id ? `<button type="button" class="btn danger block" data-act="hapus" style="margin-top:10px">${ic('trash')}Hapus produk</button>` : ''}
      </form>`;
    },
    mount(el) { const f = el.querySelector('form'); if (f) infoVarian(f); },
    input(el, ctx) {
      const form = el.form || el.closest('form');
      if (!form) return;
      if (el.name === 'jenis') { bacaDraftP(form); ctx.rerender(); return; }
      if (el.name === 'satuanLain' && el.value.trim()) form.querySelectorAll('[data-chipgroup="satuan"] [data-chip]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      infoVarian(form);
    },
    async change(el, ctx) {
      if (el.id === 'p-foto') {
        const file = el.files?.[0];
        if (!file) return;
        bacaDraftP(el.form || el.closest('form'));
        try {
          toast('Menyimpan foto…');
          const data = await kecilkanGambar(file, 640, 'image/jpeg');
          draftP.fotoId = await simpanFoto(data);
          toast('Foto tersimpan');
        } catch (e) {
          toast(e?.message === 'Tidak ada koneksi' ? 'Perlu internet untuk mengunggah foto. Coba lagi saat online.' : 'Foto gagal disimpan. Coba gambar lain.', 4000);
        }
        ctx.rerender();
        return;
      }
      views.productForm.input(el, ctx);
    },
    actions: {
      hapusFoto: (b, e, ctx) => { bacaDraftP(b.closest('form')); draftP.fotoId = ''; ctx.rerender(); },
      tambahVarian: (b, e, ctx) => { bacaDraftP(b.closest('form')); draftP.varian.push({ nama: '' }); ctx.rerender(); setTimeout(() => document.getElementById('vr-n-' + (draftP.varian.length - 1))?.focus(), 50); },
      hapusVarian: (b, e, ctx) => { bacaDraftP(b.closest('form')); draftP.varian.splice(Number(b.dataset.i), 1); if (!draftP.varian.length) draftP.varian.push({ nama: '' }); ctx.rerender(); },
      hapus: async (b, e, ctx) => {
        if (!(await konfirmasi('Hapus produk?', 'Produk dan variannya dihapus. Pesanan lama tetap menyimpan nama dan harganya.', { ya: 'Hapus', bahaya: true }))) return;
        const S = ctx.S;
        const id = draftP.id;
        S.putMany([['produk', { ...S.get('produk', id), deleted: true }], ...D.varianDari(id).map((v) => ['varian', { ...v, deleted: true }])]);
        draftP = null;
        toast('Produk dihapus');
        ctx.back();
      },
    },
    submit(form, ctx) {
      const S = ctx.S;
      bacaDraftP(form);
      const d = draftP;
      if (!d.nama) return toast('Isi nama produk');
      if (d.jenis === 'titipan' && !d.penitipId) return toast('Pilih penitip untuk produk titipan');
      const vs = d.varian.filter((v) => v.nama || num(v.harga));
      if (!vs.length) return toast('Isi minimal satu varian dengan harga');
      const satuan = (d.satuanLain || '').trim() || d.satuan || 'pcs';
      const pid = d.id || 'pr' + Date.now().toString(36);
      const ops = [['produk', { ...(S.get('produk', pid) || {}), id: pid, nama: d.nama, fotoId: d.fotoId || '', jenis: d.jenis || 'sendiri', penitipId: d.jenis === 'titipan' ? d.penitipId || '' : '', satuan, umurSimpan: num(d.umurSimpan) || '' }]];
      const lama = D.varianDari(pid);
      const ids = new Set();
      vs.forEach((v, i) => {
        if (v.id) ids.add(v.id);
        ops.push(['varian', { ...(v.id ? S.get('varian', v.id) || {} : {}), ...(v.id ? { id: v.id } : {}), produkId: pid, nama: v.nama || 'Original', harga: num(v.harga), resepId: d.jenis === 'titipan' ? '' : v.resepId || '', hppManual: v.hppManual === '' ? '' : num(v.hppManual), hargaSetor: d.jenis === 'titipan' ? num(v.hargaSetor) : '', urut: i + 1 }]);
      });
      lama.filter((v) => !ids.has(v.id)).forEach((v) => ops.push(['varian', { ...v, deleted: true }]));
      S.putMany(ops);
      draftP = null;
      toast('Produk tersimpan');
      ctx.back();
      setTimeout(() => tawarkanUpdateHpp(ctx), 300);
    },
  },

  recipeForm: {
    form: true,
    enter() { draftR = null; sim = { target: '', tambah: 0, harga: '' }; },
    title: (p) => (p.id ? 'Resep & HPP' : 'Resep baru'),
    render({ id }, ctx) {
      const S = ctx.S;
      if (!S.all('bahan').length) return kosong('sack', 'Belum ada bahan', 'Resep disusun dari bahan baku. Catat bahan dan harganya dulu.', `<button class="btn pri" data-go="bahanForm">${ic('plus')}Tambah bahan</button>`);
      if (!draftR) {
        const lama = id ? S.get('resep', id) : null;
        draftR = lama ? { ...lama, baris: D.barisResep(id).map((x) => ({ ...x })) } : { hasil: '', satuanHasil: 'pcs', kemasan: '', gasMode: 'persen', gasNilai: 5, tenaga: '', susut: '', baris: [{ satuan: 'g' }, { satuan: 'g' }] };
      }
      const d = draftR;
      return `<form novalidate>
        <div class="card">
          ${field('Nama resep', `<input type="text" id="r-nama" name="nama" value="${h(d.nama || '')}" required placeholder="Misal: Nastar klasik">`, { id: 'r-nama' })}
          <div class="grid2">${field('Hasil jadi per adonan', `<input type="number" inputmode="decimal" min="0" step="any" id="r-hasil" name="hasil" value="${h(d.hasil ?? '')}" required placeholder="20">`, { id: 'r-hasil' })}
          ${field('Satuan hasil', `<input type="text" id="r-sat" name="satuanHasil" value="${h(d.satuanHasil || 'pcs')}" list="sat-hasil"><datalist id="sat-hasil">${D.SATUAN_PRODUK.map((s) => `<option value="${s}">`).join('')}</datalist>`, { id: 'r-sat' })}</div>
        </div>
        <div class="sec"><span>Bahan per adonan</span></div>
        <div>${d.baris.map(barisBahan).join('')}</div>
        <button type="button" class="btn block" data-act="tambahBahan" style="margin-bottom:12px">${ic('plus')}Tambah bahan</button>
        <div class="card"><h2>Biaya tambahan</h2>
          ${field('Kemasan per satuan hasil', money('kemasan', d.kemasan, { id: 'r-kem' }), { id: 'r-kem', hint: 'Dus, mika, pita, stiker untuk satu pcs/toples.' })}
          <div class="field"><span class="lbl2">Gas/listrik dihitung</span>${chips('gasMode', [['persen', '% dari bahan'], ['rp', 'Rp per adonan']], d.gasMode || 'persen', { bawaan: 'persen', label: 'Cara hitung gas dan listrik' })}</div>
          ${field('Nilai gas/listrik', `<input type="number" inputmode="decimal" min="0" step="any" id="r-gas" name="gasNilai" value="${h(d.gasNilai ?? '')}">`, { id: 'r-gas' })}
          <div class="grid2">${field('Tenaga kerja per adonan', money('tenaga', d.tenaga, { id: 'r-ten', placeholder: 'Opsional' }), { id: 'r-ten' })}
          ${field('Susut atau gagal (%)', `<input type="number" inputmode="decimal" min="0" max="90" step="any" id="r-sus" name="susut" value="${h(d.susut ?? '')}" placeholder="0">`, { id: 'r-sus' })}</div>
        </div>
        <div class="hpp-box" id="hpp-box" aria-live="polite"></div>
        <div class="card"><h2>Saran harga jual</h2>
          ${chips('saranMode', [['margin', 'Target margin %'], ['markup', 'Untung Rp']], saran.mode, { bawaan: 'margin', label: 'Cara saran harga' })}
          <div class="grid2" style="margin-top:8px">${field(saran.mode === 'margin' ? 'Margin (%)' : 'Untung per satuan', `<input type="number" inputmode="decimal" min="0" step="any" id="s-nilai" name="saranNilai" value="${h(saran.nilai)}">`, { id: 's-nilai' })}
          <div class="field"><span class="lbl2">Bulatkan ke</span>${chips('saranBulat', [['500', 'Rp 500'], ['1000', 'Rp 1.000']], String(saran.bulat), { bawaan: '500', label: 'Pembulatan' })}</div></div>
          <div id="saran-box" aria-live="polite"></div>
        </div>
        <div class="card"><h2>Simulasi produksi</h2>
          <div class="grid2">${field('Mau buat berapa?', `<input type="number" inputmode="numeric" min="0" id="sim-t" name="simTarget" value="${h(sim.target)}" placeholder="50">`, { id: 'sim-t' })}
          ${field('Harga jual', money('simHarga', sim.harga, { id: 'sim-h', placeholder: 'Pakai saran' }), { id: 'sim-h' })}</div>
          <div class="row" style="margin-bottom:10px"><span class="small grow">Adonan tambahan: <b>${sim.tambah > 0 ? '+' : ''}${sim.tambah}</b></span>
            <button type="button" class="iconbtn" data-act="simKurang" aria-label="Kurangi satu adonan">${ic('minus')}</button><button type="button" class="iconbtn" data-act="simTambah" aria-label="Tambah satu adonan">${ic('plus')}</button></div>
          <div id="sim-box" aria-live="polite"></div>
        </div>
        <button class="btn pri block">${ic('check')}Simpan resep</button>
        ${id ? `<button type="button" class="btn danger block" data-act="hapus" style="margin-top:10px">${ic('trash')}Hapus resep</button>` : ''}
      </form>`;
    },
    mount(el) { const f = el.querySelector('form'); if (f) kotakHpp(f); },
    input(el, ctx) {
      const form = el.form || el.closest('form');
      if (!form) return;
      if (el.name === 'bahan[]') {
        const i = el.closest('[data-rb]').dataset.rb;
        const sel = form.querySelector('#rb-s-' + i);
        const bahan = ctx.S.get('bahan', el.value);
        sel.innerHTML = opsiSatuan(bahan, sel.value);
      }
      if (el.name === 'saranMode') { saran.mode = el.value || 'margin'; saran.nilai = saran.mode === 'margin' ? 40 : 2000; bacaDraftR(form); ctx.rerender(); return; }
      if (el.name === 'saranNilai') saran.nilai = num(el.value);
      if (el.name === 'saranBulat') saran.bulat = num(el.value) || 500;
      if (el.name === 'simTarget') sim.target = el.value;
      if (el.name === 'simHarga') sim.harga = el.value;
      kotakHpp(form);
    },
    change(el, ctx) { views.recipeForm.input(el, ctx); },
    actions: {
      tambahBahan: (b, e, ctx) => { bacaDraftR(b.closest('form')); draftR.baris.push({ satuan: 'g' }); ctx.rerender(); setTimeout(() => document.getElementById('rb-b-' + (draftR.baris.length - 1))?.focus(), 50); },
      hapusBahan: (b, e, ctx) => { bacaDraftR(b.closest('form')); draftR.baris.splice(Number(b.dataset.i), 1); ctx.rerender(); },
      simTambah: (b, e, ctx) => { bacaDraftR(b.closest('form')); sim.tambah++; ctx.rerender(); },
      simKurang: (b, e, ctx) => { bacaDraftR(b.closest('form')); sim.tambah--; ctx.rerender(); },
      hapus: async (b, e, ctx) => {
        const S = ctx.S;
        const dipakai = S.where('varian', 'resepId', draftR.id).length;
        if (!(await konfirmasi('Hapus resep?', dipakai ? `Resep ini dipakai ${dipakai} varian produk. Varian itu akan memakai HPP manual.` : 'Resep dan daftar bahannya akan dihapus.', { ya: 'Hapus', bahaya: true }))) return;
        S.putMany([['resep', { ...S.get('resep', draftR.id), deleted: true }], ...D.barisResep(draftR.id).map((r) => ['resepBahan', { ...r, deleted: true }]),
          ...S.where('varian', 'resepId', draftR.id).map((v) => ['varian', { ...v, resepId: '', hppManual: Math.round(D.hppVarian(v)) }])]);
        draftR = null;
        ctx.back();
      },
    },
    submit(form, ctx) {
      const S = ctx.S;
      bacaDraftR(form);
      const d = draftR;
      if (!d.nama) return toast('Isi nama resep');
      if (!(num(d.hasil) > 0)) return toast('Isi hasil jadi per adonan');
      const baris = d.baris.filter((b) => b.bahanId && num(b.jumlah) > 0);
      const rid = d.id || 'rs' + Date.now().toString(36);
      const ops = [['resep', { ...(S.get('resep', rid) || {}), id: rid, nama: d.nama, hasil: num(d.hasil), satuanHasil: d.satuanHasil || 'pcs', kemasan: num(d.kemasan), gasMode: d.gasMode || 'persen', gasNilai: num(d.gasNilai), tenaga: num(d.tenaga), susut: num(d.susut) }]];
      const lama = D.barisResep(rid);
      const ids = new Set();
      baris.forEach((b, i) => {
        if (b.id) ids.add(b.id);
        ops.push(['resepBahan', { ...(b.id ? { id: b.id } : {}), resepId: rid, bahanId: b.bahanId, jumlah: num(b.jumlah), satuan: b.satuan, urut: i + 1 }]);
      });
      lama.filter((b) => !ids.has(b.id)).forEach((b) => ops.push(['resepBahan', { ...b, deleted: true }]));
      S.putMany(ops);
      draftR = null;
      toast('Resep tersimpan');
      ctx.back();
      setTimeout(() => tawarkanUpdateHpp(ctx), 300);
    },
  },
};
