#!/usr/bin/env node
/**
 * Converts appscrip.js (Google Apps Script) → lib/portal/index.js (Node.js ESM)
 * Run: node scripts/build-portal.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourcePath = path.join(root, "appscrip.js");
const outPath = path.join(root, "lib", "portal", "index.js");

const PUBLIC_EXPORTS = [
  "getInit",
  "getDashboardOverview",
  "getEmployeeLeaveHistory",
  "createTracker",
  "updateTrackerDetails",
  "getTrackerData",
  "updateTrackerSubTask",
  "updateTracker",
  "getTrackerSubTaskUpdateLog",
  "getTrackerUpdateLog",
  "checkLeaveOverlap",
  "createLeaveRequest",
  "getCalendarRange",
  "createEvent",
  "updateEvent",
  "updateEventReadiness",
  "getEventMakerData",
  "getEventCheckinInfo",
  "submitEventCheckin",
  "getEventAttendanceSummary",
  "getEventMinutes",
  "saveEventMinutes",
  "addEventActionItem",
  "updateEventActionItemStatus",
  "getEmailSchedulerSettings",
  "saveEmailSchedulerSettings",
  "sendSchedulerEmailNow",
  "sendSchedulerTestEmail",
  "runScheduledPortalEmail",
  "runOverdueReminderCheck",
  "sendOverdueReminderNow",
  "installPortalSchedulerTrigger",
  "removePortalSchedulerTrigger",
];

let code = fs.readFileSync(sourcePath, "utf8");
code = code.replace(/\r\n/g, "\n");

/** await getFoo_().filter → (await getFoo_()).filter */
function fixAwaitChaining(source) {
  return source.replace(
    /await ([a-zA-Z_]+\([^)]*\))(?=\s*\n\s*\.|\s*\.(?:filter|map|forEach|find|reduce|slice|sort|some|every|concat))/g,
    "(await $1)"
  );
}

function findMatchingBrace(source, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** forEach + await inside callback → for...of */
function convertAsyncForEach(source) {
  const re = /(\n([ \t]*))([^\n]+?)\.forEach\(function\s*\(([^)]*)\)\s*\{/g;
  const matches = [...source.matchAll(re)];

  let result = source;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const openBrace = m.index + m[0].length - 1;
    const closeBrace = findMatchingBrace(result, openBrace);
    if (closeBrace < 0) continue;

    const body = result.slice(openBrace + 1, closeBrace);
    if (!body.includes("await ")) continue;

    const indent = m[2];
    const arrayExpr = m[3].trim();
    const params = m[4].trim();
    const paramName = params.split(",")[0].trim() || "item";

    const replacement =
      `\n${indent}for (const ${paramName} of ${arrayExpr}) {${body}\n${indent}}`;

    let tailStart = closeBrace + 1;
    const tail = result.slice(tailStart);
    const closeCall = tail.match(/^\s*\)\s*;/);
    if (closeCall) {
      tailStart += closeCall[0].length;
    }

    result = result.slice(0, m.index) + replacement + result.slice(tailStart);
  }
  return result;
}

// Remove doGet
code = code.replace(/function doGet\(\)[\s\S]*?\}\r?\n\r?\n/, "");

// Remove top-level constants block (replaced by config import)
code = code.replace(
  /const SPREADSHEET_ID[\s\S]*?const EMAIL_SCHEDULER_HEADERS = \[[\s\S]*?\];\r?\n\r?\n/,
  ""
);

// Remove only GAS sheet adapter functions (helpers mulai headerIndexMap_ tetap ada)
const sheetAdapterStart = code.indexOf("function getSpreadsheet_()");
const helpersStart = code.indexOf("function headerIndexMap_(");
if (sheetAdapterStart >= 0 && helpersStart > sheetAdapterStart) {
  code = code.slice(0, sheetAdapterStart) + code.slice(helpersStart);
}

// Remove GAS trigger install/remove only
code = code.replace(
  /\/\*\*\r?\n \* Jalankan fungsi ini SATU KALI[\s\S]*?function installPortalSchedulerTrigger\(\) \{[\s\S]*?\}\r?\n\r?\n/,
  ""
);
code = code.replace(
  /\/\*\*\r?\n \* Jalankan dari Apps Script Editor[\s\S]*?function removePortalSchedulerTrigger\(\) \{[\s\S]*?\}\r?\n\r?\n/,
  ""
);

