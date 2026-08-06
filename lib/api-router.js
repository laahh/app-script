import * as portal from "./portal/index.js";

const ROUTES = {
  "GET /init": () => portal.getInit(),

  "POST /dashboard/overview": (body) => portal.getDashboardOverview(body),

  "GET /leave/history": (body, query) =>
    portal.getEmployeeLeaveHistory(query.empId, query.year),

  "POST /leave/check-overlap": (body) => portal.checkLeaveOverlap(body),
  "POST /leave/create": (body) => portal.createLeaveRequest(body),

  "POST /calendar/range": (body) => portal.getCalendarRange(body),

  "POST /events/create": (body) => portal.createEvent(body),
  "POST /events/update": (body) => portal.updateEvent(body),
  "POST /events/readiness": (body) => portal.updateEventReadiness(body),
  "POST /events/maker-data": (body) => portal.getEventMakerData(body),

  "GET /events/checkin-info": (body, query) =>
    portal.getEventCheckinInfo(query.eventId),
  "POST /events/checkin": (body) => portal.submitEventCheckin(body),
  "GET /events/attendance": (body, query) =>
    portal.getEventAttendanceSummary(query.eventId),

  "GET /events/minutes": (body, query) => portal.getEventMinutes(query.eventId),
  "POST /events/minutes": (body) => portal.saveEventMinutes(body),
  "POST /events/action-items/add": (body) => portal.addEventActionItem(body),
  "POST /events/action-items/status": (body) =>
    portal.updateEventActionItemStatus(body),

  "POST /tracker/create": (body) => portal.createTracker(body),
  "POST /tracker/update-details": (body) => portal.updateTrackerDetails(body),
  "POST /tracker/data": (body) => portal.getTrackerData(body),
  "POST /tracker/update-subtask": (body) => portal.updateTrackerSubTask(body),
  "POST /tracker/update": (body) => portal.updateTracker(body),

  "GET /tracker/subtask-log": (body, query) =>
    portal.getTrackerSubTaskUpdateLog(query.subTaskId),
  "GET /tracker/log": (body, query) =>
    portal.getTrackerUpdateLog(query.trackerId),

  "GET /admin/email-settings": () => portal.getEmailSchedulerSettings(),
  "POST /admin/email-settings": (body) => portal.saveEmailSchedulerSettings(body),
  "POST /admin/email-send": () => portal.sendSchedulerEmailNow(),
  "POST /admin/email-test": () => portal.sendSchedulerTestEmail(),
  "POST /admin/overdue-reminder-send": () => portal.sendOverdueReminderNow(),
  "POST /admin/hse-sync-now": () => portal.syncHseEmployeesNow(),
  "POST /admin/install-cron": () => portal.installPortalSchedulerTrigger(),
  "POST /admin/remove-cron": () => portal.removePortalSchedulerTrigger(),
};

export function parsePath(url) {
  const path = (url || "").split("?")[0].replace(/^\/api\/?/, "").replace(/\/$/, "");
  return path || "init";
}

export function buildRouteKey(method, path) {
  return `${(method || "GET").toUpperCase()} /${path}`;
}

export async function handleApiRequest(method, path, body, query) {
  const routeKey = buildRouteKey(method, path);
  const handler = ROUTES[routeKey];

  if (!handler) {
    const err = new Error(`Route tidak ditemukan: ${routeKey}`);
    err.status = 404;
    throw err;
  }

  return await handler(body || {}, query || {});
}

export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export async function vercelHandler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, "http://localhost");
    const query = Object.fromEntries(url.searchParams.entries());

    // Di Vercel, request /api/* di-rewrite ke /api/handler?apiPath=... supaya
    // path bersegmen banyak (mis. dashboard/overview) tetap diteruskan --
    // catch-all filename ([...path].js) cuma menangkap 1 segmen di luar Next.js.
    const path = query.apiPath !== undefined ? query.apiPath : parsePath(req.url);
    delete query.apiPath;

    const body =
      req.method === "POST" || req.method === "PUT"
        ? await readJsonBody(req)
        : {};

    const data = await handleApiRequest(req.method, path, body, query);
    sendJson(res, 200, data);
  } catch (err) {
    const status = err.status || 500;
    sendJson(res, status, { error: err.message || "Internal Server Error" });
  }
}
