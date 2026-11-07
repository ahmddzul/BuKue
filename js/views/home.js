import { h, ic, rp, angka, tgl, namaBulan, singkatBulan, hitungNaik, inisial } from '../util.js';
import * as D from '../data.js';
import { addDays } from '../calc.js';
import { chips, kosong, tagBayar } from './ui.js';

let per = { jenis: '30', off: 0 };
try { const s = JSON.parse(localStorage.getItem('bukue:periode') || 'null'); if (s) per = { jenis: s.jenis, off: 0 }; } catch {}
const simpanPer = () => localStorage.setItem('bukue:periode', JSON.stringify(per));

const SARAN = 'https://saweria.co/ahmddzul';

function sapaWaktu() {
  const j = new Date().getHours();
  if (j < 11) return 'Selamat pagi';
  if (j < 15) return 'Selamat siang';
  if (j < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function labelPer(r) {
  if (per.jenis === '7') return '7 hari terakhir';
  if (per.jenis === '30') return '30 hari terakhir';
  if (per.jenis === 'bulan') { const d = new Date(r.dari + 'T00:00:00'); return namaBulan(d.getMonth()) + ' ' + d.getFullYear(); }
  if (per.jenis === 'tahun') return 'Tahun ' + r.dari.slice(0, 4);
  return 'Semua waktu';
}

function grafik(L) {
  if (!L.grafik.length) return '';
  const maks = Math.max(...L.grafik.map((g) => Math.abs(g.v)), 1);
  const tahunan = per.jenis === 'tahun';
  const tipis = L.grafik.length > 12;
  const isi = L.grafik.map((g, i) => {
    const d = new Date((tahunan ? g.k + '-01' : g.k) + 'T00:00:00');
    const lbl = tahunan ? singkatBulan(d.getMonth()).slice(0, 3) : (!tipis || i % 5 === 0 || i === L.grafik.length - 1 ? String(d.getDate()) : '');
    return `<div class="col ${g.v < 0 ? 'neg' : ''}" title="${h(lbl)}: ${rp(g.v)}"><i style="height:${Math.max((Math.abs(g.v) / maks) * 100, 2)}%"></i><small>${lbl}</small></div>`;
  }).join('');
  return `<div class="card"><h2>${tahunan ? 'Untung per bulan' : 'Untung per hari'}</h2>
    <div class="chart" role="img" aria-label="Grafik untung ${h(labelPer(L.r))}">${isi}</div></div>`;
}

export const views = {
  home: {
    title: 'Beranda',
    fab: { label: 'Catat pesanan baru', go: 'orderForm' },
    render(p, ctx) {
      const S = ctx.S;
      const st = D.setelan();
      const nama = (st.namaPemilik || '').trim();
      const sapa = nama ? `${sapaWaktu()}, ${h(nama)} 👋` : 'Halo! 👋';
      const kosongTotal = !S.all('pesanan').length;
      let out = `<p class="muted small" style="margin:4px 2px 0">${h(D.setelan().namaToko || 'BuKue')}</p>
        <h2 style="font-size:22px;margin:0 2px 12px;font-weight:800">${sapa}</h2>`;
      if (ctx.demo) out += `<div class="banner acc">${ic('phone')}<span class="grow">Mode coba. Data contoh ini hanya ada di HP ini.</span><button class="btn sm" data-act="akhiriCoba">Pakai akun</button></div>`;

      if (kosongTotal) {
        const adaProduk = S.all('produk').length > 0;
        return out + `<div class="card">${kosong('cake', 'Belum ada pesanan', adaProduk ? 'Produk sudah siap. Catat pesanan pertama kamu.' : 'Mulai dari daftar bahan dan resep supaya HPP terhitung, lalu tambah produk.',
          `<div class="btns">${adaProduk ? '' : `<button class="btn" data-go="bahan">${ic('sack')}Isi bahan baku</button><button class="btn" data-go="productForm">${ic('cake')}Tambah produk</button>`}<button class="btn pri" data-go="orderForm">${ic('plus')}Catat pesanan</button></div>`)}</div>`;
      }

      const L = D.laporan(per);
      const pager = per.jenis === 'bulan' || per.jenis === 'tahun';
      out += chips('periode', [['7', '7 hari'], ['30', '30 hari'], ['bulan', 'Bulanan'], ['tahun', 'Tahunan'], ['semua', 'Semua']], per.jenis, { bawaan: '30', label: 'Periode laporan', wrap: false });
      out += `<section class="profit" aria-label="Untung">
        <div class="lbl">Untung · ${h(labelPer(L.r))}</div>
        <div class="big num" id="angka-untung">${rp(L.untung)}</div>
        <div class="meta"><span>${L.nSelesai} pesanan selesai</span><span>${angka(L.pcsSelesai)} item</span><span>Omzet ${rp(L.omzetSelesai)}</span>${L.rugi ? `<span>Rugi sisa ${rp(L.rugi)}</span>` : ''}</div>
        ${pager ? `<div class="glass"><button class="iconbtn" data-act="mundur" aria-label="Periode sebelumnya" style="color:inherit">${ic('back')}</button><span>${h(labelPer(L.r))}</span><button class="iconbtn" data-act="maju" aria-label="Periode berikutnya" style="color:inherit" ${per.off ? '' : 'disabled'}>${ic('next')}</button></div>` : ''}
      </section>`;

      const m = L.masuk;
      const tot = m.lunas + m.dp + m.belum || 1;
      out += `<div class="card"><h2>Pesanan masuk</h2>
        <p class="small muted" style="margin:-6px 0 4px">Semua pesanan yang dicatat di periode ini, termasuk yang belum dibayar.</p>
        <div class="stats"><div class="stat"><b class="num">${rp(m.nilai)}</b><span>${m.n} pesanan</span></div><div class="stat"><b class="num">${angka(m.pcs)}</b><span>item</span></div><div class="stat"><b class="num">${m.pel}</b><span>pelanggan</span></div></div>
        <div class="kv"><span>Perkiraan untung</span><b class="num">${rp(m.estUntung)}</b></div>
        <div class="bar3" aria-hidden="true"><i style="width:${(m.lunas / tot) * 100}%;background:var(--ok)"></i><i style="width:${(m.dp / tot) * 100}%;background:var(--warn)"></i><i style="width:${(m.belum / tot) * 100}%;background:var(--bad)"></i></div>
        <div class="legend"><span style="--c:var(--ok)">Lunas ${rp(m.lunas)}</span><span style="--c:var(--warn)">DP masuk ${rp(m.dp)}</span><span style="--c:var(--bad)">Belum dibayar ${rp(m.belum)}</span></div>
      </div>`;

      out += grafik(L);

      // Hari ini
      const t = D.today();
      const j1 = D.jadwal(t), j2 = D.jadwal(addHari(t, 1));
      out += `<div class="sec"><span>Produksi</span><button class="link" data-act="keProduksi">Lihat jadwal</button></div>
        <div class="grid-2c">${kartuJadwal('Hari ini', t, j1)}${kartuJadwal('Besok', addHari(t, 1), j2)}</div>`;

      const ambil = S.all('pesanan').filter((p) => p.tglAmbil === t && !['batal', 'selesai', 'diambil'].includes(p.status));
      if (ambil.length) {
        out += `<div class="sec"><span>Diambil atau dikirim hari ini</span></div><div class="list">${ambil.map((p) => itemPesanan(p)).join('')}</div>`;
      }

      const tag = D.tagihanBerjalan().sort((a, b) => String(a.p.tglAmbil).localeCompare(String(b.p.tglAmbil)));
      if (tag.length) {
        const total = tag.reduce((s, x) => s + x.i.sisa, 0);
        out += `<div class="sec"><span>Tagihan berjalan · ${rp(total)}</span><button class="link" data-act="lihatTagihan">Semua</button></div>
          <div class="list">${tag.slice(0, 4).map((x) => itemPesanan(x.p, x.i)).join('')}</div>`;
      }

      const kd = D.hampirKedaluwarsa(1);
      if (kd.length) {
        out += `<div class="sec"><span>Stok hampir kedaluwarsa</span><button class="link" data-act="keStok">Stok ready</button></div>
          <div class="list">${kd.slice(0, 4).map((b) => { const d = D.sisaHari(b); return `<button class="item" data-act="keStok"><div class="grow"><div class="t ell">${h(b.nama)}</div><div class="s">Sisa ${angka(b.sisa, 2)}</div></div><span class="tag ${d <= 0 ? 'bad' : 'warn'}">${d < 0 ? 'Lewat' : d === 0 ? 'Hari ini' : 'Besok'}</span></button>`; }).join('')}</div>`;
      }
      const pen = S.all('penitip').map((x) => ({ x, b: D.titipanBelumSetor(x.id) })).filter((y) => y.b.total > 0);
      if (pen.length) {
        out += `<div class="sec"><span>Setoran titipan belum dibayar · ${rp(pen.reduce((a, y) => a + y.b.total, 0))}</span></div>
          <div class="list">${pen.map((y) => `<button class="item" data-go="penitip" data-id="${h(y.x.id)}"><div class="av">${h(inisial(y.x.nama))}</div><div class="grow"><div class="t ell">${h(y.x.nama)}</div><div class="s">${angka(y.b.qty, 2)} terjual · untungmu ${rp(y.b.untung)}</div></div><div class="r num" style="font-weight:700">${rp(y.b.total)}</div></button>`).join('')}</div>`;
      }
      const pos = D.openPOAktif();
      if (pos.length) {
        out += `<div class="sec"><span>Open PO berjalan</span></div><div class="list">${pos.map((po) => {
          const i = D.infoOpenPO(po);
          const k = i.baris.reduce((a, b) => a + b.kuota, 0), t = i.baris.reduce((a, b) => a + b.terpakai, 0);
          return `<button class="item" data-go="openPO" data-id="${h(po.id)}"><div class="av">${ic('calendar')}</div><div class="grow"><div class="t ell">${h(po.judul || 'Open PO')}</div><div class="s">Order s.d. ${h(tgl(po.batas))}</div></div><div class="r num small" style="font-weight:700">${angka(t)}/${angka(k)}</div></button>`;
        }).join('')}</div>`;
      }

      if (D.jumlahLunas() >= 10 && !localStorage.getItem('bukue:saweria')) {
        out += `<div class="card" style="border-color:var(--aline)"><div class="row">${ic('coffee')}<div class="grow"><b>Sudah 10 tagihan lunas</b><div class="small muted">Kalau BuKue membantu, boleh traktir kopi pembuatnya. Semua fitur tetap bisa dipakai tanpa dukungan.</div></div></div>
          <div class="btns" style="margin-top:10px"><button class="btn" data-act="nantiSaja">Nanti saja</button><a class="btn pri" href="${SARAN}" target="_blank" rel="noopener" data-act="traktir">Traktir kopi</a></div></div>`;
      }

      if (L.laku.length) {
        out += `<div class="grid-2c"><div><div class="sec"><span>Paling laku</span></div><div class="list">${L.laku.map((x, i) => `<div class="item"><div class="av">${i + 1}</div><div class="grow"><div class="t ell">${h(x.nama)}</div><div class="s">${angka(x.qty)} terjual</div></div></div>`).join('')}</div></div>
          <div><div class="sec"><span>Paling cuan</span></div><div class="list">${L.cuan.map((x, i) => `<div class="item"><div class="av">${i + 1}</div><div class="grow"><div class="t ell">${h(x.nama)}</div><div class="s">Untung ${rp(x.untung)}</div></div></div>`).join('')}</div></div></div>`;
      }
      const setia = D.pelangganSetia(5);
      if (setia.length) {
        out += `<div class="sec"><span>Pelanggan setia</span></div><div class="list">${setia.map((x) => `<button class="item" data-go="customer" data-id="${h(x.id)}"><div class="av">${h(inisial(x.pel.nama))}</div><div class="grow"><div class="t ell">${h(x.pel.nama)}</div><div class="s">${x.n} pesanan</div></div><div class="r num">${rp(x.total)}</div></button>`).join('')}</div>`;
      }
      return out;
    },
    mount(el, p, ctx) {
      const n = el.querySelector('#angka-untung');
      if (n && !views.home._animated) {
        views.home._animated = true;
        hitungNaik(n, D.laporan(per).untung);
      }
    },
    input(el, ctx) {
      if (el.name === 'periode') { per = { jenis: el.value || '30', off: 0 }; simpanPer(); views.home._animated = false; ctx.rerender(); }
    },
    actions: {
      mundur: (b, e, ctx) => { per.off++; views.home._animated = false; ctx.rerender(); },
      maju: (b, e, ctx) => { per.off = Math.max(per.off - 1, 0); views.home._animated = false; ctx.rerender(); },
      keProduksi: (b, e, ctx) => ctx.tab('produksi'),
      keStok: (b, e, ctx) => ctx.go('stok'),
      lihatTagihan: (b, e, ctx) => { localStorage.setItem('bukue:filterPesanan', 'belum'); ctx.tab('orders'); },
      nantiSaja: (b, e, ctx) => { localStorage.setItem('bukue:saweria', '1'); ctx.rerender(); },
      traktir: (b, e, ctx) => { localStorage.setItem('bukue:saweria', '1'); setTimeout(() => ctx.rerender(), 300); },
      akhiriCoba: (b, e, ctx) => ctx.keluar(),
    },
  },
};

const addHari = addDays;

function kartuJadwal(judul, tanggal, j) {
  const isi = j.baris.length
    ? j.baris.map((b) => `<div class="kv"><span class="ell">${h(b.nama)}</span><b class="num">${angka(b.qty)}</b></div>`).join('')
    : '<p class="small muted" style="margin:0">Tidak ada produksi.</p>';
  return `<div class="card"><div class="row between" style="margin-bottom:6px"><h2 style="margin:0">${judul}</h2><span class="small muted">${tgl(tanggal)}</span></div>${isi}</div>`;
}

export function itemPesanan(p, info) {
  const i = info || D.pesananInfo(p);
  const sub = [p.tglAmbil ? 'Ambil ' + tgl(p.tglAmbil) + (p.jam ? ' ' + h(p.jam) : '') : '', angka(i.pcs) + ' item'].filter(Boolean).join(' · ');
  return `<button class="item" data-go="order" data-id="${h(p.id)}">
    <div class="av">${h(inisial(D.namaPel(i.pel)))}</div>
    <div class="grow"><div class="t ell">${h(D.namaPel(i.pel))}</div><div class="s ell">${sub}</div></div>
    <div class="r"><div class="num" style="font-weight:700">${rp(i.sisa > 0 && i.sb !== 'belum' ? i.sisa : i.total)}</div>${tagBayar(i.sb)}</div>
  </button>`;
}
