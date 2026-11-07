// Layar pembuka: logo, sapaan sesuai waktu, dan satu kalimat penyemangat.
import { SEMUA, kalimatBerikut } from './kalimat.js';
export { SEMUA };
import { h, ic, kurangiGerak } from './util.js';
import { etalase, sprinkle } from './ilustrasi.js';

export function sapaWaktu(d = new Date()) {
  const j = d.getHours();
  if (j < 11) return 'Selamat pagi';
  if (j < 15) return 'Selamat siang';
  if (j < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export function tampilkanSplash(nama) {
  const el = document.createElement('div');
  el.className = 'splash';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Layar pembuka');
  const sapa = nama ? `${sapaWaktu()}, ${h(nama)} 👋` : `${sapaWaktu()}! 👋`;
  el.innerHTML = `${sprinkle(110, 64, 'spl-a')}${sprinkle(110, 64, 'spl-b')}<div class="splash-in">
      <img src="icons/icon-192.png" alt="" width="72" height="72" class="splash-logo">
      ${etalase()}
      <p class="splash-sapa">${sapa}</p>
      <p class="splash-kalimat">${h(kalimatBerikut())}</p>
    </div>
    <a class="credit splash-credit" href="https://instagram.com/ahmddzul" target="_blank" rel="noopener">${ic('insta')}Dibuat oleh @ahmddzul</a>
    <span class="sr">Ketuk untuk menutup</span>`;
  document.body.appendChild(el);
  let tutup = false;
  const hilang = () => {
    if (tutup) return;
    tutup = true;
    if (kurangiGerak()) return el.remove();
    el.classList.add('out');
    setTimeout(() => el.remove(), 280);
  };
  const t = setTimeout(hilang, 2400);
  el.addEventListener('click', (e) => { if (!e.target.closest('a')) { clearTimeout(t); hilang(); } });
  document.addEventListener('keydown', function k(e) { if (e.key === 'Escape' || e.key === 'Enter') { clearTimeout(t); hilang(); document.removeEventListener('keydown', k); } });
}
