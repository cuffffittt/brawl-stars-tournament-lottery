const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const STATE_FILE = path.join(ROOT, "state.json");

const defaultState = {
  clientId: "server",
  version: 0,
  reason: "initial",
  stages: null
};

let currentState = loadState();
const clients = new Set();

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  fs.writeFile(STATE_FILE, JSON.stringify(currentState, null, 2), () => {});
}

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function broadcast(payload) {
  const body = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 2_000_000) {
        req.destroy();
        reject(new Error("body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(ROOT, pathname));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    const type = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8"
    }[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === "/api/state" && req.method === "GET") {
    sendJson(res, 200, currentState);
    return;
  }

  if (req.url === "/api/state" && req.method === "POST") {
    try {
      const incoming = JSON.parse(await readBody(req));
      if (!incoming || typeof incoming !== "object" || !incoming.stages) {
        sendJson(res, 400, { error: "Invalid tournament state" });
        return;
      }

      currentState = {
        clientId: String(incoming.clientId || "unknown"),
        version: Number(incoming.version || Date.now()),
        reason: String(incoming.reason || "update"),
        stages: incoming.stages
      };
      saveState();
      broadcast(currentState);
      sendJson(res, 200, { ok: true, version: currentState.version });
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON" });
    }
    return;
  }

  if (req.url === "/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    res.write("\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Lottery sync server running at http://localhost:${PORT}`);
});
