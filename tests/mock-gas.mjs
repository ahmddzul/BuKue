// Tiruan lingkungan Google Apps Script untuk menguji Code.gs di Node.
// Sel berformat teks (@) menyimpan semua nilai sebagai string, seperti kasus terburuk di Sheets.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

class Range {
  constructor(sh, r, c, nr = 1, nc = 1) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sh.cell(this.r + i, this.c + j));
      out.push(row);
    }
    return out;
  }
  setValues(v) {
    for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.set(this.r + i, this.c + j, v[i][j]);
    return this;
  }
  setValue(v) { this.sh.set(this.r, this.c, v); return this; }
  setNumberFormat(f) {
    for (let j = 0; j < this.nc; j++) if (f === '@') this.sh.textCols.add(this.c + j);
    return this;
  }
  setFontWeight() { return this; }
}

class Sheet {
  constructor(name) { this.name = name; this.rows = []; this.maxCols = 26; this.textCols = new Set(); this.frozen = 0; }
  cell(r, c) { return this.rows[r - 1]?.[c - 1] ?? ''; }
  set(r, c, v) {
    while (this.rows.length < r) this.rows.push([]);
    if (this.textCols.has(c) && v !== '' && v !== null && v !== undefined) v = typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v);
    this.rows[r - 1][c - 1] = v;
  }
  getName() { return this.name; }
  getLastRow() {
    for (let i = this.rows.length; i > 0; i--) if (this.rows[i - 1].some((x) => x !== '' && x !== undefined)) return i;
    return 0;
  }
  getLastColumn() { return this.rows.reduce((m, r) => { let k = 0; r.forEach((x, i) => { if (x !== '' && x !== undefined) k = i + 1; }); return Math.max(m, k); }, 0); }
  getMaxColumns() { return this.maxCols; }
  getMaxRows() { return 1000; }
  insertColumnsAfter(_, n) { this.maxCols += n; }
  getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
  deleteRow(r) { this.rows.splice(r - 1, 1); }
  getFrozenRows() { return this.frozen; }
  setFrozenRows(n) { this.frozen = n; }
}

export function buatServer(codePath) {
  const sheets = [new Sheet('Sheet1')];
  const props = new Map();
  const cache = new Map();
  const files = new Map();
  const folder = { id: 'folder1', getId: () => 'folder1', createFile(blob) { const id = 'f' + files.size; files.set(id, blob); return { getId: () => id }; } };
  const ss = {
    getSheetByName: (n) => sheets.find((s) => s.name === n) || null,
    insertSheet: (n) => { const s = new Sheet(n); sheets.push(s); return s; },
    getSheets: () => sheets,
    deleteSheet: (s) => sheets.splice(sheets.indexOf(s), 1),
  };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (a, s) => [...crypto.createHash('sha256').update(s, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
      getUuid: () => crypto.randomUUID(),
      base64Decode: (s) => [...Buffer.from(s, 'base64')],
      base64Encode: (b) => Buffer.from(b.map((x) => x & 255)).toString('base64'),
      newBlob: (bytes, mime, name) => ({ bytes, mime, name, getBytes: () => bytes, getContentType: () => mime }),
      formatDate: (d, tz, f) => d.toISOString().slice(0, 10),
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ content: s, setMimeType() { return this; } }) },
    DriveApp: {
      createFolder: () => folder,
      getFolderById: (id) => { if (id !== 'folder1') throw new Error('x'); return folder; },
      getFileById: (id) => { const b = files.get(id); if (!b) throw new Error('x'); return { getBlob: () => b, getParents: () => { let d = false; return { hasNext: () => !d, next: () => { d = true; return folder; } }; } }; },
    },
    Session: { getScriptTimeZone: () => 'Asia/Jakarta' },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(codePath, 'utf8'), ctx);
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: body } }).content);
  return { ctx, ss, post, fetch: async (url, opt) => { const j = post(opt.body); return { json: async () => j }; } };
}
