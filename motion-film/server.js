// Zero-dependency static server with HTTP Range support (so the <video> can seek).
// Usage: node server.js [port]   (default 4173, binds 0.0.0.0)
const http = require("http"), fs = require("fs"), path = require("path");
const root = __dirname, port = parseInt(process.argv[2] || "4173", 10);
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png", ".ttf": "font/ttf", ".md": "text/markdown; charset=utf-8" };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("not found");
  }
  const size = fs.statSync(file).size, type = MIME[path.extname(file)] || "application/octet-stream";
  const range = req.headers.range;
  if (range) {
    const [s, e] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(s, 10) || 0, end = e ? parseInt(e, 10) : size - 1;
    res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1, "Content-Type": type });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "Content-Length": size, "Content-Type": type, "Accept-Ranges": "bytes" });
    fs.createReadStream(file).pipe(res);
  }
}).listen(port, "0.0.0.0", () => console.log(`PARTH- preview → http://0.0.0.0:${port}`));
