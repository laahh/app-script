/**
 * Drop-in replacement for google.script.run (Google Apps Script Web App).
 * Load this before your Index.html scripts on Vercel.
 */
(function (global) {
  const API_BASE = (global.OHS_PORTAL_API_BASE || "/api").replace(/\/$/, "");

  function parseArgs(args) {
    const last = args[args.length - 1];
    const hasHandlers =
      args.length >= 2 &&
      typeof args[args.length - 2] === "function" &&
      typeof last === "function";

    if (hasHandlers) {
      return {
        fn: args[0],
        params: args.slice(1, -2),
        success: args[args.length - 2],
        failure: last,
      };
    }

    return {
      fn: args[0],
      params: args.slice(1),
      success: null,
      failure: null,
    };
  }

  const ROUTE_MAP = {
    getInit: { method: "GET", path: "init" },
    getEmployeeSearchResults: { method: "GET", path: "employees/search" },
    getDashboardOverview: { method: "POST", path: "dashboard/overview" },
    getEmployeeLeaveHistory: { method: "GET", path: "leave/history" },
    checkLeaveOverlap: { method: "POST", path: "leave/check-overlap" },
    createLeaveRequest: { method: "POST", path: "leave/create" },
    getCalendarRange: { method: "POST", path: "calendar/range" },
    createEvent: { method: "POST", path: "events/create" },
    updateEvent: { method: "POST", path: "events/update" },
    updateEventReadiness: { method: "POST", path: "events/readiness" },
    getEventMakerData: { method: "POST", path: "events/maker-data" },
    getEventAttendanceSummary: { method: "GET", path: "events/attendance" },
    getEventMinutes: { method: "GET", path: "events/minutes" },
    saveEventMinutes: { method: "POST", path: "events/minutes" },
    addEventActionItem: { method: "POST", path: "events/action-items/add" },
    updateEventActionItemStatus: { method: "POST", path: "events/action-items/status" },
    createTracker: { method: "POST", path: "tracker/create" },
    updateTrackerDetails: { method: "POST", path: "tracker/update-details" },
    getTrackerData: { method: "POST", path: "tracker/data" },
    updateTrackerSubTask: { method: "POST", path: "tracker/update-subtask" },
    updateTracker: { method: "POST", path: "tracker/update" },
    getTrackerSubTaskUpdateLog: { method: "GET", path: "tracker/subtask-log" },
    getTrackerUpdateLog: { method: "GET", path: "tracker/log" },
    getEmailSchedulerSettings: { method: "GET", path: "admin/email-settings" },
    saveEmailSchedulerSettings: { method: "POST", path: "admin/email-settings" },
    sendSchedulerEmailNow: { method: "POST", path: "admin/email-send" },
    sendSchedulerTestEmail: { method: "POST", path: "admin/email-test" },
    installPortalSchedulerTrigger: { method: "POST", path: "admin/install-cron" },
    removePortalSchedulerTrigger: { method: "POST", path: "admin/remove-cron" },
  };

  function buildUrl(route, params) {
    const url = new URL(API_BASE + "/" + route.path, global.location.origin);

    if (route.method === "GET" && params.length) {
      const first = params[0];
      if (route.path === "leave/history" && (typeof first === "string" || typeof first === "number")) {
        url.searchParams.set("empId", first);
        if (params[1] !== undefined) url.searchParams.set("year", params[1]);
      } else if (route.path === "tracker/subtask-log") {
        url.searchParams.set("subTaskId", typeof first === "object" ? first.subTaskId || first : first);
      } else if (route.path === "tracker/log") {
        url.searchParams.set("trackerId", typeof first === "object" ? first.trackerId || first : first);
      } else if (route.path === "events/attendance" || route.path === "events/minutes") {
        url.searchParams.set("eventId", typeof first === "object" ? first.eventId || first : first);
      } else if (route.path === "employees/search") {
        if (typeof first === "object" && first) {
          if (first.query !== undefined) url.searchParams.set("q", first.query);
          if (first.limit !== undefined) url.searchParams.set("limit", first.limit);
        } else {
          url.searchParams.set("q", first);
        }
      }
    }

    return url.toString();
  }

  async function invoke(fnName, params) {
    const route = ROUTE_MAP[fnName];
    if (!route) {
      throw new Error("API tidak dikenal: " + fnName);
    }

    const url = buildUrl(route, params);
    const options = {
      method: route.method,
      headers: { "Content-Type": "application/json" },
    };

    if (route.method === "POST") {
      const payload = params[0];
      options.body = JSON.stringify(payload === undefined ? {} : payload);
    }

    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || res.statusText || "Request failed");
    }
    return data;
  }

  const runner = {
    withSuccessHandler(success) {
      this._success = success;
      return this;
    },
    withFailureHandler(failure) {
      this._failure = failure;
      return this;
    },
  };

  const handlerNames = Object.keys(ROUTE_MAP);
  handlerNames.forEach(function (fnName) {
    runner[fnName] = function () {
      const args = Array.prototype.slice.call(arguments);
      const parsed = parseArgs([fnName].concat(args));
      const success = parsed.success || this._success;
      const failure = parsed.failure || this._failure;

      invoke(fnName, parsed.params)
        .then(function (result) {
          if (success) success(result);
        })
        .catch(function (err) {
          if (failure) failure(err);
          else console.error(err);
        });

      return this;
    };
  });

  global.google = global.google || {};
  global.google.script = global.google.script || {};
  global.google.script.run = runner;

  global.OhsPortalApi = {
    invoke: invoke,
    routes: ROUTE_MAP,
  };
})(window);
