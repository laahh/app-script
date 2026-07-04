#!/usr/bin/env node
/**
 * Smoke test semua endpoint API (read-only / safe).
 * Usage: npm run health-check
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.env.HEALTH_BASE || "http://127.0.0.1:3000";

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, "\n");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const SAFE_TESTS = [
  { name: "GET /api/init", method: "GET", path: "/api/init" },
  { name: "POST /api/dashboard/overview", method: "POST", path: "/api/dashboard/overview", body: { year: new Date().getFullYear() } },
  { name: "POST /api/calendar/range", method: "POST", path: "/api/calendar/range", body: { viewMode: "WEEK" } },
  { name: "POST /api/events/maker-data", method: "POST", path: "/api/events/maker-data", body: {} },
  { name: "POST /api/tracker/data", method: "POST", path: "/api/tracker/data", body: {} },
  { name: "GET /api/admin/email-settings", method: "GET", path: "/api/admin/email-settings" },
  { name: "POST /api/leave/check-overlap", method: "POST", path: "/api/leave/check-overlap", body: { EmpId: "TEST", StartDate: "2099-01-01", EndDate: "2099-01-02" } },
  { name: "GET / (index.html)", method: "GET", path: "/" },
  { name: "GET /js/google-script-shim.js", method: "GET", path: "/js/google-script-shim.js" },
  { name: "GET /api/unknown-route", method: "GET", path: "/api/does-not-exist", expectStatus: 404 },
];

async function runTest(test) {
  const url = BASE + test.path;
  const options = { method: test.method, headers: {} };
  if (test.body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(test.body);
  }

  const started = Date.now();
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { _rawLength: text.length };
    }

    const expectStatus = test.expectStatus || 200;
    const ok = res.status === expectStatus && (expectStatus !== 200 || !json?.error);

    return { ...test, ok, status: res.status, error: json?.error || null, ms: Date.now() - started };
  } catch (err) {
    return { ...test, ok: false, status: 0, error: err.message, ms: Date.now() - started };
  }
}

loadEnvFile();

const results = [];
for (const test of SAFE_TESTS) {
  results.push(await runTest(test));
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);

console.log("\n=== OHS Portal Health Check ===");
console.log("Base:", BASE);
console.log("Passed:", passed + "/" + results.length);
console.log("");

for (const r of results) {
  const mark = r.ok ? "OK  " : "FAIL";
  console.log(mark, r.name, "(" + (r.status || "ERR") + ")", r.error ? "— " + r.error : "");
}

if (failed.length) {
  console.log("\nGagal:", failed.length);
  process.exitCode = 1;
} else {
  console.log("\nSemua smoke test lulus.");
}
