import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("apps/mobile/dist");
const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".wasm": "application/wasm",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = path.resolve(root, "." + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      if (!path.extname(file)) file = path.join(root, "index.html");
      const content = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cache-Control": "no-store",
      });
      res.end(content);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(8081, "127.0.0.1", () =>
    console.log("Veynoa preview: http://127.0.0.1:8081"),
  );
