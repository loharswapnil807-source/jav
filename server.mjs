import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, isAbsolute, relative, resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number.parseInt(process.env.PORT ?? '4173', 10);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveRequestPath(requestUrl) {
  const requestPath = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const requestedRelativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
  const candidate = resolve(root, requestedRelativePath);
  const relativeCandidate = relative(root, candidate);

  if (relativeCandidate.startsWith('..') || isAbsolute(relativeCandidate)) {
    return null;
  }

  return candidate;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end('Method Not Allowed');
    return;
  }

  let filePath;
  try {
    filePath = resolveRequestPath(request.url ?? '/');
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Bad Request');
    return;
  }

  if (!filePath) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error('Not a file');
    }

    const body = await readFile(filePath);
    const contentType = contentTypes[extname(filePath)] ?? 'application/octet-stream';
    const headers = {
      'cache-control': 'no-store',
      'content-length': body.byteLength,
      'content-type': contentType,
    };
    if (requestPathForCacheBust(request.url ?? '/') === '/') {
      headers['clear-site-data'] = '"cache"';
    }
    response.writeHead(200, headers);
    if (request.method === 'HEAD') {
      response.end();
    } else {
      response.end(body);
    }
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
  }
});

function requestPathForCacheBust(requestUrl) {
  try {
    return new URL(requestUrl, 'http://localhost').pathname;
  } catch {
    return '';
  }
}

server.listen(port, '127.0.0.1', () => {
  console.log(`JARVIS command bridge listening at http://127.0.0.1:${port}`);
});
