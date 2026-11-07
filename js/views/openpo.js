import { h, ic, rp, angka, tgl, tglPanjang, toast, konfirmasi } from '../util.js';
import { num, isiTemplate, addDays } from '../calc.js';
import * as D from '../data.js';
import { field, kosong, kv, formData } from './ui.js';
import { template } from './orders.js';
import { bukaTeksPromo } from './stok.js';
import { itemPesanan } from './home.js';

let draft = null;

export function teksOpenPO(po) {
  const info = D.infoOpenPO(po);
  const daftar = info.baris.map((b) => `• ${b.nama}: ${rp(b.harga)}${b.kuota ? ` (sisa ${angka(b.sisa)} dari ${angka(b.kuota)})` : ''}`).join('\n');
  return isiTemplate(template('openPO').teks, {
    toko: D.setelan().namaToko || '', daftar,
    batas: po.batas ? tglPanjang(po.batas) : '', tanggalProduksi: po.tanggalProduksi ? tglPanjang(po.tanggalProduksi) : '',
  });
}

export const views = {
  openPOs: {
    title: 'Open PO',
    fab: { label: 'Buat open PO', go: 'openPOForm' },
    render(p, ctx) {
      const all = ctx.S.all('openPO').sort((a, b) => String(b.batas).localeCompare(String(a.batas)));
      if (!all.length) return kosong('calendar', 'Belum ada open PO', 'Buka PO dengan batas tanggal order dan kuota per produk. Teks promosinya dibuat otomatis untuk status WhatsApp.', `<button class="btn pri" data-go="openPOForm">${ic('plus')}Buat open PO</button>`);
      return `<div class="list">${all.map((po) => {
        const i = D.infoOpenPO(po);
        const kuota = i.baris.reduce((s, b) => s + b.kuota, 0), pakai = i.baris.reduce((s, b) => s + b.terpakai, 0);
        return `<button class="item" data-go="openPO" data-id="${h(po.id)}"><div class="av">${ic('calendar')}</div><div class="grow"><div class="t ell">${h(po.judul || 'Open PO')}</div><div class="s">Order s.d. ${h(tgl(po.batas))} · produksi ${h(tgl(po.tanggalProduksi))}</div></div>
          <div class="r">${i.aktif ? '<span class="tag ok">Buka</span>' : '<span class="tag dim">Tutup</span>'}<div class="s num">${angka(pakai)}/${angka(kuota)}</div></div></button>`;
      }).join('')}</div>`;
    },
  },

  openPO: {
    title: (p, ctx) => ctx.S.get('openPO', p.id)?.judul || 'Open PO',
    render({ id }, ctx) {
      const po = ctx.S.get('openPO', id);
      if (!po) return kosong('calendar', 'Open PO tidak ditemukan', 'Mungkin sudah dihapus.');
      cur = id;
      const i = D.infoOpenPO(po);
      return `<div class="card">
          ${kv('Status', i.aktif ? '<span class="tag ok">Masih buka</span>' : '<span class="tag dim">Sudah tutup</span>')}
          ${kv('Batas order', h(tglPanjang(po.batas)))}${kv('Tanggal produksi', h(tglPanjang(po.tanggalProduksi)))}
        </div>
        <div class="card"><h2>Kuota</h2>
          ${i.baris.map((b) => `<div class="kv"><span>${h(b.nama)}</span><b class="num">${angka(b.terpakai)} / ${angka(b.kuota)}</b></div>
            <div class="bar3" style="margin:2px 0 10px;height:8px"><i style="width:${b.kuota ? Math.min((b.terpakai / b.kuota) * 100, 100) : 0}%;background:${b.terpakai >= b.kuota ? 'var(--bad)' : 'var(--ink)'}"></i></div>`).join('')}
        </div>
        <div class="btns" style="margin-bottom:12px"><button class="btn pri" data-act="promo">${ic('share')}Teks promosi</button><button class="btn" data-go="orderForm" data-openpo="${h(id)}">${ic('plus')}Catat pesanan</button></div>
        <div class="sec"><span>${i.pesanan.length} pesanan</span></div>
        ${i.pesanan.length ? `<div class="list">${i.pesanan.map((p) => itemPesanan(p)).join('')}</div>` : '<p class="small muted">Belum ada pesanan dari open PO ini.</p>'}
        <div class="btns" style="margin-top:12px"><button class="btn" data-go="openPOForm" data-id="${h(id)}">${ic('edit')}Ubah</button><button class="btn danger" data-act="hapus">${ic('trash')}Hapus</button></div>`;
    },
    actions: {
      promo: (b, e, ctx) => bukaTeksPromo('Promosi open PO', teksOpenPO(ctx.S.get('openPO', cur)), '', D.infoOpenPO(ctx.S.get('openPO', cur)).baris.map((k) => ctx.S.get('produk', ctx.S.get('varian', k.varianId)?.produkId)?.fotoId)),
      hapus: async (b, e, ctx) => {
        if (!(await konfirmasi('Hapus open PO?', 'Pesanan yang sudah masuk tetap ada.', { ya: 'Hapus', bahaya: true }))) return;
        ctx.S.putMany([['openPO', { ...ctx.S.get('openPO', cur), deleted: true }], ...ctx.S.where('kuotaPO', 'openPOId', cur).map((k) => ['kuotaPO', { ...k, deleted: true }])]);
        ctx.back();
      },
    },
  },

  openPOForm: {
    form: true,
    enter() { draft = null; },
    title: (p) => (p.id ? 'Ubah open PO' : 'Open PO baru'),
    render({ id }, ctx) {
      const S = ctx.S;
      const vs = S.all('produk').filter((p) => p.jenis !== 'titipan').sort((a, b) => a.nama.localeCompare(b.nama)).flatMap((p) => D.varianDari(p.id).map((v) => ({ v, p })));
      if (!vs.length) return kosong('cake', 'Belum ada produk', 'Tambah produk dulu.', `<button class="btn pri" data-go="productForm">${ic('plus')}Tambah produk</button>`);
      if (!draft) {
        const po = id ? S.get('openPO', id) : null;
        const kuota = id ? S.where('kuotaPO', 'openPOId', id) : [];
        const t = D.today();
        draft = { id, judul: po?.judul || '', batas: po?.batas || addDays(t, 3), tanggalProduksi: po?.tanggalProduksi || addDays(t, 5), kuota: Object.fromEntries(kuota.map((k) => [k.varianId, k.kuota])) };
      }
      const d = draft;
      return `<form novalidate><div class="card">
          ${field('Judul', `<input type="text" id="po-j" name="judul" value="${h(d.judul)}" placeholder="Misal: PO Lebaran, PO Akhir Pekan">`, { id: 'po-j' })}
          <div class="grid2">${field('Batas order', `<input type="date" id="po-b" name="batas" value="${h(d.batas)}" required>`, { id: 'po-b' })}
          ${field('Tanggal produksi', `<input type="date" id="po-t" name="tanggalProduksi" value="${h(d.tanggalProduksi)}" required>`, { id: 'po-t' })}</div>
        </div>
        <div class="sec"><span>Kuota per produk</span></div>
        <p class="small muted" style="margin:-4px 2px 10px">Kosongkan produk yang tidak ikut PO ini.</p>
        <div class="list">${vs.map(({ v, p }) => `<div class="item"><div class="grow"><label for="kq-${h(v.id)}" class="t">${h(p.nama)} · ${h(v.nama)}</label><div class="s">${rp(v.harga)}</div></div>
          <input type="number" inputmode="numeric" min="0" id="kq-${h(v.id)}" name="kuota_${h(v.id)}" value="${h(d.kuota[v.id] ?? '')}" placeholder="Kuota" style="width:96px;flex:none"></div>`).join('')}</div>
        <button class="btn pri block">${ic('check')}Simpan open PO</button></form>`;
    },
    submit(form, ctx) {
      const S = ctx.S;
      const f = formData(form);
      const kuota = Object.entries(f).filter(([k, v]) => k.startsWith('kuota_') && num(v) > 0).map(([k, v]) => [k.slice(6), num(v)]);
      if (!kuota.length) return toast('Isi kuota minimal satu produk');
      if (!f.batas || !f.tanggalProduksi) return toast('Isi batas order dan tanggal produksi');
      const id = draft.id || 'po' + Date.now().toString(36);
      const ops = [['openPO', { ...(S.get('openPO', id) || {}), id, judul: f.judul || 'Open PO', batas: f.batas, tanggalProduksi: f.tanggalProduksi }]];
      const lama = S.where('kuotaPO', 'openPOId', id);
      kuota.forEach(([vid, q]) => {
        const ada = lama.find((k) => k.varianId === vid);
        ops.push(['kuotaPO', { ...(ada || {}), openPOId: id, varianId: vid, kuota: q }]);
      });
      lama.filter((k) => !kuota.some(([vid]) => vid === k.varianId)).forEach((k) => ops.push(['kuotaPO', { ...k, deleted: true }]));
      S.putMany(ops);
      const ubah = !!draft.id;
      draft = null;
      toast('Open PO tersimpan');
      if (ubah) ctx.back(); else ctx.replace('openPO', { id });
    },
  },
};
let cur = '';
