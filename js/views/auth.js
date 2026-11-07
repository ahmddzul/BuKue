import { h, ic } from '../util.js';
import { CONFIG } from '../config.js';
import { sesi, webAppUrl } from '../shared.js';
import { createApi } from '../store.js';
import { field } from './ui.js';
import { kredit } from './more.js';
import { etalase, sprinkle } from '../ilustrasi.js';

let layar = 'awal';

function namaPerangkat() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) { const m = ua.match(/Android[^;]*;\s*([^;)]+)/); return m ? m[1].trim().slice(0, 40) : 'Android'; }
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Perangkat';
}

const logo = () => `<img class="logo" src="icons/icon-192.png" alt="" width="84" height="84">`;
const fieldUrl = () => CONFIG.webAppUrl ? '' : field('Link Web App', `<input type="url" id="a-url" name="url" value="${h(webAppUrl())}" placeholder="https://script.google.com/macros/s/…/exec" required autocomplete="off">`, { id: 'a-url', hint: 'Dari Apps Script: Terapkan > Kelola deployment. Cukup diisi sekali di HP ini.' });

export function authView(root, ctx) {
  const lama = sesi.get();
  const ulang = lama?.mode === 'akun' && !lama.token;
  if (ulang && layar === 'awal') layar = 'masuk';
  const tampil = () => {
    let isi = '';
    if (layar === 'awal') {
      isi = `<div class="brand" style="position:relative">${sprinkle(80, 46, 'auth-spr')}${logo()}<h1>BuKue</h1><p>Catat PO, hitung HPP, tagih pakai QRIS.</p></div>
        ${etalase('auth-etalase')}
        <div style="display:grid;gap:10px">
          <button class="btn pri block" data-a="masuk">${ic('user')}Masuk</button>
          <button class="btn block" data-a="daftar">${ic('plus')}Buat akun baru</button>
          <button class="link" data-a="coba" style="align-self:center">Coba dulu pakai data contoh</button>
        </div>
        <p class="small muted" style="text-align:center;margin-top:18px">HP kedua? Pilih Masuk dan pakai akun yang sudah dibuat.</p>`;
    } else if (layar === 'masuk') {
      isi = `<div class="brand">${logo()}<h1>Masuk</h1><p>${ulang ? 'Sesi di HP ini berakhir. Masuk lagi ya.' : 'Pakai akun BuKue yang sudah dibuat.'}</p></div>
        <form data-f="masuk" novalidate>
          ${fieldUrl()}
          ${field('Nama pengguna', `<input type="text" id="a-u" name="username" autocapitalize="none" autocomplete="username" required value="${h(lama?.akun?.username || '')}">`, { id: 'a-u' })}
          ${field('Kata sandi', '<input type="password" id="a-p" name="sandi" autocomplete="current-password" required>', { id: 'a-p' })}
          <div class="banner" data-err role="alert" hidden></div>
          <button class="btn pri block">Masuk</button>
        </form>
        <button class="link" data-a="awal" style="display:block;margin:10px auto 0">Kembali</button>`;
    } else {
      isi = `<div class="brand">${logo()}<h1>Buat akun</h1><p>Akun pertama dibuat sekali saja. HP lain tinggal masuk.</p></div>
        <form data-f="daftar" novalidate>
          ${fieldUrl()}
          ${field('Nama kamu', '<input type="text" id="d-n" name="nama" autocomplete="name">', { id: 'd-n' })}
          ${field('Nama pengguna', '<input type="text" id="d-u" name="username" autocapitalize="none" autocomplete="username" required>', { id: 'd-u', hint: '3 sampai 24 karakter: huruf kecil, angka, titik, atau garis bawah.' })}
          ${field('Kata sandi', '<input type="password" id="d-p" name="sandi" autocomplete="new-password" minlength="6" required>', { id: 'd-p', hint: 'Minimal 6 karakter.' })}
          ${field('Ulangi kata sandi', '<input type="password" id="d-p2" name="sandi2" autocomplete="new-password" required>', { id: 'd-p2' })}
          ${field('Kode setup', '<input type="text" id="d-k" name="kode" autocapitalize="characters" autocomplete="off" required>', { id: 'd-k', hint: 'Lihat di Google Sheet: menu BuKue > Lihat kode setup. Hanya untuk akun pertama.' })}
          <div class="banner" data-err role="alert" hidden></div>
          <button class="btn pri block">Buat akun</button>
        </form>
        <button class="link" data-a="awal" style="display:block;margin:10px auto 0">Kembali</button>`;
    }
    root.innerHTML = `<div class="auth page-in">${isi}<div style="text-align:center;margin-top:24px">${kredit()}</div></div>`;
    root.querySelector('input')?.focus({ preventScroll: true });
  };

  root.onclick = (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    if (b.dataset.a === 'coba') return ctx.mulaiCoba();
    layar = b.dataset.a;
    tampil();
  };
  root.onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = form.querySelector('[data-err]');
    const btn = form.querySelector('button.pri');
    const salah = (m) => { err.hidden = false; err.textContent = m; btn.disabled = false; btn.textContent = form.dataset.f === 'masuk' ? 'Masuk' : 'Buat akun'; };
    const url = (CONFIG.webAppUrl || form.url?.value || '').trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url) && !/^http:\/\/localhost[:/]/.test(url)) return salah('Link Web App belum benar. Harus diawali https://script.google.com/');
    if (!CONFIG.webAppUrl) localStorage.setItem('bukue:url', url);
    const f = Object.fromEntries(new FormData(form));
    if (!f.username || !f.sandi) return salah('Isi nama pengguna dan kata sandi.');
    if (form.dataset.f === 'daftar') {
      if (f.sandi.length < 6) return salah('Kata sandi minimal 6 karakter.');
      if (f.sandi !== f.sandi2) return salah('Ulangi kata sandi belum sama.');
      if (!f.kode) return salah('Isi kode setup dari Google Sheet.');
    }
    btn.disabled = true;
    btn.textContent = 'Menghubungkan…';
    const api = createApi(url, () => '');
    try {
      const r = form.dataset.f === 'masuk'
        ? await api.call('masuk', { username: f.username, sandi: f.sandi, perangkat: namaPerangkat() })
        : await api.call('daftar', { username: f.username, sandi: f.sandi, nama: f.nama, kodeSetup: f.kode, perangkat: namaPerangkat() });
      layar = 'awal';
      ctx.mulaiAkun({ url, token: r.token, akun: r.akun });
    } catch (x) {
      salah(x.message === 'Tidak ada koneksi' ? 'Tidak bisa terhubung. Cek internet dan link Web App (akses harus "Anyone").' : x.message);
    }
  };
  tampil();
}
