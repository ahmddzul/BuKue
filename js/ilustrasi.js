// Ilustrasi kue: garis 2px warna --ink, isian dari warna tema. Inline SVG supaya ringan dan ikut tema.
// Krim memakai warna tetap supaya tetap terlihat seperti krim di mode gelap.
const K = '#FFF6EC';
const s = 'stroke="var(--ilus)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

const GAMBAR = {
  cupcake: `
    <path d="M38 70h44l-6 36a4 4 0 0 1-4 3.4H48a4 4 0 0 1-4-3.4z" fill="var(--acc-2)" ${s}/>
    <path d="M50 72l2 36M60 72v36M70 72l-2 36" fill="none" ${s} opacity=".55"/>
    <path d="M33 71c-5-9 1-17 10-17-2-10 7-17 16-14 4-9 17-9 21 0 10-2 17 6 13 15 8 2 10 12 3 16z" fill="var(--acc)" ${s}/>
    <path d="M45 62h6M66 56l4-3M74 64l5 1M55 50l1-5" ${s}/>
    <path d="M60 33c0-6 3-10 7-12" fill="none" ${s}/><circle cx="60" cy="35" r="6.5" fill="var(--ilus)"/>`,
  kue: `
    <path d="M14 108h92" ${s}/>
    <rect x="22" y="72" width="76" height="34" rx="5" fill="var(--acc-2)" ${s}/>
    <rect x="34" y="46" width="52" height="27" rx="5" fill="var(--acc)" ${s}/>
    <path d="M34 53c0 6 6 6 6 1 0 7 7 7 7 0 0 6 6 7 7 1 0 8 7 8 7 0 0 6 6 6 6 0 0 7 7 7 7 0 0 5 6 5 6 0v-5H34z" fill="${K}" ${s}/>
    <path d="M22 80c0 6 7 6 7 0 0 8 8 8 8 0 0 6 7 6 7 0 0 7 8 7 8 0 0 6 7 6 7 0 0 8 8 8 8 0 0 6 7 6 7 0 0 7 8 7 8 0v-6H22z" fill="${K}" ${s}/>
    <path d="M52 46V32M68 46V32" ${s}/><path d="M52 22c-3 3-3 6 0 8 3-2 3-5 0-8zM68 22c-3 3-3 6 0 8 3-2 3-5 0-8z" fill="var(--acc)" ${s}/>`,
  toples: `
    <rect x="40" y="18" width="40" height="12" rx="4" fill="var(--acc)" ${s}/>
    <path d="M36 30h48a8 8 0 0 1 8 8v58a12 12 0 0 1-12 12H40a12 12 0 0 1-12-12V38a8 8 0 0 1 8-8z" fill="${K}" ${s}/>
    <rect x="28" y="56" width="64" height="20" fill="var(--acc-2)" ${s}/>
    <g fill="var(--acc)" ${s}><circle cx="44" cy="92" r="7"/><circle cx="60" cy="96" r="7"/><circle cx="76" cy="92" r="7"/><circle cx="52" cy="84" r="6"/><circle cx="68" cy="84" r="6"/></g>
    <path d="M44 89v1M60 93v1M76 89v1" ${s}/><path d="M42 40c0 6 0 10 2 13" fill="none" ${s} opacity=".5"/>`,
  irisan: `
    <path d="M18 104h84" ${s}/>
    <path d="M24 98V64l70-24v58z" fill="var(--acc-2)" ${s}/>
    <path d="M24 64l70-24 6 10-70 24z" fill="${K}" ${s}/>
    <path d="M24 80l70-24M24 90l70-22" fill="none" ${s} opacity=".55"/>
    <circle cx="74" cy="38" r="7" fill="var(--acc)" ${s}/><path d="M76 31c1-4 4-6 7-6" fill="none" ${s}/>`,
  mangkuk: `
    <path d="M20 66h80c-2 22-18 38-40 38S22 88 20 66z" fill="var(--acc)" ${s}/>
    <path d="M44 106h32" ${s}/>
    <path d="M30 66c4-8 14-12 30-12s26 4 30 12" fill="${K}" ${s}/>
    <path d="M70 62l16-30" ${s}/>
    <ellipse cx="91" cy="20" rx="7" ry="13" transform="rotate(28 91 20)" fill="none" ${s}/>
    <path d="M86 32c2-8 6-16 11-22" fill="none" ${s}/>`,
  loyang: `
    <path d="M14 82h92l-6 16H20z" fill="var(--acc)" ${s}/>
    <g ${s}><circle cx="32" cy="72" r="9" fill="var(--acc-2)"/><circle cx="56" cy="70" r="9" fill="var(--acc-2)"/><circle cx="80" cy="72" r="9" fill="var(--acc-2)"/></g>
    <path d="M29 70h1M35 74h1M53 68h1M58 72h1M77 70h1M83 74h1" ${s}/>
    <path d="M40 50c-4-6 4-10 0-16M60 48c-4-6 4-10 0-16M80 50c-4-6 4-10 0-16" fill="none" ${s} opacity=".6"/>`,
  karung: `
    <path d="M42 22h36l-6 12H48z" fill="var(--acc-2)" ${s}/>
    <path d="M48 34C30 44 22 62 22 80a24 24 0 0 0 24 24h28a24 24 0 0 0 24-24c0-18-8-36-26-46z" fill="${K}" ${s}/>
    <rect x="40" y="64" width="40" height="24" rx="5" fill="var(--acc)" ${s}/>
    <path d="M48 72h24M52 80h16" ${s}/>
    <path d="M88 96l12-6 6 10-12 6z" fill="var(--acc)" ${s}/>`,
  keranjang: `
    <path d="M18 56h84l-8 46a6 6 0 0 1-6 5H32a6 6 0 0 1-6-5z" fill="var(--acc-2)" ${s}/>
    <path d="M36 56l12-26M84 56L72 30" fill="none" ${s}/>
    <path d="M30 70h60M34 86h52M48 56v50M72 56v50" fill="none" ${s} opacity=".5"/>
    <path d="M26 56c0-10 8-14 16-12 2-8 14-10 18-2 6-6 18-2 18 6 8-2 16 2 14 8z" fill="var(--acc)" ${s}/>`,
  kalender: `
    <rect x="22" y="28" width="76" height="72" rx="8" fill="${K}" ${s}/>
    <path d="M22 46h76" ${s}/><rect x="22" y="28" width="76" height="18" rx="8" fill="var(--acc)" ${s}/>
    <path d="M40 22v12M80 22v12" ${s}/>
    <path d="M46 88V72h28v16zM46 76h28" fill="var(--acc-2)" ${s}/><path d="M60 72v-8" ${s}/><path d="M60 56c-2 2-2 4 0 6 2-2 2-4 0-6z" fill="var(--acc)" ${s}/>`,
};

