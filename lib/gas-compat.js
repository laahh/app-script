import crypto from "crypto";
import { formatInTimeZone } from "date-fns-tz";

const TZ = process.env.TZ || "Asia/Jakarta";

export function getTimeZone() {
  return TZ;
}

export function getActiveUserEmail() {
  return process.env.ADMIN_EMAIL || "Web App User";
}

export function getPortalUrl() {
  return process.env.PORTAL_URL || "";
}

export function randomUUID() {
  return crypto.randomUUID();
}

const JAVA_TO_DATE_FNS = {
  "yyyy-MM-dd": "yyyy-MM-dd",
  "HH:mm": "HH:mm",
  "yyyy-MM-dd HH:mm": "yyyy-MM-dd HH:mm",
  "dd MMM yyyy": "dd MMM yyyy",
  MMM: "MMM",
};

export function formatDate(date, _tz, pattern) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "";
  }
  const fmt = JAVA_TO_DATE_FNS[pattern] || pattern;
  return formatInTimeZone(date, TZ, fmt);
}

const scriptProperties = {
  PORTAL_SCHEDULER_TRIGGER_INSTALLED: "TRUE",
};

export function getScriptProperty(key) {
  if (key === "PORTAL_SCHEDULER_TRIGGER_INSTALLED") {
    return process.env.CRON_SECRET ? "TRUE" : scriptProperties[key] || "";
  }
  if (scriptProperties[key] !== undefined) {
    return scriptProperties[key];
  }
  return process.env[key] || "";
}

export function setScriptProperty(key, value) {
  scriptProperties[key] = value;
}

export function deleteScriptProperty(key) {
  delete scriptProperties[key];
}

/**
 * Padanan UrlFetchApp.fetch(url, options). Meniru bentuk HTTPResponse GAS
 * (getResponseCode/getContentText) supaya kode di appscrip.js tetap bisa
 * ditulis dengan gaya Apps Script asli.
 */
export async function urlFetch(url, options) {
  const opts = options || {};
  const res = await fetch(url, {
    method: opts.method || "get",
    headers: opts.headers || {},
    body: opts.payload,
  });
  const text = await res.text();

  return {
    getResponseCode: () => res.status,
    getContentText: () => text,
  };
}

const noopLock = {
  async waitLock() {},
  releaseLock() {},
};

export function getScriptLock() {
  return noopLock;
}

export async function installPortalSchedulerTrigger() {
  setScriptProperty("PORTAL_SCHEDULER_TRIGGER_INSTALLED", "TRUE");
  return {
    installed: true,
    message:
      "Vercel Cron aktif (setiap 15 menit via vercel.json). Pastikan CRON_SECRET sudah di-set.",
  };
}

export async function removePortalSchedulerTrigger() {
  deleteScriptProperty("PORTAL_SCHEDULER_TRIGGER_INSTALLED");
  return {
    installed: false,
    deleted: 1,
    message: "Catatan trigger lokal dihapus. Nonaktifkan cron di vercel.json jika perlu.",
  };
}
