#!/usr/bin/env node
/**
 * Local dev server — tidak perlu login Vercel.
 * Usage: npm run dev
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 3000);

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const { vercelHandler, sendJson, setCors } = await import("../lib/api-router.js");
const portal = await import("../lib/portal/index.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (urlPath === "/") {
    urlPath = "/index.html";
  }

  const filePath = path.normalize(path.join(PUBLIC, urlPath));

  if (!filePath.startsWith(PUBLIC)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

async function handleCronEmail(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const result = await portal.runScheduledPortalEmail();
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Cron failed" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";

  if (url.startsWith("/api/cron/email")) {
    await handleCronEmail(req, res);
    return;
  }

  if (url.startsWith("/api")) {
    await vercelHandler(req, res);
    return;
  }

  serveStatic(req, res);
});

process.on("uncaughtException", (err) => {
  console.error("\n  [dev-server] uncaughtException:", err.message || err);
});

process.on("unhandledRejection", (err) => {
  console.error("\n  [dev-server] unhandledRejection:", err?.message || err);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("");
    console.error("  Port " + PORT + " sudah dipakai (server lama masih jalan?).");
    console.error("");
    console.error("  Opsi 1 — hentikan proses di port " + PORT + " (PowerShell):");
    console.error(
      '    Get-NetTCPConnection -LocalPort ' +
        PORT +
        " -ErrorAction SilentlyContinue | Select -Expand OwningProcess -Unique | Stop-Process -Force"
    );
    console.error("");
    console.error("  Opsi 2 — pakai port lain:");
    console.error("    $env:PORT=3001; npm run dev");
    console.error("");
    process.exit(1);
  }
  throw err;
});

async function runStartupCheck() {
  try {
    await portal.getEmailSchedulerSettings();
    console.log("  Startup check: email-settings OK");
  } catch (err) {
    console.warn("  Startup check WARN:", err.message || err);
  }
}

server.listen(PORT, "127.0.0.1", async () => {
  console.log("");
  console.log("  OHS Portal — local dev server");
  console.log("  http://127.0.0.1:" + PORT);
  console.log("  http://localhost:" + PORT);
  console.log("");
  console.log("  API:  http://localhost:" + PORT + "/api/init");
  console.log("  PID:  " + process.pid);
  await runStartupCheck();
  console.log("");
  console.log("  Biarkan terminal ini terbuka. Stop dengan Ctrl+C.");
  console.log("  Tanpa login Vercel. Emulasi penuh: npm run dev:vercel");
  console.log("");
});