export const adaIlustrasi = (n) => n in GAMBAR;

export function ilus(nama, ukuran = 120, cls = '') {
  return `<svg class="ilus ${cls}" viewBox="0 0 120 120" width="${ukuran}" height="${ukuran}" aria-hidden="true" focusable="false">${GAMBAR[nama] || ''}</svg>`;
}

// Taburan sprinkle: posisi tetap supaya tidak berubah tiap render.
const TABUR = [[8, 10, 20], [26, 30, -30], [46, 8, 60], [70, 24, 10], [92, 6, -45], [110, 30, 35], [16, 52, -10], [84, 50, 70], [58, 44, -60], [104, 62, 15]];
export function sprinkle(w = 120, h = 70, cls = '') {
  const warna = ['var(--acc)', 'var(--ink)', 'var(--acc-2)'];
  return `<svg class="sprinkle ${cls}" viewBox="0 0 120 70" width="${w}" height="${h}" aria-hidden="true" focusable="false">${TABUR.map(([x, y, r], i) => `<rect x="${x}" y="${y}" width="9" height="3.2" rx="1.6" fill="${warna[i % 3]}" transform="rotate(${r} ${x + 4.5} ${y + 1.6})"/>`).join('')}</svg>`;
}

// Rak etalase: tiga kue berdampingan di atas rak.
export function etalase(cls = '') {
  return `<div class="etalase ${cls}" aria-hidden="true">${ilus('toples', 72)}${ilus('kue', 92)}${ilus('cupcake', 72)}<span class="rak"></span></div>`;
}
