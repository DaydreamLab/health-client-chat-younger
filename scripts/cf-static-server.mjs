#!/usr/bin/env node
/**
 * Serve `.output/public` like prod CloudFront www:
 * - extensionless paths → `<path>/index.html` (viewer-request Function)
 * - trailing slash → `<path>index.html`
 * - any missing object (incl. .json) → `/200.html` with HTTP 200
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../.output/public', import.meta.url))
const port = Number(process.env.PORT || 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
}

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0] || '/')
  const cleaned = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '')
  const full = join(base, cleaned)
  if (!full.startsWith(base)) {
    return null
  }
  return full
}

/** Mirror candor-www-index-rewrite CloudFront Function. */
function rewriteUri(uri) {
  if (uri.endsWith('/')) {
    return `${uri}index.html`
  }
  const last = uri.substring(uri.lastIndexOf('/') + 1)
  if (last.indexOf('.') === -1) {
    return `${uri}/index.html`
  }
  return uri
}

function sendFile(res, filePath, status = 200) {
  const type = TYPES[extname(filePath)] || 'application/octet-stream'
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  createReadStream(filePath).pipe(res)
}

createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`)
  const uri = url.pathname || '/'
  const rewritten = rewriteUri(uri)
  const candidate = safeJoin(root, rewritten)
  const fallback = safeJoin(root, '/200.html')

  if (candidate && existsSync(candidate) && statSync(candidate).isFile()) {
    sendFile(res, candidate, 200)
    return
  }

  // Prod custom error: any miss (HTML or asset) → /200.html with 200.
  if (fallback && existsSync(fallback)) {
    sendFile(res, fallback, 200)
    return
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('not found')
}).listen(port, '127.0.0.1', () => {
  console.log(`cf-static-server root=${root} http://127.0.0.1:${port}`)
})
