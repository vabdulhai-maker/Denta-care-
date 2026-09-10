const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function startServer(port) {
  const server = http.createServer((req, res) => {
    let cleanUrl = req.url.split('?')[0];
    try {
      cleanUrl = decodeURIComponent(cleanUrl);
    } catch (e) {
      cleanUrl = req.url.split('?')[0];
    }

    if (cleanUrl === '/' || cleanUrl === '') {
      cleanUrl = '/index.html';
    }

    const safePath = path.normalize(path.join(ROOT, cleanUrl));

    // Guard against directory traversal
    if (!safePath.startsWith(ROOT)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(safePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      const headers = {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Access-Control-Allow-Origin': '*'
      };

      // Cache images for instant scrubbing
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
        headers['Cache-Control'] = 'public, max-age=86400';
      }

      res.writeHead(200, headers);
      fs.createReadStream(safePath).pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`Dental Animation Localhost Server is Running!`);
    console.log(`Local link: http://localhost:${port}`);
    console.log(`Network link: http://127.0.0.1:${port}`);
    console.log(`==================================================\n`);
  });
}

startServer(PORT);
