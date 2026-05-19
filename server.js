import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const dataDir = join(__dirname, "data");
const dbPath = join(dataDir, "db.json");
const port = Number(process.env.PORT || 3000);

const defaultDb = {
  notes: [],
  clients: []
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    await writeJson(defaultDb);
  }
}

async function readJson() {
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      clients: Array.isArray(parsed.clients) ? parsed.clients : []
    };
  } catch {
    return structuredClone(defaultDb);
  }
}

async function writeJson(data) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) {
      throw new Error("Za duze dane formularza.");
    }
  }
  if (!body) return {};
  return JSON.parse(body);
}

function cleanText(value, max = 4000) {
  return String(value || "").trim().slice(0, max);
}

function requireAuthor(body) {
  const author = cleanText(body.author, 100);
  if (!author) {
    throw new Error("Brakuje imienia pracownika.");
  }
  return author;
}

function byNewest(a, b) {
  return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
}

async function handleApi(req, res, url) {
  const db = await readJson();

  if (req.method === "GET" && url.pathname === "/api/data") {
    sendJson(res, 200, {
      notes: [...db.notes].sort(byNewest),
      clients: [...db.clients].sort(byNewest)
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/notes") {
    const body = await readBody(req);
    const author = requireAuthor(body);
    const content = cleanText(body.content);
    if (!content) return sendError(res, 400, "Wpis notatki nie moze byc pusty.");
    const now = new Date().toISOString();
    const note = {
      id: crypto.randomUUID(),
      content,
      createdBy: author,
      updatedBy: author,
      createdAt: now,
      updatedAt: now
    };
    db.notes.push(note);
    await writeJson(db);
    sendJson(res, 201, note);
    return;
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/notes/")) {
    const id = url.pathname.split("/").at(-1);
    const body = await readBody(req);
    const author = requireAuthor(body);
    const note = db.notes.find((item) => item.id === id);
    if (!note) return sendError(res, 404, "Nie znaleziono notatki.");
    const content = cleanText(body.content);
    if (!content) return sendError(res, 400, "Wpis notatki nie moze byc pusty.");
    note.content = content;
    note.updatedBy = author;
    note.updatedAt = new Date().toISOString();
    await writeJson(db);
    sendJson(res, 200, note);
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/notes/")) {
    const id = url.pathname.split("/").at(-1);
    const body = await readBody(req);
    requireAuthor(body);
    const before = db.notes.length;
    db.notes = db.notes.filter((item) => item.id !== id);
    if (db.notes.length === before) return sendError(res, 404, "Nie znaleziono notatki.");
    await writeJson(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/clients") {
    const body = await readBody(req);
    const author = requireAuthor(body);
    const clientName = cleanText(body.clientName, 160);
    const searchedFor = cleanText(body.searchedFor, 600);
    const contact = cleanText(body.contact, 200);
    const details = cleanText(body.details);
    const status = cleanText(body.status, 80) || "Nowe";
    const date = cleanText(body.date, 40) || new Date().toISOString().slice(0, 10);
    if (!clientName || !searchedFor) {
      return sendError(res, 400, "Podaj klienta i czego szukal.");
    }
    const now = new Date().toISOString();
    const client = {
      id: crypto.randomUUID(),
      clientName,
      searchedFor,
      contact,
      details,
      status,
      date,
      createdBy: author,
      updatedBy: author,
      createdAt: now,
      updatedAt: now
    };
    db.clients.push(client);
    await writeJson(db);
    sendJson(res, 201, client);
    return;
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/clients/")) {
    const id = url.pathname.split("/").at(-1);
    const body = await readBody(req);
    const author = requireAuthor(body);
    const client = db.clients.find((item) => item.id === id);
    if (!client) return sendError(res, 404, "Nie znaleziono klienta.");
    const clientName = cleanText(body.clientName, 160);
    const searchedFor = cleanText(body.searchedFor, 600);
    if (!clientName || !searchedFor) {
      return sendError(res, 400, "Podaj klienta i czego szukal.");
    }
    client.clientName = clientName;
    client.searchedFor = searchedFor;
    client.contact = cleanText(body.contact, 200);
    client.details = cleanText(body.details);
    client.status = cleanText(body.status, 80) || "Nowe";
    client.date = cleanText(body.date, 40) || client.date;
    client.updatedBy = author;
    client.updatedAt = new Date().toISOString();
    await writeJson(db);
    sendJson(res, 200, client);
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/clients/")) {
    const id = url.pathname.split("/").at(-1);
    const body = await readBody(req);
    requireAuthor(body);
    const before = db.clients.length;
    db.clients = db.clients.filter((item) => item.id !== id);
    if (db.clients.length === before) return sendError(res, 404, "Nie znaleziono klienta.");
    await writeJson(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendError(res, 404, "Nie znaleziono endpointu.");
}

async function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
    });
    res.end(file);
  } catch {
    const fallback = await readFile(join(publicDir, "index.html"));
    res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    res.end(fallback);
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    const message = error instanceof SyntaxError ? "Niepoprawne dane JSON." : error.message;
    sendError(res, 500, message || "Blad serwera.");
  }
}).listen(port, () => {
  console.log(`Wspolny notatnik dziala: http://localhost:${port}`);
});