// GAS API replacements
code = code.replace(/Utilities\.getUuid\(\)/g, "randomUUID()");
code = code.replace(/Utilities\.formatDate\(/g, "formatDate(");
code = code.replace(/Session\.getScriptTimeZone\(\)/g, "getTimeZone()");
code = code.replace(/Session\.getActiveUser\(\)\.getEmail\(\)/g, "getActiveUserEmail()");
code = code.replace(/LockService\.getScriptLock\(\)/g, "getScriptLock()");
code = code.replace(/MailApp\.getRemainingDailyQuota\(\)/g, "getRemainingDailyQuota()");
code = code.replace(/MailApp\.sendEmail\(/g, "await sendEmail(");
code = code.replace(
  /name:\s*"OHS Portal Scheduler"/g,
  "name: getDefaultFromName()"
);
code = code.replace(
  /PropertiesService\.getScriptProperties\(\)\.getProperty\(/g,
  "getScriptProperty("
);
code = code.replace(
  /const properties = PropertiesService\.getScriptProperties\(\);\r?\n(\s*)const triggerInstalled =\r?\n(\s*)String\(properties\.getProperty\("PORTAL_SCHEDULER_TRIGGER_INSTALLED"\)/g,
  'const triggerInstalled =\n$2String(getScriptProperty("PORTAL_SCHEDULER_TRIGGER_INSTALLED")'
);
code = code.replace(/ScriptApp\.getService\(\)\.getUrl\(\)/g, "getPortalUrl()");

// Spreadsheet getSheetByName async
code = code.replace(
  /const spreadsheet = getSpreadsheet_\(\);\r?\n(\s*)const sheet = spreadsheet\.getSheetByName\(/g,
  "const spreadsheet = await getSpreadsheet_();\n$1const sheet = await spreadsheet.getSheetByName("
);

// readEmailSchedulerSettings_ — async sheet methods
code = code.replace(
  /if \(!sheet \|\| sheet\.getLastRow\(\) < 2\)/g,
  "if (!sheet || (await sheet.getLastRow()) < 2)"
);
code = code.replace(
  /const headers = sheet\r?\n(\s*)\.getRange\(1, 1, 1, sheet\.getLastColumn\(\)\)\r?\n(\s*)\.getValues\(\)\[0\]/g,
  "const headers = (await sheet\n$1.getRange(1, 1, 1, await sheet.getLastColumn())\n$2.getValues())[0]"
);
code = code.replace(
  /const row = sheet\.getRange\(2, 1, 1, sheet\.getLastColumn\(\)\)\.getValues\(\)\[0\]/g,
  "const row = (await sheet.getRange(2, 1, 2, await sheet.getLastColumn()).getValues())[0] || []"
);

// writeEmailSchedulerSettings_
code = code.replace(
  /function writeEmailSchedulerSettings_\(settings\) \{[\s\S]*?sheet\.getRange\(2, 1, 1, row\.length\)\.setValues\(\[row\]\);\r?\n\}/,
  `async function writeEmailSchedulerSettings_(settings) {
  const sheet = await getOrCreateSheet_(SHEET_EMAIL_SCHEDULER, EMAIL_SCHEDULER_HEADERS);
  await ensureHeaders_(sheet, EMAIL_SCHEDULER_HEADERS);

  const lastColumn = await sheet.getLastColumn();
  const headers = (await sheet.getRange(1, 1, 1, lastColumn).getValues())[0].map(function (value) {
    return String(value || "").trim();
  });

  const row = headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(settings, header)
      ? settings[header]
      : "";
  });

  await sheet.getRange(2, 1, 2, row.length).setValues([row]);
  sheet.invalidateCache();
}`
);

// updateEvent / updateEventReadiness — async sheet reads
code = code.replace(
  /await ensureHeaders_\(sheet, EVENT_HEADERS\);\r?\n\r?\n(\s*)if \(sheet\.getLastRow\(\) < 2\)/g,
  "await ensureHeaders_(sheet, EVENT_HEADERS);\n\n$1if ((await sheet.getLastRow()) < 2)"
);
code = code.replace(
  /const headers = sheet\r?\n(\s*)\.getRange\(1, 1, 1, sheet\.getLastColumn\(\)\)\r?\n(\s*)\.getValues\(\)\[0\]/g,
  "const headers = (await sheet\n$1.getRange(1, 1, 1, await sheet.getLastColumn())\n$2.getValues())[0]"
);
code = code.replace(
  /const values = sheet\r?\n(\s*)\.getRange\(2, 1, sheet\.getLastRow\(\) - 1, sheet\.getLastColumn\(\)\)\r?\n(\s*)\.getValues\(\)/g,
  "const values = await sheet\n$1.getRange(2, 1, (await sheet.getLastRow()) - 1, await sheet.getLastColumn())\n$2.getValues()"
);

// Make functions async only when body contains await (after injection below)
function markAsyncFunctions(source) {
  let result = source;
  let changed = true;

  while (changed) {
    changed = false;
    const re = /^function (\w+)\([^)]*\) \{/gm;
    const matches = [...result.matchAll(re)];

    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      const openBrace = m.index + m[0].length - 1;
      const closeBrace = findMatchingBrace(result, openBrace);
      if (closeBrace < 0) continue;

      const body = result.slice(openBrace, closeBrace + 1);
      if (!body.includes("await ")) continue;

      if (!result.slice(Math.max(0, m.index - 6), m.index).includes("async")) {
        result = result.slice(0, m.index) + "async " + result.slice(m.index);
        changed = true;
      }
    }

    // Add await before calls to async functions
    const asyncNames = [...result.matchAll(/^async function (\w+)/gm)].map((m) => m[1]);
    for (const name of asyncNames) {
      const callRe = new RegExp(`(?<!await )(?<!async function )\\b${name}\\(`, "g");
      result = result.replace(callRe, (match, offset) => {
        const before = result.slice(Math.max(0, offset - 16), offset);
        if (/async function\s*$/.test(before) || /function\s*$/.test(before)) {
          return match;
        }
        changed = true;
        return `await ${name}(`;
      });
    }
  }

  return result;
}

// Add await before async calls (avoid double-await)
const AWAIT_TARGETS = [
  "getSpreadsheet_\\(",
  "getSheet_\\(",
  "getOrCreateSheet_\\(",
  "readTable_\\(",
  "ensureHeaders_\\(",
  "appendObjectRow_\\(",
  "setObjectRowValues_\\(",
  "getEmployees_\\(",
  "getLeaveTypes_\\(",
  "getLeaveRequests_\\(",
  "getEvents_\\(",
  "getTrackers_\\(",
  "getTrackerSubTasks_\\(",
  "getTrackerSubTaskUpdateLogs_\\(",
  "getTrackerUpdateLogs_\\(",
  "getHolidaysMap_\\(",
  "getTrackersWithSubTasks_\\(",
  "syncTrackerAggregate_\\(",
  "readEmailSchedulerSettings_\\(",
  "writeEmailSchedulerSettings_\\(",
  "getAvailableOverviewYears_\\(",
  "appendTrackerUpdateLog_\\(",
  "appendTrackerSubTaskUpdateLog_\\(",
  "getDashboardOverview\\(",
  "getEmailSchedulerSettings\\(",
  "executePortalEmailDigest_\\(",
  "buildPortalEmailDigest_\\(",
];

for (const target of AWAIT_TARGETS) {
  const re = new RegExp(`(?<!await )(${target})`, "g");
  code = code.replace(re, (match, _p1, offset) => {
    const before = code.slice(Math.max(0, offset - 16), offset);
    if (/async function\s*$/.test(before) || /function\s*$/.test(before)) {
      return match;
    }
    return `await ${match}`;
  });
}

// lock.waitLock
code = code.replace(/(\s+)lock\.waitLock\(/g, "$1await lock.waitLock(");

// forEach with await → for...of (before async marking)
code = convertAsyncForEach(code);

// Mark async + propagate await to callers (multi-pass)
code = markAsyncFunctions(code);

// Fix double await
code = code.replace(/await await /g, "await ");

// await fn().method → (await fn()).method
code = fixAwaitChaining(code);

// Fix TriggerInstallNote for Vercel
code = code.replace(
  /"Jalankan installPortalSchedulerTrigger satu kali dari Apps Script Editor\.[\s\S]*?ScriptApp\.getProjectTriggers\."/,
  '"Cron Vercel aktif via vercel.json (setiap 15 menit). Set CRON_SECRET di environment."'
);
code = code.replace(
  "tetapi trigger belum dipasang. Jalankan installPortalSchedulerTrigger dari Apps Script Editor.",
  "tetapi cron belum aktif. Set CRON_SECRET dan deploy ke Vercel."
);
code = code.replace(
  "). Trigger memeriksa jadwal setiap 15 menit.",
  "). Vercel Cron memeriksa jadwal setiap 15 menit."
);

const header = `/** @generated from appscrip.js — do not edit manually; run npm run build:portal */
import {
  SPREADSHEET_ID,
  SHEET_EMPLOYEES,
  SHEET_LEAVE_TYPES,
  SHEET_LEAVE_REQUESTS,
  SHEET_HOLIDAYS,
  SHEET_EVENTS,
  SHEET_TRACKERS,
  SHEET_TRACKER_UPDATES,
  SHEET_TRACKER_TASKS,
  SHEET_TRACKER_TASK_UPDATES,
  SHEET_EMAIL_SCHEDULER,
  LEAVE_HEADERS,
  EVENT_HEADERS,
  TRACKER_HEADERS,
  TRACKER_UPDATE_HEADERS,
  TRACKER_TASK_HEADERS,
  TRACKER_TASK_UPDATE_HEADERS,
  TRACKER_LEGACY_HEADERS,
  EMAIL_SCHEDULER_HEADERS,
} from "../config.js";

import {
  getSpreadsheet_,
  getSheet_,
  getOrCreateSheet_,
  readTable_,
  ensureHeaders_,
  appendObjectRow_,
  setObjectRowValues_,
} from "../sheets/adapter.js";

import {
  randomUUID,
  formatDate,
  getTimeZone,
  getActiveUserEmail,
  getPortalUrl,
  getScriptProperty,
  getScriptLock,
  installPortalSchedulerTrigger,
  removePortalSchedulerTrigger,
} from "../gas-compat.js";

import { sendEmail, getRemainingDailyQuota, getDefaultFromName } from "../mail.js";

`;

const footer = `
export {
  ${PUBLIC_EXPORTS.join(",\n  ")},
};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, header + code + footer, "utf8");

console.log(`Built ${outPath} (${PUBLIC_EXPORTS.length} exports)`);
