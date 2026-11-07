// Server tiruan untuk uji di browser: menjalankan Code.gs asli lewat tiruan Apps Script.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buatServer } from './mock-gas.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const srv = buatServer(path.join(dir, '../apps-script/Code.gs'));
srv.post(JSON.stringify({ action: 'ping' }));
const kode = srv.ss.getSheetByName('Pengaturan').rows.find((r) => r[0] === 'kodeSetup')[1];
const port = Number(process.argv[2] || 8124);
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && req.url === '/kode') { res.end(kode); return; }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => { res.setHeader('Content-Type', 'application/json'); res.end(req.method === 'POST' ? JSON.stringify(srv.post(body)) : '{}'); });
}).listen(port, () => console.log('mock server', port, 'kode', kode));
