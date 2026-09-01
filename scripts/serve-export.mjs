/*
 * Serves the static export in out/ under the production basePath, so tests hit
 * the same URLs GitHub Pages will. `next start` cannot do this: output:"export"
 * has no Node server at runtime.
 *
 * Usage: node scripts/serve-export.mjs [port]
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.argv[2] ?? 4600);
const BASE_PATH = "/tessele";
const ROOT = new URL("../out/", import.meta.url).pathname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const resolve = async (urlPath) => {
  // Strip the basePath, then refuse anything that climbs out of out/.
  const withoutBase = urlPath.startsWith(BASE_PATH)
    ? urlPath.slice(BASE_PATH.length)
    : urlPath;
  const clean = normalize(decodeURIComponent(withoutBase.split("?")[0]));
  if (clean.includes("..")) return null;

  const candidates = clean.endsWith("/")
    ? [join(ROOT, clean, "index.html")]
    : [join(ROOT, clean), join(ROOT, `${clean}.html`), join(ROOT, clean, "index.html")];

  for (const candidate of candidates) {
    if (!candidate.startsWith(ROOT)) continue;
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // Try the next shape.
    }
  }
  return null;
};

createServer(async (request, response) => {
  const file = await resolve(request.url ?? "/");
  if (!file) {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
    return;
  }
  response.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
}).listen(PORT, () => console.log(`export served at http://localhost:${PORT}${BASE_PATH}/`));
