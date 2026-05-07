// server-test.mjs
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = '/darknest';
const ROOT = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url.startsWith(BASE + '/')) {
    url = url.slice(BASE.length);
  }
  if (url === '/' || url === '') url = '/index.html';

  const filePath = path.join(ROOT, url);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, 'index.html'), (err2, indexData) => {
        if (err2) { res.writeHead(500); res.end('Server error'); }
        else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(indexData); }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(3000, () => {
  console.log('Test server running at http://localhost:3000/darknest/');
});