import { defineConfig } from 'vite';

export default defineConfig({
  base: '/darknest/',
  server: {
    open: false,
    port: 3000,
    strictPort: true,
  },
  plugins: [
    {
      name: 'save-cards-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/save-cards', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                const fs = require('fs');
                const path = require('path');
                const cards = JSON.parse(body);
                const filePath = path.join(process.cwd(), 'public', 'data', 'cards.json');
                fs.writeFileSync(filePath, JSON.stringify(cards, null, 2));
                res.writeHead(200);
                res.end('OK');
              } catch (e) {
                res.writeHead(500);
                res.end('Error: ' + e.message);
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ]
});