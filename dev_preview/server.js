const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PREVIEW_PORT || 4000;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  let file = 'preview.html';
  if (url !== '/' && url !== '') file = url.replace(/^\//, '');
  const filePath = path.join(__dirname, '..', 'public', file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const map = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': map[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}`);
});
