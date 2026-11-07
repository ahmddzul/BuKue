import { h, ic, rp, angka, tgl, tglPanjang, toast, konfeti, openSheet, closeSheet } from '../util.js';
import { addDays, num, UNIT_LABEL } from '../calc.js';
import * as D from '../data.js';
import { chips, kosong, kv, formData } from './ui.js';
import { ilus } from '../ilustrasi.js';

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
        return out + kosong('oven', 'Tidak ada pesanan', 'Belum ada pesanan aktif yang diambil di tanggal ini.', `<div class="btns">${next ? `<button class="btn" data-act="pilih" data-tgl="${h(next)}">${ic('calendar')}Lihat ${h(tgl(next))}</button>` : ''}<button class="btn" data-act="untukStok">${ic('box')}Produksi untuk stok</button></div>`);
      }
      out += `<div class="card"><h2 class="row" style="gap:8px">${ilus('loyang', 30)}Yang harus dibuat</h2>${j.baris.map((b) => kv(h(b.nama), angka(b.qty, 2))).join('')}</div>`;
      out += `<div class="sec"><span>${j.pesanan.length} pesanan</span></div><div class="list">${j.pesanan.map((p) => {
        const i = D.pesananInfo(p);
        return `<button class="item" data-go="order" data-id="${h(p.id)}"><div class="grow"><div class="t ell">${h(D.namaPel(i.pel))}</div><div class="s ell">${i.items.map((x) => `${h(x.nama)} x${angka(x.qty)}`).join(', ')}</div></div><div class="r small">${h(D.labelStatus(p.status))}${p.jam ? `<div class="muted">${h(p.jam)}</div>` : ''}</div></button>`;
      }).join('')}</div>`;
      const belumSiap = j.pesanan.filter((p) => ['baru', 'konfirmasi', 'produksi'].includes(p.status));
      if (belumSiap.length) out += `<button class="btn pri block" data-act="selesai" style="margin-bottom:8px">${ic('check')}Produksi selesai, tandai ${belumSiap.length} pesanan Siap</button>`;
      out += `<button class="btn block" data-act="untukStok" style="margin-bottom:12px">${ic('box')}Catat produksi untuk stok ready</button>`;

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
      selesai: (b, e, ctx) => {
        const S = ctx.S;
        const j = D.jadwal(tanggal);
        const ps = j.pesanan.filter((p) => ['baru', 'konfirmasi', 'produksi'].includes(p.status));
        const baris = j.baris.filter((x) => S.get('produk', x.produkId)?.jenis !== 'titipan');
        openSheet({
          html: `<h2 id="sheet-t">Produksi selesai</h2>
            <p class="small muted" style="margin-top:-6px">${ps.length} pesanan akan berubah jadi Siap. Kalau jadinya lebih dari pesanan, kelebihannya masuk stok ready.</p>
            <form>${baris.map((x, i) => `<div class="item" style="padding:8px 0"><div class="grow"><label for="jd-${i}" class="t">${h(x.nama)}</label><div class="s">Dipesan ${angka(x.qty, 2)}</div></div>
              <input type="hidden" name="v[]" value="${h(x.varianId)}"><input type="hidden" name="q[]" value="${h(x.qty)}">
              <input type="number" inputmode="numeric" min="0" step="any" id="jd-${i}" name="jadi[]" value="${h(x.qty)}" aria-label="Jumlah jadi ${h(x.nama)}" style="width:96px;flex:none"></div>`).join('')}
            <button class="btn pri block" style="margin-top:12px">${ic('check')}Simpan</button></form>`,
          submit: (form) => {
            const f = formData(form);
            const ops = ps.map((p) => ['pesanan', { ...p, status: 'siap' }]);
            let lebih = 0;
            (f.v || []).forEach((vid, i) => {
              const ext = num(f.jadi[i]) - num(f.q[i]);
              const v = S.get('varian', vid);
              if (!(ext > 0) || !v) return;
              const pr = S.get('produk', v.produkId);
              lebih += ext;
              ops.push(['stok', { varianId: vid, produkId: pr.id, nama: `${pr.nama} · ${v.nama}`, tanggal, kedaluwarsa: D.tglKedaluwarsa(tanggal, pr), jumlah: ext, hpp: Math.round(D.hppVarian(v, pr) * 100) / 100, harga: num(v.harga), sumber: 'produksi' }]);
            });
            S.putMany(ops);
            closeSheet();
            konfeti();
            toast(lebih ? `Pesanan siap. ${angka(lebih, 2)} kelebihan masuk stok ready.` : 'Produksi selesai. Pesanan siap diambil.', 3500);
          },
        });
      },
      untukStok: (b, e, ctx) => ctx.go('stokForm', { tanggal }),
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
