import { google } from "googleapis";
import { SPREADSHEET_ID } from "../config.js";

let sheetsClient = null;
const sheetTitleCache = new Map();

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Google credentials belum dikonfigurasi. Set GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_PRIVATE_KEY."
    );
  }

  return new google.auth.JWT(email, null, key, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
}

export function getSheetsApi() {
  if (!sheetsClient) {
    sheetsClient = google.sheets({ version: "v4", auth: getAuth() });
  }
  return sheetsClient;
}

async function listSheetTitles() {
  if (sheetTitleCache.has(SPREADSHEET_ID)) {
    return sheetTitleCache.get(SPREADSHEET_ID);
  }

  const api = getSheetsApi();
  const res = await api.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties.title",
  });

  const titles = (res.data.sheets || []).map((s) => s.properties.title);
  sheetTitleCache.set(SPREADSHEET_ID, titles);
  return titles;
}

async function fetchAllValues(sheetName) {
  const api = getSheetsApi();
  try {
    const res = await api.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName.replace(/'/g, "''")}'`,
    });
    return res.data.values || [];
  } catch (err) {
    if (err.code === 404 || err.message?.includes("Unable to parse range")) {
      return null;
    }
    throw err;
  }
}

function colLetter(n) {
  let s = "";
  let num = n;
  while (num > 0) {
    const mod = (num - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

class SheetRange {
  constructor(sheetName, r1, c1, r2, c2) {
    this.sheetName = sheetName;
    this.r1 = r1;
    this.c1 = c1;
    this.r2 = r2;
    this.c2 = c2;
    this._values = null;
  }

  async _load() {
    if (this._values !== null) return this._values;

    const all = await fetchAllValues(this.sheetName);
    if (!all) {
      this._values = [];
      return this._values;
    }

    const rows = [];
    for (let r = this.r1; r <= this.r2; r++) {
      const row = all[r - 1] || [];
      const slice = [];
      for (let c = this.c1; c <= this.c2; c++) {
        slice.push(row[c - 1] ?? "");
      }
      rows.push(slice);
    }
    this._values = rows;
    return this._values;
  }

  async getValues() {
    return this._load();
  }

  async setValues(values) {
    const api = getSheetsApi();
    const range = `'${this.sheetName.replace(/'/g, "''")}'!${colLetter(this.c1)}${this.r1}:${colLetter(this.c2)}${this.r2}`;
    await api.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    this._values = values;
  }

  async setValue(value) {
    await this.setValues([[value]]);
  }

  async clearContent() {
    const api = getSheetsApi();
    const range = `'${this.sheetName.replace(/'/g, "''")}'!${colLetter(this.c1)}${this.r1}:${colLetter(this.c2)}${this.r2}`;
    await api.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    this._values = null;
  }
}

export class SheetHandle {
  constructor(name) {
    this.name = name;
    this._valuesCache = null;
  }

  async _getAllValues() {
    if (this._valuesCache !== null) return this._valuesCache;
    const values = await fetchAllValues(this.name);
    this._valuesCache = values || [];
    return this._valuesCache;
  }

  invalidateCache() {
    this._valuesCache = null;
  }

  getDataRange() {
    const self = this;
    return {
      async getValues() {
        return self._getAllValues();
      },
    };
  }

  async getLastRow() {
    const values = await this._getAllValues();
    return values.length;
  }

  async getLastColumn() {
    const values = await this._getAllValues();
    if (!values.length) return 1;
    return Math.max(...values.map((row) => row.length), 1);
  }

  getRange(r1, c1, r2, c2) {
    if (arguments.length === 4) {
      return new SheetRange(this.name, r1, c1, r2, c2);
    }
    const row = r1;
    const col = c1;
    return new SheetRange(this.name, row, col, row, col);
  }
}

export async function getSpreadsheet_() {
  const titles = await listSheetTitles();
  return {
    async getSheetByName(name) {
      if (!titles.includes(name)) return null;
      return new SheetHandle(name);
    },
  };
}

export async function getSheet_(name) {
  const spreadsheet = await getSpreadsheet_();
  const sheet = await spreadsheet.getSheetByName(name);
  if (!sheet) {
    throw new Error(`Sheet "${name}" tidak ditemukan.`);
  }
  return sheet;
}

