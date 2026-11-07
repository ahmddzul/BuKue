import { h, ic, rp, angka, tgl, tglPanjang, toast, konfeti, konfirmasi } from '../util.js';
import { addDays, num, UNIT_LABEL } from '../calc.js';
import * as D from '../data.js';
import { chips, kosong, kv } from './ui.js';

let tanggal = null;

export const views = {
  produksi: {
    title: 'Produksi',
    render(p, ctx) {
      const S = ctx.S;
      const t = D.today();
      tanggal = tanggal || t;
      const opsi = [[t, 'Hari ini'], [addDays(t, 1), 'Besok'], [addDays(t, 2), 'Lusa']];
      const lain = !opsi.some((o) => o[0] === tanggal);
      let out = chips('tgl', opsi, lain ? '' : tanggal, { bawaan: t, label: 'Tanggal produksi', wrap: false });
      out += `<div class="field" style="margin-top:6px"><label for="tgl-prod">Tanggal lain</label><input type="date" id="tgl-prod" value="${h(tanggal)}"></div>`;
      const j = D.jadwal(tanggal);
      out += `<h2 class="sec" style="margin-top:8px"><span>${h(tglPanjang(tanggal))}</span></h2>`;
      if (!j.baris.length) {
        // Cari tanggal berikutnya yang ada produksi
        const next = S.all('pesanan').filter((p) => p.tglAmbil > tanggal && !['batal', 'selesai', 'diambil'].includes(p.status)).map((p) => p.tglAmbil).sort()[0];
        return out + kosong('oven', 'Tidak ada produksi', 'Belum ada pesanan aktif yang diambil di tanggal ini.', next ? `<button class="btn" data-act="pilih" data-tgl="${h(next)}">${ic('calendar')}Lihat ${h(tgl(next))}</button>` : '');
      }
      out += `<div class="card"><h2>Yang harus dibuat</h2>${j.baris.map((b) => kv(h(b.nama), angka(b.qty, 2))).join('')}</div>`;
      out += `<div class="sec"><span>${j.pesanan.length} pesanan</span></div><div class="list">${j.pesanan.map((p) => {
        const i = D.pesananInfo(p);
        return `<button class="item" data-go="order" data-id="${h(p.id)}"><div class="grow"><div class="t ell">${h(D.namaPel(i.pel))}</div><div class="s ell">${i.items.map((x) => `${h(x.nama)} x${angka(x.qty)}`).join(', ')}</div></div><div class="r small">${h(D.labelStatus(p.status))}${p.jam ? `<div class="muted">${h(p.jam)}</div>` : ''}</div></button>`;
      }).join('')}</div>`;
      const belumSiap = j.pesanan.filter((p) => ['baru', 'konfirmasi', 'produksi'].includes(p.status));
      if (belumSiap.length) out += `<button class="btn pri block" data-act="selesai" style="margin-bottom:12px">${ic('check')}Produksi selesai, tandai ${belumSiap.length} pesanan Siap</button>`;

      const bl = D.belanja(j.baris);
      const stokAktif = !!D.setelan().stokBahan;
      out += `<div class="sec"><span>Daftar belanja</span></div>`;
      if (!bl.baris.length) out += `<p class="small muted" style="margin:0 2px 12px">Produk di tanggal ini belum terhubung ke resep, jadi kebutuhan bahan belum bisa dihitung.</p>`;
      else {
        let total = 0;
        out += `<div class="card">${bl.baris.map((b) => {
          const stok = stokAktif ? stokDalam(b) : 0;
          const beli = Math.max(b.jumlah - stok, 0);
          const biaya = b.jumlah > 0 ? (b.biaya * beli) / b.jumlah : 0;
          total += biaya;
          return kv(`${h(b.bahan.nama)}${stokAktif && stok > 0 ? ` <span class="muted small">(stok ${angka(stok, 2)})</span>` : ''}`, `${angka(beli, 2)} ${UNIT_LABEL[b.satuan] || b.satuan}`);
        }).join('')}${kv('Perkiraan belanja', rp(total), 'total')}
          <p class="small muted" style="margin:6px 0 0">Adonan dibulatkan ke atas sesuai hasil resep${stokAktif ? ', dikurangi stok bahan' : ''}.</p></div>`;
      }
      if (bl.tanpaResep.length) out += `<p class="small muted" style="margin:0 2px">Tanpa resep: ${h([...new Set(bl.tanpaResep)].join(', '))}.</p>`;
      return out;
    },
    input(el, ctx) {
      if (el.name === 'tgl') { tanggal = el.value || D.today(); ctx.rerender(); }
      if (el.id === 'tgl-prod' && el.value) { tanggal = el.value; ctx.rerender(); }
    },
    actions: {
      pilih: (b, e, ctx) => { tanggal = b.dataset.tgl; ctx.rerender(); },
      selesai: async (b, e, ctx) => {
        const S = ctx.S;
        const ps = D.jadwal(tanggal).pesanan.filter((p) => ['baru', 'konfirmasi', 'produksi'].includes(p.status));
        if (!(await konfirmasi('Tandai pesanan Siap?', `${ps.length} pesanan tanggal ${tgl(tanggal)} akan berubah jadi Siap.`, { ya: 'Tandai Siap' }))) return;
        S.putMany(ps.map((p) => ['pesanan', { ...p, status: 'siap' }]));
        konfeti();
        toast('Produksi selesai. Pesanan siap diambil.');
      },
    },
  },
};

// Stok bahan dicatat dalam satuan beli; ubah ke satuan pakai bila bisa.
function stokDalam(b) {
  const stok = num(b.bahan.stok);
  if (!stok) return 0;
  const f = { kg: 1000, g: 1, l: 1000, ml: 1 };
  const dari = b.bahan.satuan, ke = b.satuan;
  if (f[dari] && f[ke] && ((dari in { kg: 1, g: 1 }) === (ke in { kg: 1, g: 1 }))) return (stok * f[dari]) / f[ke];
  if (dari === ke) return stok;
  return 0;
}
