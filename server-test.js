// server-test.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = '/darknest';   // sub‑path used by GitHub Pages / vite config
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
  // Remove query string
  let url = req.url.split('?')[0];
  
  // If the request starts with our base, strip it to look inside dist/
  if (url.startsWith(BASE + '/')) {
    url = url.slice(BASE.length);   // becomes /Images/... or /assets/...
  }

  // Default to index.html for SPA routing
  if (url === '/' || url === '') url = '/index.html';

  const filePath = path.join(ROOT, url);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for client‑side routing
      fs.readFile(path.join(ROOT, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(500);
          res.end('Server error');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(indexData);
        }
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