export async function getOrCreateSheet_(name, headers) {
  const titles = await listSheetTitles();

  if (!titles.includes(name)) {
    const api = getSheetsApi();
    await api.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: name } } }],
      },
    });
    sheetTitleCache.delete(SPREADSHEET_ID);
  }

  const sheet = new SheetHandle(name);
  await ensureHeaders_(sheet, headers || []);
  return sheet;
}

export async function readTable_(sheet) {
  const dataRange = sheet.getDataRange();
  const values = await dataRange.getValues();

  if (!values || !values.length) {
    return { head: [], rows: [] };
  }

  return {
    head: values[0].map((value) => String(value || "").trim()),
    rows: values.length > 1 ? values.slice(1) : [],
  };
}

export async function ensureHeaders_(sheet, headers) {
  if (!headers.length) return;

  const lastColumn = Math.max(await sheet.getLastColumn(), 1);
  const headerRange = sheet.getRange(1, 1, 1, lastColumn);
  const existingHeaders = (await headerRange.getValues())[0].map((value) =>
    String(value || "").trim()
  );

  if (!existingHeaders.some(Boolean)) {
    await sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.invalidateCache();
    return;
  }

  const missingHeaders = headers.filter((header) => !existingHeaders.includes(header));
  if (!missingHeaders.length) return;

  const lastUsedHeaderColumn = existingHeaders.reduce(
    (last, value, index) => (value ? index + 1 : last),
    0
  );

  await sheet
    .getRange(1, lastUsedHeaderColumn + 1, 1, lastUsedHeaderColumn + missingHeaders.length)
    .setValues([missingHeaders]);
  sheet.invalidateCache();
}

export async function appendObjectRow_(sheet, requiredHeaders, rowObject) {
  await ensureHeaders_(sheet, requiredHeaders);

  const lastColumn = await sheet.getLastColumn();
  const headers = (await sheet.getRange(1, 1, 1, lastColumn).getValues())[0].map((value) =>
    String(value || "").trim()
  );

  const row = headers.map((header) =>
    Object.prototype.hasOwnProperty.call(rowObject, header) ? rowObject[header] : ""
  );

  const lastRow = await sheet.getLastRow();
  await sheet.getRange(lastRow + 1, 1, lastRow + 1, row.length).setValues([row]);
  sheet.invalidateCache();
}

export async function setObjectRowValues_(sheet, rowNumber, rowObject) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error("Nomor baris data tidak valid.");
  }

  await ensureHeaders_(sheet, Object.keys(rowObject || {}));

  const lastColumn = await sheet.getLastColumn();
  const headers = (await sheet.getRange(1, 1, 1, lastColumn).getValues())[0].map((value) =>
    String(value || "").trim()
  );

  for (const header of Object.keys(rowObject || {})) {
    const columnIndex = headers.indexOf(header);
    if (columnIndex >= 0) {
      await sheet.getRange(rowNumber, columnIndex + 1).setValue(rowObject[header]);
    }
  }
  sheet.invalidateCache();
}

export async function replaceSheetDataRows_(sheet, headers, rowObjects) {
  await ensureHeaders_(sheet, headers);

  const list = rowObjects || [];
  const lastRow = await sheet.getLastRow();
  const lastColumn = Math.max(await sheet.getLastColumn(), headers.length);

  if (list.length) {
    const values = list.map((rowObject) =>
      headers.map((header) =>
        Object.prototype.hasOwnProperty.call(rowObject, header) ? rowObject[header] : ""
      )
    );

    // getRange(r1, c1, r2, c2) di adapter ini pakai baris/kolom akhir (bukan
    // jumlah baris/kolom seperti Range.getRange bawaan Apps Script), jadi
    // baris akhir = baris awal (2) + jumlah baris - 1.
    await sheet.getRange(2, 1, values.length + 1, headers.length).setValues(values);
  }

  const staleRowCount = lastRow - (list.length + 1);

  if (staleRowCount > 0) {
    await sheet.getRange(list.length + 2, 1, lastRow, lastColumn).clearContent();
  }

  sheet.invalidateCache();
}

export async function writeSchedulerRow_(sheet, headers, row) {
  await ensureHeaders_(sheet, headers);
  await sheet.getRange(2, 1, 2, row.length).setValues([row]);
  sheet.invalidateCache();
}
