// Static server that mirrors vercel.json: real files first, then a folder's index.html
// (prerendered pages), then the client-side shell for everything else (/app/**).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist/lvl/browser');
const port = Number(process.argv[3] ?? 4400);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

const isFile = async (path) => {
  try {
    return (await stat(path)).isFile() ? path : null;
  } catch {
    return null;
  }
};

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname)).replace(/^[/\\]+/, '');
  const target =
    (await isFile(join(root, path))) ??
    (await isFile(join(root, path, 'index.html'))) ??
    join(root, 'index.csr.html');
  res.writeHead(200, { 'content-type': types[extname(target)] ?? 'application/octet-stream' });
  res.end(await readFile(target));
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
