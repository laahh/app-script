/** =========================================================
 * OHS Roster, Leave & Event Portal
 * Google Apps Script Backend
 * ========================================================= */

const SPREADSHEET_ID = "13VLFWZBftawE2cO20t-AIzM_cC3hGDuJc5qGifXMj7o";

const SHEET_EMPLOYEES = "Employees";
const SHEET_LEAVE_TYPES = "LeaveTypes";
const SHEET_LEAVE_REQUESTS = "LeaveRequests";
const SHEET_HOLIDAYS = "Holidays";
const SHEET_EVENTS = "Events";
const SHEET_TRACKERS = "ProjectIssueTracker";
const SHEET_TRACKER_UPDATES = "ProjectIssueUpdateLog"; // legacy parent update log
const SHEET_TRACKER_TASKS = "ProjectIssueSubTasks";
const SHEET_TRACKER_TASK_UPDATES = "ProjectIssueSubTaskUpdateLog";
const SHEET_EMAIL_SCHEDULER = "EmailSchedulerSettings";

const LEAVE_HEADERS = [
  "Timestamp",
  "RequestId",
  "EmpId",
  "EmpName",
  "Team",
  "Position",
  "LeaveType",
  "StartDate",
  "EndDate",
  "StartTime",
  "EndTime",
  "Note",
  "BackupEmpId",
  "BackupEmpName",
  "BackupTeam",
  "BackupPosition",
  "SiteDedicated",
  "BackupSiteDedicated"
];

const EVENT_HEADERS = [
  "Timestamp",
  "EventId",
  "EventName",
  "Description",
  "Where",
  "ReadinessUpdate",
  "ReadinessUpdatedAt",
  "PICEmpId",
  "PICName",
  "PICTeam",
  "PICPosition",
  "PICSiteDedicated",
  "EventDate"
];

const TRACKER_HEADERS = [
  "Timestamp",
  "TrackerId",
  "TrackerType",
  "ProjectIssueName",
  "Department",
  "ProjectLeaderEmpId",
  "ProjectLeaderName",
  "ProjectLeaderTeam",
  "ProjectLeaderPosition",
  "ProjectLeaderSiteDedicated",
  "Site",
  "DescriptionProject",
  "BackgroundProject",
  "ImpactProject",
  "StartDate",
  "DueDate",
  "SuccessIndicator",
  "CurrentPercentComplete",
  "CurrentProgressReportWeekly",
  "CurrentRemarks",
  "Status",
  "LastUpdated"
];

const TRACKER_UPDATE_HEADERS = [
  "Timestamp",
  "UpdateId",
  "TrackerId",
  "PercentComplete",
  "ProgressReportWeekly",
  "Remarks",
  "Status",
  "UpdatedByEmpId",
  "UpdatedByName",
  "UpdatedByTeam",
  "UpdatedByPosition",
  "UpdatedBySiteDedicated"
];

const TRACKER_TASK_HEADERS = [
  "Timestamp",
  "SubTaskId",
  "TrackerId",
  "SubTaskName",
  "Department",
  "PICEmpId",
  "PICName",
  "PICTeam",
  "PICPosition",
  "PICSiteDedicated",
  "Site",
  "DescriptionSubTask",
  "StartDate",
  "DueDate",
  "SuccessIndicator",
  "CurrentPercentComplete",
  "CurrentProgressReportWeekly",
  "CurrentRemarks",
  "Status",
  "LastUpdated"
];

const TRACKER_TASK_UPDATE_HEADERS = [
  "Timestamp",
  "UpdateId",
  "TrackerId",
  "SubTaskId",
  "PercentComplete",
  "ProgressReportWeekly",
  "Remarks",
  "Status",
  "UpdatedByEmpId",
  "UpdatedByName",
  "UpdatedByTeam",
  "UpdatedByPosition",
  "UpdatedBySiteDedicated"
];

const TRACKER_LEGACY_HEADERS = [
  "Title",
  "Description",
  "PICEmpId",
  "PICName",
  "PICTeam",
  "PICPosition",
  "PICSiteDedicated",
  "ProgressUpdate",
  "OwnerEmpId",
  "OwnerName",
  "OwnerTeam",
  "OwnerPosition",
  "OwnerSiteDedicated"
];

const EMAIL_SCHEDULER_HEADERS = [
  "Enabled",
  "Frequency",
  "ScheduleDays",
  "SendHour",
  "SendMinute",
  "Recipients",
  "Cc",
  "Bcc",
  "PortalUrl",
  "OverviewTeam",
  "OverviewSite",
  "IncludeLeaveSummary",
  "IncludeTrackerSummary",
  "IncludeLeaderboard",
  "SubjectPrefix",
  "LastScheduledKey",
  "LastRunAt",
  "LastRunStatus",
  "LastEmailCount",
  "UpdatedAt",
  "UpdatedBy",
  "EventReminderDays",
  "IncludePreviousDays",
  "OverdueReminderLastKey",
  "OverdueReminderLastRunAt",
  "OverdueReminderLastCount",
  "HseSyncLastKey",
  "HseSyncLastRunAt",
  "HseSyncLastCount"
];

// Reminder H-3 sampai H-0 sebelum DueDate Project/Issue/Sub Task, dikirim
// setiap hari jam OVERDUE_REMINDER_HOUR:OVERDUE_REMINDER_MINUTE ke daftar tetap ini.
const OVERDUE_REMINDER_RECIPIENTS = [
  "christine@beraucoal.co.id",
  "paian.siregar@beraucoal.co.id",
  "yadi.haryadi@beraucoal.co.id",
  "oscar.whimmy@beraucoal.co.id",
  "yudi@beraucoal.co.id",
  "davi.tantra@beraucoalenergy.co.id",
  "sepriyanto@beraucoal.co.id",
  "dhehave@beraucoal.co.id",
  "budiansyah@beraucoal.co.id",
  "m.firmansyah@beraucoal.co.id",
  "indra.nur@beraucoal.co.id",
  "rahmantha.anggana@beraucoal.co.id",
  "jimmi.idris@beraucoal.co.id"
];

const OVERDUE_REMINDER_WINDOW_DAYS = 3;
const OVERDUE_REMINDER_HOUR = 8;
const OVERDUE_REMINDER_MINUTE = 0;

// Sinkronisasi data karyawan dari API HSE (sekali seminggu, hari & jam
// harus jatuh pada window cron harian yang sama -- lihat vercel.json).
// Kredensial (HSE_API_KEY dkk) dibaca dari Script Properties / env var,
// TIDAK di-hardcode di sini.
const HSE_SYNC_DAY_OF_WEEK = 1; // 1 = Senin (Date.getDay())
const HSE_SYNC_HOUR = 8;
const HSE_SYNC_MINUTE = 0;
const HSE_API_DEFAULT_BASE = "https://hseautomation.beraucoal.co.id";
const HSE_API_DEFAULT_COMPANY_ID = "5194";

// Sheet Employees sekarang puluhan ribu baris -- batasi ukuran leaderboard
// yang dikirim ke dashboard supaya payload tidak ikut membengkak.
const DASHBOARD_LEADERBOARD_LIMIT = 200;

const EMPLOYEE_SYNC_HEADERS = [
  "EmpId",
  "SID",
  "EmpName",
  "Position",
  "Team",
  "SiteDedicated",
  "Company",
  "PhotoUrl"
];

// Absensi online (QR check-in) & Notulensi per Event.
const SHEET_EVENT_ATTENDANCE = "EventAttendance";
const SHEET_EVENT_MINUTES = "EventMinutes";
const SHEET_EVENT_ACTION_ITEMS = "EventActionItems";

const EVENT_ATTENDANCE_HEADERS = [
  "Timestamp",
  "AttendanceId",
  "EventId",
  "EmpId",
  "EmpName",
  "Team",
  "Position",
  "SiteDedicated",
  "CheckInAt"
];

const EVENT_MINUTES_HEADERS = [
  "Timestamp",
  "EventId",
  "Summary",
  "UpdatedAt",
  "UpdatedByEmpId",
  "UpdatedByName"
];

const EVENT_ACTION_ITEM_HEADERS = [
  "Timestamp",
  "ActionItemId",
  "EventId",
  "Task",
  "PICEmpId",
  "PICName",
  "DueDate",
  "Status"
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("OHS Roster, Leave & Event Portal")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* =========================================================
 * PUBLIC API
 * ========================================================= */

function getInit() {
  const employees = getEmployees_();
  const leaveTypes = getLeaveTypes_();
  const currentYear = new Date().getFullYear();

  return {
    employeeCount: employees.length,
    leaveTypes: leaveTypes,
    teams: uniqueSorted_(employees.map(function (employee) {
      return employee.Team;
    })),
    sites: uniqueSorted_(employees.map(function (employee) {
      return employee.SiteDedicated;
    })),
    years: getAvailableOverviewYears_(),
    currentYear: currentYear,
    holidays: getHolidaysMap_(),
    todayISO: formatISO_(startOfDay_(new Date()))
  };
}

/**
 * Dashboard overview.
 * Definisi minggu: Senin sampai Minggu.
 */
function getDashboardOverview(request) {
  request = request || {};

  const team = String(request.team || "All Teams").trim();
  const site = String(request.site || "All Sites").trim();

  const actualToday = startOfDay_(new Date());
  const actualYear = actualToday.getFullYear();
  const requestedYear = Number(request.year);
  const year = Number.isFinite(requestedYear) && requestedYear >= 2000 && requestedYear <= 2200
    ? Math.floor(requestedYear)
    : actualYear;

  const referenceDate = buildReferenceDateForYear_(actualToday, year);
  const todayISO = formatISO_(actualToday);

  const thisWeekStart = startOfWeekMonday_(referenceDate);
  const thisWeekEnd = addDays_(thisWeekStart, 6);
  const nextWeekStart = addDays_(thisWeekStart, 7);
  const nextWeekEnd = addDays_(thisWeekStart, 13);
  const nextTwoWeekStart = addDays_(thisWeekStart, 14);
  const nextTwoWeekEnd = addDays_(thisWeekStart, 20);

  const periods = {
    thisWeekStart: formatISO_(thisWeekStart),
    thisWeekEnd: formatISO_(thisWeekEnd),
    nextWeekStart: formatISO_(nextWeekStart),
    nextWeekEnd: formatISO_(nextWeekEnd),
    nextTwoWeekStart: formatISO_(nextTwoWeekStart),
    nextTwoWeekEnd: formatISO_(nextTwoWeekEnd)
  };

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  yearStart.setHours(0, 0, 0, 0);
  yearEnd.setHours(0, 0, 0, 0);

  const yearStartISO = formatISO_(yearStart);
  const yearEndISO = formatISO_(yearEnd);

  let ytdCutoff;
  if (year < actualYear) {
    ytdCutoff = yearEnd;
  } else if (year === actualYear) {
    ytdCutoff = actualToday;
  } else {
    ytdCutoff = addDays_(yearStart, -1);
  }

  const holidays = getHolidaysMap_();
  const totalWorkingDaysYTD = ytdCutoff.getTime() >= yearStart.getTime()
    ? countWorkingDaysInclusive_(yearStart, ytdCutoff, holidays)
    : 0;
  const allEmployees = getEmployees_();
  const employeeMap = objectBy_(allEmployees, "EmpId");

  let employees = allEmployees.slice();

  if (team !== "All Teams") {
    employees = employees.filter(function (employee) {
      return employee.Team === team;
    });
  }

  if (site !== "All Sites") {
    employees = employees.filter(function (employee) {
      return employee.SiteDedicated === site;
    });
  }

  const employeeSet = new Set(employees.map(function (employee) {
    return String(employee.EmpId);
  }));

  const leaves = getLeaveRequests_()
    .filter(function (leave) {
      return employeeSet.has(String(leave.EmpId));
    })
    .filter(function (leave) {
      return isDateRangeOverlap_(
        leave.StartDate,
        leave.EndDate,
        yearStartISO,
        yearEndISO
      );
    })
    .map(function (leave) {
      return enrichLeave_(leave, employeeMap);
    });

  const leaveThisWeek = leaves
    .filter(function (leave) {
      return isDateRangeOverlap_(
        leave.StartDate,
        leave.EndDate,
        periods.thisWeekStart,
        periods.thisWeekEnd
      );
    })
    .sort(sortLeaveByDate_);

  const upcomingLeave = leaves
    .filter(function (leave) {
      return String(leave.StartDate || "") > periods.thisWeekEnd;
    })
    .sort(sortLeaveByDate_);

  let events = getEvents_()
    .filter(function (event) {
      return String(event.EventDate || "") >= yearStartISO &&
        String(event.EventDate || "") <= yearEndISO;
    })
    .map(function (event) {
      return enrichEvent_(event, employeeMap);
    });

  if (team !== "All Teams") {
    events = events.filter(function (event) {
      return event.PICTeam === team;
    });
  }

  if (site !== "All Sites") {
    events = events.filter(function (event) {
      return event.PICSiteDedicated === site;
    });
  }

  const eventsThisWeek = events
    .filter(function (event) {
      return isISODateInRange_(
        event.EventDate,
        periods.thisWeekStart,
        periods.thisWeekEnd
      );
    })
    .sort(sortEventByDate_);

  const nextWeekEvents = events
    .filter(function (event) {
      return isISODateInRange_(
        event.EventDate,
        periods.nextWeekStart,
        periods.nextWeekEnd
      );
    })
    .sort(sortEventByDate_);

  const nextTwoWeekEvents = events
    .filter(function (event) {
      return isISODateInRange_(
        event.EventDate,
        periods.nextTwoWeekStart,
        periods.nextTwoWeekEnd
      );
    })
    .sort(sortEventByDate_);

  const moreThanTwoWeeksEvents = events
    .filter(function (event) {
      return String(event.EventDate || "") > periods.nextTwoWeekEnd;
    })
    .sort(sortEventByDate_);

  const ytdByEmployee = {};
  employees.forEach(function (employee) {
    ytdByEmployee[String(employee.EmpId)] = 0;
  });

  leaves.forEach(function (leave) {
    const startDate = parseISO_(leave.StartDate);
    const endDate = parseISO_(leave.EndDate);

    if (!startDate || !endDate) {
      return;
    }

    const clippedStart = new Date(Math.max(
      startDate.getTime(),
      yearStart.getTime()
    ));

    const clippedEnd = new Date(Math.min(
      endDate.getTime(),
      ytdCutoff.getTime()
    ));

    clippedStart.setHours(0, 0, 0, 0);
    clippedEnd.setHours(0, 0, 0, 0);

    if (clippedEnd.getTime() < clippedStart.getTime()) {
      return;
    }

    const employeeId = String(leave.EmpId);
    ytdByEmployee[employeeId] =
      Number(ytdByEmployee[employeeId] || 0) +
      countWorkingDaysInclusive_(clippedStart, clippedEnd, holidays);
  });

  const leaderboard = employees
    .map(function (employee) {
      const leaveDays = Number(ytdByEmployee[String(employee.EmpId)] || 0);
      const effectiveWorkingDays = Math.max(0, totalWorkingDaysYTD - leaveDays);
      const effectiveWorkingPercent = totalWorkingDaysYTD > 0
        ? Math.round((effectiveWorkingDays / totalWorkingDaysYTD) * 1000) / 10
        : 0;

      return {
        EmpId: employee.EmpId,
        EmpName: employee.EmpName,
        Position: employee.Position,
        Team: employee.Team,
        SiteDedicated: employee.SiteDedicated,
        PhotoUrl: employee.PhotoUrl,
        LeaveYTD: leaveDays,
        LeaveDaysYTD: leaveDays,
        TotalWorkingDaysYTD: totalWorkingDaysYTD,
        EffectiveWorkingDays: effectiveWorkingDays,
        EffectiveWorkingPercent: effectiveWorkingPercent
      };
    })
    .sort(function (a, b) {
      return (
        b.LeaveYTD - a.LeaveYTD ||
        String(a.EmpName || "").localeCompare(String(b.EmpName || ""))
      );
    });

  let trackers = getTrackersWithSubTasks_(employeeMap)
    .filter(function (tracker) {
      return trackerOverlapsYear_(tracker, yearStartISO, yearEndISO);
    });

  if (team !== "All Teams") {
    trackers = trackers.filter(function (tracker) {
      return tracker.Department === team;
    });
  }

  if (site !== "All Sites") {
    trackers = trackers.filter(function (tracker) {
      return tracker.Site === site;
    });
  }

  const trackerCounts = {
    onGoing: trackers.filter(function (tracker) {
      return tracker.EffectiveStatus === "On Going";
    }).length,
    overdue: trackers.filter(function (tracker) {
      return tracker.EffectiveStatus === "Overdue";
    }).length,
    closed: trackers.filter(function (tracker) {
      return tracker.EffectiveStatus === "Closed";
    }).length,
    activeProjects: trackers.filter(function (tracker) {
      return String(tracker.TrackerType || "").toLowerCase() === "project" &&
        tracker.EffectiveStatus !== "Closed";
    }).length,
    activeIssues: trackers.filter(function (tracker) {
      return String(tracker.TrackerType || "").toLowerCase() === "issue" &&
        tracker.EffectiveStatus !== "Closed";
    }).length
  };

  // Seluruh Project dan Issue dalam scope tahun/filter dikirim ke dashboard.
  // Pagination 10 item per halaman dilakukan di sisi Index.html setelah
  // individual column filtering dan column ordering diterapkan.
  const trackerHighlights = trackers
    .slice()
    .sort(sortTracker_);

  const totalPersonWorkingDays = totalWorkingDaysYTD * employees.length;
  const totalLeavePersonDays = leaderboard.reduce(function (total, item) {
    return total + Number(item.LeaveDaysYTD || 0);
  }, 0);
  const totalEffectivePersonDays = Math.max(0, totalPersonWorkingDays - totalLeavePersonDays);
  const workforceEffectivePercent = totalPersonWorkingDays > 0
    ? Math.round((totalEffectivePersonDays / totalPersonWorkingDays) * 1000) / 10
    : 0;

  // Sheet Employees sekarang puluhan ribu baris -- jangan kirim seluruh
  // leaderboard ke client, cukup yang paling relevan (leave terbanyak).
  // Agregat di atas (workforceEffectiveness) tetap dihitung dari SEMUA
  // employee sebelum di-potong di sini.
  const leaderboardForResponse = leaderboard.slice(0, DASHBOARD_LEADERBOARD_LIMIT);

  return {
    todayISO: todayISO,
    referenceDateISO: formatISO_(referenceDate),
    year: year,
    periods: periods,
    counts: {
      eventsThisWeek: eventsThisWeek.length,
      upcomingEvents:
        nextWeekEvents.length +
        nextTwoWeekEvents.length +
        moreThanTwoWeeksEvents.length,
      leaveThisWeek: leaveThisWeek.length,
      upcomingLeave: upcomingLeave.length,
      nextWeekEvents: nextWeekEvents.length,
      nextTwoWeekEvents: nextTwoWeekEvents.length,
      moreThanTwoWeeksEvents: moreThanTwoWeeksEvents.length,
      activeProjects: trackerCounts.activeProjects,
      activeIssues: trackerCounts.activeIssues
    },
    eventsThisWeek: eventsThisWeek,
    nextWeekEvents: nextWeekEvents,
    nextTwoWeekEvents: nextTwoWeekEvents,
    moreThanTwoWeeksEvents: moreThanTwoWeeksEvents,
    leaveThisWeek: leaveThisWeek,
    upcomingLeave: upcomingLeave.slice(0, 30),
    leaderboard: leaderboardForResponse,
    leaderboardTotalCount: leaderboard.length,
    workforceEffectiveness: {
      employeeCount: employees.length,
      totalWorkingDaysPerEmployee: totalWorkingDaysYTD,
      totalPersonWorkingDays: totalPersonWorkingDays,
      leavePersonDays: totalLeavePersonDays,
      effectivePersonDays: totalEffectivePersonDays,
      effectiveWorkingPercent: workforceEffectivePercent
    },
    trackerCounts: trackerCounts,
    trackerHighlights: trackerHighlights
  };
}

/**
 * Riwayat leave employee untuk modal leaderboard.
 * WorkingDays mengurangi Sabtu, Minggu, dan sheet Holidays.
 */
function getEmployeeLeaveHistory(employeeId, selectedYear) {
  const empId = String(employeeId || "").trim();

  if (!empId) {
    throw new Error("Employee ID wajib diisi.");
  }

  const employees = getEmployees_();
  const employeeMap = objectBy_(employees, "EmpId");
  const employee = employeeMap[empId];

  if (!employee) {
    throw new Error("Employee tidak ditemukan.");
  }

  const holidays = getHolidaysMap_();
  const today = startOfDay_(new Date());
  const requestedYear = Number(selectedYear);
  const historyYear = Number.isFinite(requestedYear) && requestedYear >= 2000 && requestedYear <= 2200
    ? Math.floor(requestedYear)
    : today.getFullYear();
  const yearStart = new Date(historyYear, 0, 1);
  const yearEnd = new Date(historyYear, 11, 31);
  yearStart.setHours(0, 0, 0, 0);
  yearEnd.setHours(0, 0, 0, 0);

  let yearCutoff;
  if (historyYear < today.getFullYear()) {
    yearCutoff = yearEnd;
  } else if (historyYear === today.getFullYear()) {
    yearCutoff = today;
  } else {
    yearCutoff = addDays_(yearStart, -1);
  }

  const records = getLeaveRequests_()
    .filter(function (leave) {
      return String(leave.EmpId) === empId;
    })
    .map(function (leave) {
      const item = enrichLeave_(leave, employeeMap);
      const startDate = parseISO_(item.StartDate);
      const endDate = parseISO_(item.EndDate);
      let status = "Completed";

      if (startDate && startDate.getTime() > today.getTime()) {
        status = "Upcoming";
      } else if (
        startDate &&
        endDate &&
        startDate.getTime() <= today.getTime() &&
        endDate.getTime() >= today.getTime()
      ) {
        status = "On Leave";
      }

      item.LeaveDays =
        startDate && endDate
          ? countWorkingDaysInclusive_(startDate, endDate, holidays)
          : 0;

      // Backward compatibility for older HTML versions.
      item.WorkingDays = item.LeaveDays;
      item.Status = status;
      return item;
    })
    .sort(function (a, b) {
      return (
        String(b.StartDate || "").localeCompare(String(a.StartDate || "")) ||
        String(b.EndDate || "").localeCompare(String(a.EndDate || ""))
      );
    });

  let leaveDaysYTD = 0;

  records.forEach(function (record) {
    const startDate = parseISO_(record.StartDate);
    const endDate = parseISO_(record.EndDate);

    if (!startDate || !endDate) {
      return;
    }

    const clippedStart = new Date(Math.max(
      startDate.getTime(),
      yearStart.getTime()
    ));

    const clippedEnd = new Date(Math.min(
      endDate.getTime(),
      yearCutoff.getTime()
    ));

    clippedStart.setHours(0, 0, 0, 0);
    clippedEnd.setHours(0, 0, 0, 0);

    if (clippedEnd.getTime() >= clippedStart.getTime()) {
      leaveDaysYTD += countWorkingDaysInclusive_(
        clippedStart,
        clippedEnd,
        holidays
      );
    }
  });

  const totalWorkingDays = yearCutoff.getTime() >= yearStart.getTime()
    ? countWorkingDaysInclusive_(yearStart, yearCutoff, holidays)
    : 0;
  const effectiveWorkingDays = Math.max(0, totalWorkingDays - leaveDaysYTD);
  const effectiveWorkingPercent = totalWorkingDays > 0
    ? Math.round((effectiveWorkingDays / totalWorkingDays) * 1000) / 10
    : 0;

  return {
    employee: employee,
    records: records,
    totalRequests: records.length,
    totalWorkingDays: totalWorkingDays,
    totalLeaveDaysAllHistory: records.reduce(function (total, record) {
      return total + Number(record.LeaveDays || 0);
    }, 0),
    leaveDaysYTD: leaveDaysYTD,
    ytdWorkingDays: leaveDaysYTD,
    effectiveWorkingDays: effectiveWorkingDays,
    effectiveWorkingPercent: effectiveWorkingPercent,
    currentYear: historyYear
  };
}

/**
 * Membuat Project atau Issue baru.
 */
function createTracker(payload) {
  payload = payload || {};

  const trackerType = normalizeTrackerType_(payload.TrackerType);
  const projectIssueName = String(payload.ProjectIssueName || "").trim();
  const department = String(payload.Department || "").trim();
  const projectLeaderEmpId = String(payload.ProjectLeaderEmpId || "").trim();
  const site = String(payload.Site || "").trim();
  const descriptionProject = String(payload.DescriptionProject || "").trim();
  const backgroundProject = String(payload.BackgroundProject || "").trim();
  const impactProject = String(payload.ImpactProject || "").trim();
  const startISO = String(payload.StartDate || "").trim();
  const dueISO = String(payload.DueDate || "").trim();
  const successIndicator = String(payload.SuccessIndicator || "").trim();

  const parentPercentComplete = validatePercentComplete_(
    payload.PercentComplete === "" || payload.PercentComplete === null ||
    typeof payload.PercentComplete === "undefined"
      ? 0
      : payload.PercentComplete
  );
  const parentProgressReportWeekly =
    String(payload.ProgressReportWeekly || "").trim() || "Tracker dibuat.";
  const parentRemarks =
    String(payload.Remarks || "").trim() || "Belum ada catatan tambahan.";

  const rawSubTasks = (Array.isArray(payload.SubTasks) ? payload.SubTasks : [])
    .filter(function (task) {
      task = task || {};
      return [
        task.SubTaskName,
        task.PICEmpId,
        task.Site,
        task.DescriptionSubTask,
        task.StartDate,
        task.DueDate,
        task.SuccessIndicator,
        task.ProgressReportWeekly,
        task.Remarks
      ].some(function (value) {
        return String(value || "").trim() !== "";
      });
    });

  if (!trackerType) {
    throw new Error("Type wajib Project atau Issue.");
  }
  if (!projectIssueName) {
    throw new Error("Project Name / Issue Name wajib diisi.");
  }
  if (!department) {
    throw new Error("Department wajib dipilih.");
  }
  if (!projectLeaderEmpId) {
    throw new Error("Project Leader wajib dipilih.");
  }
  if (!site) {
    throw new Error("Site wajib dipilih.");
  }
  if (!descriptionProject) {
    throw new Error("Description Project wajib diisi.");
  }
  if (!backgroundProject) {
    throw new Error("Background Project wajib diisi.");
  }
  if (!impactProject) {
    throw new Error("Impact Project wajib diisi.");
  }
  if (!successIndicator) {
    throw new Error("Success Indicator wajib diisi.");
  }

  validateDateRange_(startISO, dueISO);

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const projectLeader = employeeMap[projectLeaderEmpId];

  if (!projectLeader) {
    throw new Error("Project Leader tidak ditemukan pada sheet Employees.");
  }

  const subTasks = rawSubTasks.map(function (rawTask, index) {
    rawTask = rawTask || {};

    const subTaskName = String(rawTask.SubTaskName || "").trim();
    const picEmpId = String(rawTask.PICEmpId || "").trim();
    const taskSite = String(rawTask.Site || "").trim();
    const descriptionSubTask = String(rawTask.DescriptionSubTask || "").trim();
    const taskStartISO = String(rawTask.StartDate || "").trim();
    const taskDueISO = String(rawTask.DueDate || "").trim();
    const taskSuccessIndicator = String(rawTask.SuccessIndicator || "").trim();
    const percentComplete = validatePercentComplete_(rawTask.PercentComplete);
    const progressReportWeekly = String(rawTask.ProgressReportWeekly || "").trim();
    const remarks = String(rawTask.Remarks || "").trim();
    const rowNumber = index + 1;

    if (!subTaskName) {
      throw new Error("Sub Task " + rowNumber + ": nama wajib diisi.");
    }
    if (!picEmpId) {
      throw new Error("Sub Task " + rowNumber + ": PIC wajib dipilih.");
    }
    if (!taskSite) {
      throw new Error("Sub Task " + rowNumber + ": Site wajib dipilih.");
    }
    if (!descriptionSubTask) {
      throw new Error("Sub Task " + rowNumber + ": Description wajib diisi.");
    }
    if (!taskSuccessIndicator) {
      throw new Error("Sub Task " + rowNumber + ": Success Indicator wajib diisi.");
    }
    if (!progressReportWeekly) {
      throw new Error("Sub Task " + rowNumber + ": Initial Progress Report Weekly wajib diisi.");
    }
    if (!remarks) {
      throw new Error("Sub Task " + rowNumber + ": Initial Keterangan wajib diisi.");
    }

    validateDateRange_(taskStartISO, taskDueISO);

    if (taskStartISO < startISO || taskDueISO > dueISO) {
      throw new Error(
        "Sub Task " + rowNumber +
        ": timeline harus berada di dalam timeline parent " +
        startISO + " sampai " + dueISO + "."
      );
    }

    const pic = employeeMap[picEmpId];
    if (!pic) {
      throw new Error("Sub Task " + rowNumber + ": PIC tidak ditemukan pada sheet Employees.");
    }

    return {
      SubTaskName: subTaskName,
      Department: pic.Team || department,
      PIC: pic,
      Site: taskSite,
      DescriptionSubTask: descriptionSubTask,
      StartDate: taskStartISO,
      DueDate: taskDueISO,
      SuccessIndicator: taskSuccessIndicator,
      PercentComplete: percentComplete,
      ProgressReportWeekly: progressReportWeekly,
      Remarks: remarks
    };
  });

  const trackerId =
    (trackerType === "Project" ? "PRJ-" : "ISS-") +
    Utilities.getUuid().slice(0, 8).toUpperCase();

  const now = new Date();
  const todayISO = formatISO_(startOfDay_(now));

  let aggregate;

  if (subTasks.length) {
    const taskSnapshots = subTasks.map(function (task) {
      return {
        CurrentPercentComplete: task.PercentComplete,
        DueDate: task.DueDate,
        EffectiveStatus: deriveTrackerStatus_(task.PercentComplete, task.DueDate, todayISO),
        CurrentProgressReportWeekly: task.ProgressReportWeekly,
        CurrentRemarks: task.Remarks,
        LastUpdated: normalizeDateTimeCell_(now),
        SubTaskName: task.SubTaskName
      };
    });

    aggregate = calculateTrackerAggregate_(taskSnapshots, dueISO, todayISO);
  } else {
    aggregate = {
      PercentComplete: parentPercentComplete,
      Status: deriveTrackerStatus_(parentPercentComplete, dueISO, todayISO),
      ProgressSummary: parentProgressReportWeekly,
      RemarksSummary: parentRemarks,
      LastUpdated: normalizeDateTimeCell_(now)
    };
  }

  const trackerSheet = getOrCreateSheet_(SHEET_TRACKERS, TRACKER_HEADERS);
  const taskSheet = getOrCreateSheet_(SHEET_TRACKER_TASKS, TRACKER_TASK_HEADERS);
  const taskUpdateSheet = getOrCreateSheet_(
    SHEET_TRACKER_TASK_UPDATES,
    TRACKER_TASK_UPDATE_HEADERS
  );
  const parentUpdateSheet = getOrCreateSheet_(
    SHEET_TRACKER_UPDATES,
    TRACKER_UPDATE_HEADERS
  );
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    appendObjectRow_(trackerSheet, TRACKER_HEADERS, {
      Timestamp: now,
      TrackerId: trackerId,
      TrackerType: trackerType,
      ProjectIssueName: projectIssueName,
      Department: department,
      ProjectLeaderEmpId: projectLeader.EmpId,
      ProjectLeaderName: projectLeader.EmpName,
      ProjectLeaderTeam: projectLeader.Team,
      ProjectLeaderPosition: projectLeader.Position,
      ProjectLeaderSiteDedicated: projectLeader.SiteDedicated,
      Site: site,
      DescriptionProject: descriptionProject,
      BackgroundProject: backgroundProject,
      ImpactProject: impactProject,
      StartDate: startISO,
      DueDate: dueISO,
      SuccessIndicator: successIndicator,
      CurrentPercentComplete: aggregate.PercentComplete,
      CurrentProgressReportWeekly: aggregate.ProgressSummary,
      CurrentRemarks: aggregate.RemarksSummary,
      Status: aggregate.Status,
      LastUpdated: now
    });

    if (!subTasks.length) {
      appendTrackerUpdateLog_(parentUpdateSheet, {
        TrackerId: trackerId,
        PercentComplete: parentPercentComplete,
        ProgressReportWeekly: parentProgressReportWeekly,
        Remarks: parentRemarks,
        Status: aggregate.Status,
        UpdatedBy: projectLeader,
        Timestamp: now
      });
    }

    subTasks.forEach(function (task) {
      const subTaskId = "TSK-" + Utilities.getUuid().slice(0, 10).toUpperCase();
      const taskStatus = deriveTrackerStatus_(
        task.PercentComplete,
        task.DueDate,
        todayISO
      );

      appendObjectRow_(taskSheet, TRACKER_TASK_HEADERS, {
        Timestamp: now,
        SubTaskId: subTaskId,
        TrackerId: trackerId,
        SubTaskName: task.SubTaskName,
        Department: task.Department,
        PICEmpId: task.PIC.EmpId,
        PICName: task.PIC.EmpName,
        PICTeam: task.PIC.Team,
        PICPosition: task.PIC.Position,
        PICSiteDedicated: task.PIC.SiteDedicated,
        Site: task.Site,
        DescriptionSubTask: task.DescriptionSubTask,
        StartDate: task.StartDate,
        DueDate: task.DueDate,
        SuccessIndicator: task.SuccessIndicator,
        CurrentPercentComplete: task.PercentComplete,
        CurrentProgressReportWeekly: task.ProgressReportWeekly,
        CurrentRemarks: task.Remarks,
        Status: taskStatus,
        LastUpdated: now
      });

      appendTrackerSubTaskUpdateLog_(taskUpdateSheet, {
        TrackerId: trackerId,
        SubTaskId: subTaskId,
        PercentComplete: task.PercentComplete,
        ProgressReportWeekly: task.ProgressReportWeekly,
        Remarks: task.Remarks,
        Status: taskStatus,
        UpdatedBy: projectLeader,
        Timestamp: now
      });
    });
  } finally {
    lock.releaseLock();
  }

  return {
    trackerId: trackerId,
    status: aggregate.Status,
    subTaskCount: subTasks.length
  };
}


/**
 * Mengubah informasi master Project / Issue dan atribut statis Sub Task.
 *
 * Catatan audit:
 * - Progress Sub Task lama tidak diubah melalui fungsi Edit.
 * - Progress parent lama tidak diubah melalui fungsi Edit.
 * - Sub Task baru akan memperoleh initial immutable update log.
 * - Sub Task yang sudah ada tidak dapat dihapus dari halaman Edit.
 */
function updateTrackerDetails(payload) {
  payload = payload || {};

  const trackerId = String(payload.TrackerId || "").trim();
  const trackerType = normalizeTrackerType_(payload.TrackerType);
  const projectIssueName = String(payload.ProjectIssueName || "").trim();
  const department = String(payload.Department || "").trim();
  const projectLeaderEmpId = String(payload.ProjectLeaderEmpId || "").trim();
  const site = String(payload.Site || "").trim();
  const descriptionProject = String(payload.DescriptionProject || "").trim();
  const backgroundProject = String(payload.BackgroundProject || "").trim();
  const impactProject = String(payload.ImpactProject || "").trim();
  const startISO = String(payload.StartDate || "").trim();
  const dueISO = String(payload.DueDate || "").trim();
  const successIndicator = String(payload.SuccessIndicator || "").trim();

  if (!trackerId) {
    throw new Error("Tracker ID wajib diisi.");
  }
  if (!trackerType) {
    throw new Error("Type wajib Project atau Issue.");
  }
  if (!projectIssueName) {
    throw new Error("Project Name / Issue Name wajib diisi.");
  }
  if (!department) {
    throw new Error("Department wajib dipilih.");
  }
  if (!projectLeaderEmpId) {
    throw new Error("Project Leader wajib dipilih.");
  }
  if (!site) {
    throw new Error("Site wajib dipilih.");
  }
  if (!descriptionProject) {
    throw new Error("Description Project wajib diisi.");
  }
  if (!backgroundProject) {
    throw new Error("Background Project wajib diisi.");
  }
  if (!impactProject) {
    throw new Error("Impact Project wajib diisi.");
  }
  if (!successIndicator) {
    throw new Error("Success Indicator wajib diisi.");
  }

  validateDateRange_(startISO, dueISO);

  const trackerSheet = getOrCreateSheet_(SHEET_TRACKERS, TRACKER_HEADERS);
  const taskSheet = getOrCreateSheet_(SHEET_TRACKER_TASKS, TRACKER_TASK_HEADERS);
  const taskUpdateSheet = getOrCreateSheet_(
    SHEET_TRACKER_TASK_UPDATES,
    TRACKER_TASK_UPDATE_HEADERS
  );

  const existingTracker = getTrackers_().find(function (item) {
    return String(item.TrackerId) === trackerId;
  });

  if (!existingTracker) {
    throw new Error("Tracker tidak ditemukan.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const projectLeader = employeeMap[projectLeaderEmpId];

  if (!projectLeader) {
    throw new Error("Project Leader tidak ditemukan pada sheet Employees.");
  }

  const existingTasks = getTrackerSubTasks_().filter(function (item) {
    return String(item.TrackerId) === trackerId;
  });
  const existingTaskMap = objectBy_(existingTasks, "SubTaskId");

  const rawSubTasks = (Array.isArray(payload.SubTasks) ? payload.SubTasks : [])
    .filter(function (task) {
      task = task || {};
      return Boolean(String(task.SubTaskId || "").trim()) || [
        task.SubTaskName,
        task.PICEmpId,
        task.Site,
        task.DescriptionSubTask,
        task.StartDate,
        task.DueDate,
        task.SuccessIndicator,
        task.ProgressReportWeekly,
        task.Remarks
      ].some(function (value) {
        return String(value || "").trim() !== "";
      });
    });

  const submittedExistingIds = rawSubTasks
    .map(function (task) {
      return String((task || {}).SubTaskId || "").trim();
    })
    .filter(Boolean);

  const missingExisting = existingTasks.filter(function (task) {
    return submittedExistingIds.indexOf(String(task.SubTaskId)) < 0;
  });

  if (missingExisting.length) {
    throw new Error(
      "Sub Task yang sudah memiliki histori tidak dapat dihapus melalui Edit. " +
      "Muat ulang data dan simpan kembali tanpa menghapus baris existing."
    );
  }

  const preparedTasks = rawSubTasks.map(function (rawTask, index) {
    rawTask = rawTask || {};

    const subTaskId = String(rawTask.SubTaskId || "").trim();
    const existingTask = subTaskId ? existingTaskMap[subTaskId] : null;
    const subTaskName = String(rawTask.SubTaskName || "").trim();
    const picEmpId = String(rawTask.PICEmpId || "").trim();
    const taskSite = String(rawTask.Site || "").trim();
    const descriptionSubTask = String(rawTask.DescriptionSubTask || "").trim();
    const taskStartISO = String(rawTask.StartDate || "").trim();
    const taskDueISO = String(rawTask.DueDate || "").trim();
    const taskSuccessIndicator = String(rawTask.SuccessIndicator || "").trim();
    const rowNumber = index + 1;

    if (subTaskId && !existingTask) {
      throw new Error("Sub Task " + rowNumber + ": ID tidak ditemukan pada tracker ini.");
    }
    if (!subTaskName) {
      throw new Error("Sub Task " + rowNumber + ": nama wajib diisi.");
    }
    if (!picEmpId) {
      throw new Error("Sub Task " + rowNumber + ": PIC wajib dipilih.");
    }
    if (!taskSite) {
      throw new Error("Sub Task " + rowNumber + ": Site wajib dipilih.");
    }
    if (!descriptionSubTask) {
      throw new Error("Sub Task " + rowNumber + ": Description wajib diisi.");
    }
    if (!taskSuccessIndicator) {
      throw new Error("Sub Task " + rowNumber + ": Success Indicator wajib diisi.");
    }

    validateDateRange_(taskStartISO, taskDueISO);

    if (taskStartISO < startISO || taskDueISO > dueISO) {
      throw new Error(
        "Sub Task " + rowNumber +
        ": timeline harus berada di dalam timeline parent " +
        startISO + " sampai " + dueISO + "."
      );
    }

    const pic = employeeMap[picEmpId];
    if (!pic) {
      throw new Error("Sub Task " + rowNumber + ": PIC tidak ditemukan pada sheet Employees.");
    }

    let percentComplete;
    let progressReportWeekly;
    let remarks;

    if (existingTask) {
      // Progress existing dipertahankan. Perubahannya harus melalui form update
      // agar immutable update log tetap lengkap.
      percentComplete = Number(existingTask.CurrentPercentComplete || 0);
      progressReportWeekly = String(existingTask.CurrentProgressReportWeekly || "");
      remarks = String(existingTask.CurrentRemarks || "");
    } else {
      percentComplete = validatePercentComplete_(rawTask.PercentComplete);
      progressReportWeekly = String(rawTask.ProgressReportWeekly || "").trim();
      remarks = String(rawTask.Remarks || "").trim();

      if (!progressReportWeekly) {
        throw new Error(
          "Sub Task " + rowNumber + ": Initial Progress Report Weekly wajib diisi."
        );
      }
      if (!remarks) {
        throw new Error("Sub Task " + rowNumber + ": Initial Keterangan wajib diisi.");
      }
    }

    return {
      Existing: Boolean(existingTask),
      ExistingTask: existingTask,
      SubTaskId: subTaskId,
      SubTaskName: subTaskName,
      Department: pic.Team || department,
      PIC: pic,
      Site: taskSite,
      DescriptionSubTask: descriptionSubTask,
      StartDate: taskStartISO,
      DueDate: taskDueISO,
      SuccessIndicator: taskSuccessIndicator,
      PercentComplete: percentComplete,
      ProgressReportWeekly: progressReportWeekly,
      Remarks: remarks
    };
  });

  const now = new Date();
  const todayISO = formatISO_(startOfDay_(now));
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    setObjectRowValues_(trackerSheet, existingTracker.SheetRow, {
      TrackerType: trackerType,
      ProjectIssueName: projectIssueName,
      Department: department,
      ProjectLeaderEmpId: projectLeader.EmpId,
      ProjectLeaderName: projectLeader.EmpName,
      ProjectLeaderTeam: projectLeader.Team,
      ProjectLeaderPosition: projectLeader.Position,
      ProjectLeaderSiteDedicated: projectLeader.SiteDedicated,
      Site: site,
      DescriptionProject: descriptionProject,
      BackgroundProject: backgroundProject,
      ImpactProject: impactProject,
      StartDate: startISO,
      DueDate: dueISO,
      SuccessIndicator: successIndicator,
      LastUpdated: now
    });

    let newSubTaskCount = 0;

    preparedTasks.forEach(function (task) {
      const taskStatus = deriveTrackerStatus_(
        task.PercentComplete,
        task.DueDate,
        todayISO
      );

      if (task.Existing) {
        setObjectRowValues_(taskSheet, task.ExistingTask.SheetRow, {
          SubTaskName: task.SubTaskName,
          Department: task.Department,
          PICEmpId: task.PIC.EmpId,
          PICName: task.PIC.EmpName,
          PICTeam: task.PIC.Team,
          PICPosition: task.PIC.Position,
          PICSiteDedicated: task.PIC.SiteDedicated,
          Site: task.Site,
          DescriptionSubTask: task.DescriptionSubTask,
          StartDate: task.StartDate,
          DueDate: task.DueDate,
          SuccessIndicator: task.SuccessIndicator,
          Status: taskStatus,
          LastUpdated: now
        });
        return;
      }

      const subTaskId = "TSK-" + Utilities.getUuid().slice(0, 10).toUpperCase();
      newSubTaskCount += 1;

      appendObjectRow_(taskSheet, TRACKER_TASK_HEADERS, {
        Timestamp: now,
        SubTaskId: subTaskId,
        TrackerId: trackerId,
        SubTaskName: task.SubTaskName,
        Department: task.Department,
        PICEmpId: task.PIC.EmpId,
        PICName: task.PIC.EmpName,
        PICTeam: task.PIC.Team,
        PICPosition: task.PIC.Position,
        PICSiteDedicated: task.PIC.SiteDedicated,
        Site: task.Site,
        DescriptionSubTask: task.DescriptionSubTask,
        StartDate: task.StartDate,
        DueDate: task.DueDate,
        SuccessIndicator: task.SuccessIndicator,
        CurrentPercentComplete: task.PercentComplete,
        CurrentProgressReportWeekly: task.ProgressReportWeekly,
        CurrentRemarks: task.Remarks,
        Status: taskStatus,
        LastUpdated: now
      });

      appendTrackerSubTaskUpdateLog_(taskUpdateSheet, {
        TrackerId: trackerId,
        SubTaskId: subTaskId,
        PercentComplete: task.PercentComplete,
        ProgressReportWeekly: task.ProgressReportWeekly,
        Remarks: task.Remarks,
        Status: taskStatus,
        UpdatedBy: projectLeader,
        Timestamp: now
      });
    });

    if (existingTasks.length + newSubTaskCount > 0) {
      syncTrackerAggregate_(trackerId, now);
    } else {
      const parentStatus = deriveTrackerStatus_(
        existingTracker.CurrentPercentComplete,
        dueISO,
        todayISO
      );

      setObjectRowValues_(trackerSheet, existingTracker.SheetRow, {
        Status: parentStatus,
        LastUpdated: now
      });
    }

    return {
      trackerId: trackerId,
      subTaskCount: existingTasks.length + newSubTaskCount,
      newSubTaskCount: newSubTaskCount
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Daftar Project & Issue Tracker.
 */
function getTrackerData(request) {
  request = request || {};

  const type = String(request.type || "All Types").trim();
  const status = String(request.status || "All Status").trim();
  const department = String(
    request.department || request.team || "All Departments"
  ).trim();
  const site = String(request.site || "All Sites").trim();
  const search = String(request.search || "").trim().toLowerCase();

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  let trackers = getTrackersWithSubTasks_(employeeMap);

  if (type !== "All Types") {
    trackers = trackers.filter(function (tracker) {
      return tracker.TrackerType === type;
    });
  }

  if (department !== "All Departments" && department !== "All Teams") {
    trackers = trackers.filter(function (tracker) {
      return (
        tracker.Department === department ||
        (tracker.SubTasks || []).some(function (task) {
          return task.Department === department || task.PICTeam === department;
        })
      );
    });
  }

  if (site !== "All Sites") {
    trackers = trackers.filter(function (tracker) {
      return (
        tracker.Site === site ||
        (tracker.SubTasks || []).some(function (task) {
          return task.Site === site || task.PICSiteDedicated === site;
        })
      );
    });
  }

  if (search) {
    trackers = trackers.filter(function (tracker) {
      const parentMatch = [
        tracker.TrackerId,
        tracker.TrackerType,
        tracker.ProjectIssueName,
        tracker.Department,
        tracker.ProjectLeaderName,
        tracker.Site,
        tracker.DescriptionProject,
        tracker.BackgroundProject,
        tracker.ImpactProject,
        tracker.SuccessIndicator,
        tracker.CurrentProgressReportWeekly,
        tracker.CurrentRemarks
      ].some(function (value) {
        return String(value || "").toLowerCase().includes(search);
      });

      const taskMatch = (tracker.SubTasks || []).some(function (task) {
        return [
          task.SubTaskId,
          task.SubTaskName,
          task.PICName,
          task.Department,
          task.Site,
          task.DescriptionSubTask,
          task.SuccessIndicator,
          task.CurrentProgressReportWeekly,
          task.CurrentRemarks
        ].some(function (value) {
          return String(value || "").toLowerCase().includes(search);
        });
      });

      return parentMatch || taskMatch;
    });
  }

  const counts = {
    total: trackers.length,
    onGoing: trackers.filter(function (tracker) {
      return tracker.EffectiveStatus === "On Going";
    }).length,
    overdue: trackers.filter(function (tracker) {
      return tracker.EffectiveStatus === "Overdue";
    }).length,
    closed: trackers.filter(function (tracker) {
      return tracker.EffectiveStatus === "Closed";
    }).length
  };

  if (status !== "All Status") {
    trackers = trackers.filter(function (tracker) {
      return tracker.EffectiveStatus === status;
    });
  }

  trackers.sort(sortTracker_);

  return {
    counts: counts,
    trackers: trackers
  };
}

/**
 * Update progress dan status Project / Issue.
 * Overdue tidak dipilih manual; status tersebut dihitung dari DueDate.
 */
function updateTrackerSubTask(payload) {
  payload = payload || {};

  const subTaskId = String(payload.SubTaskId || "").trim();
  const percentComplete = validatePercentComplete_(payload.PercentComplete);
  const progressReportWeekly = String(payload.ProgressReportWeekly || "").trim();
  const remarks = String(payload.Remarks || "").trim();
  const updatedByEmpId = String(payload.UpdatedByEmpId || "").trim();

  if (!subTaskId) {
    throw new Error("Sub Task ID wajib diisi.");
  }
  if (!progressReportWeekly) {
    throw new Error("Progress Report Weekly wajib diisi.");
  }
  if (!remarks) {
    throw new Error("Keterangan wajib diisi.");
  }
  if (!updatedByEmpId) {
    throw new Error("Updated By wajib dipilih.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const updatedBy = employeeMap[updatedByEmpId];

  if (!updatedBy) {
    throw new Error("Updated By tidak ditemukan pada sheet Employees.");
  }

  const taskSheet = getOrCreateSheet_(SHEET_TRACKER_TASKS, TRACKER_TASK_HEADERS);
  const updateSheet = getOrCreateSheet_(
    SHEET_TRACKER_TASK_UPDATES,
    TRACKER_TASK_UPDATE_HEADERS
  );
  const task = getTrackerSubTasks_().find(function (item) {
    return String(item.SubTaskId) === subTaskId;
  });

  if (!task) {
    throw new Error("Sub Task tidak ditemukan.");
  }

  const now = new Date();
  const status = deriveTrackerStatus_(
    percentComplete,
    task.DueDate,
    formatISO_(startOfDay_(now))
  );

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    setObjectRowValues_(taskSheet, task.SheetRow, {
      CurrentPercentComplete: percentComplete,
      CurrentProgressReportWeekly: progressReportWeekly,
      CurrentRemarks: remarks,
      Status: status,
      LastUpdated: now
    });

    appendTrackerSubTaskUpdateLog_(updateSheet, {
      TrackerId: task.TrackerId,
      SubTaskId: subTaskId,
      PercentComplete: percentComplete,
      ProgressReportWeekly: progressReportWeekly,
      Remarks: remarks,
      Status: status,
      UpdatedBy: updatedBy,
      Timestamp: now
    });

    syncTrackerAggregate_(task.TrackerId, now);
  } finally {
    lock.releaseLock();
  }

  return {
    trackerId: task.TrackerId,
    subTaskId: subTaskId,
    percentComplete: percentComplete,
    status: status
  };
}

function updateTracker(payload) {
  payload = payload || {};

  const trackerId = String(payload.TrackerId || "").trim();
  const percentComplete = validatePercentComplete_(payload.PercentComplete);
  const progressReportWeekly = String(payload.ProgressReportWeekly || "").trim();
  const remarks = String(payload.Remarks || "").trim();
  const updatedByEmpId = String(payload.UpdatedByEmpId || "").trim();

  if (!trackerId) {
    throw new Error("Tracker ID wajib diisi.");
  }
  if (!progressReportWeekly) {
    throw new Error("Progress Report Weekly wajib diisi.");
  }
  if (!remarks) {
    throw new Error("Keterangan wajib diisi.");
  }
  if (!updatedByEmpId) {
    throw new Error("Updated By wajib dipilih.");
  }

  const employees = getEmployees_();
  const employeeMap = objectBy_(employees, "EmpId");
  const updatedBy = employeeMap[updatedByEmpId];

  if (!updatedBy) {
    throw new Error("Updated By tidak ditemukan pada sheet Employees.");
  }

  const trackerSheet = getOrCreateSheet_(SHEET_TRACKERS, TRACKER_HEADERS);
  const updateSheet = getOrCreateSheet_(SHEET_TRACKER_UPDATES, TRACKER_UPDATE_HEADERS);
  const trackers = getTrackers_();
  const tracker = trackers.find(function (item) {
    return String(item.TrackerId) === trackerId;
  });

  if (!tracker) {
    throw new Error("Tracker tidak ditemukan.");
  }

  const now = new Date();
  const status = deriveTrackerStatus_(
    percentComplete,
    tracker.DueDate,
    formatISO_(startOfDay_(now))
  );

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    setObjectRowValues_(trackerSheet, tracker.SheetRow, {
      CurrentPercentComplete: percentComplete,
      CurrentProgressReportWeekly: progressReportWeekly,
      CurrentRemarks: remarks,
      Status: status,
      LastUpdated: now
    });

    appendTrackerUpdateLog_(updateSheet, {
      TrackerId: trackerId,
      PercentComplete: percentComplete,
      ProgressReportWeekly: progressReportWeekly,
      Remarks: remarks,
      Status: status,
      UpdatedBy: updatedBy,
      Timestamp: now
    });
  } finally {
    lock.releaseLock();
  }

  return {
    trackerId: trackerId,
    percentComplete: percentComplete,
    status: status
  };
}

function getTrackerSubTaskUpdateLog(subTaskId) {
  const id = String(subTaskId || "").trim();

  if (!id) {
    throw new Error("Sub Task ID wajib diisi.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const task = getTrackerSubTasks_()
    .map(function (item) {
      return enrichTrackerSubTask_(item, employeeMap);
    })
    .find(function (item) {
      return String(item.SubTaskId) === id;
    });

  if (!task) {
    throw new Error("Sub Task tidak ditemukan.");
  }

  const tracker = getTrackersWithSubTasks_(employeeMap).find(function (item) {
    return String(item.TrackerId) === String(task.TrackerId);
  });

  const logs = getTrackerSubTaskUpdateLogs_()
    .filter(function (log) {
      return String(log.SubTaskId) === id;
    })
    .sort(function (a, b) {
      return String(b.Timestamp || "").localeCompare(String(a.Timestamp || ""));
    });

  return {
    tracker: tracker || null,
    subTask: task,
    logs: logs
  };
}

function getTrackerUpdateLog(trackerId) {
  const id = String(trackerId || "").trim();

  if (!id) {
    throw new Error("Tracker ID wajib diisi.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const tracker = getTrackers_()
    .map(function (item) {
      return enrichTracker_(item, employeeMap);
    })
    .find(function (item) {
      return String(item.TrackerId) === id;
    });

  if (!tracker) {
    throw new Error("Tracker tidak ditemukan.");
  }

  const logs = getTrackerUpdateLogs_()
    .filter(function (log) {
      return String(log.TrackerId) === id;
    })
    .sort(function (a, b) {
      return String(b.Timestamp || "").localeCompare(String(a.Timestamp || ""));
    });

  return {
    tracker: tracker,
    logs: logs
  };
}

function checkLeaveOverlap(payload) {
  payload = payload || {};

  const employeeId = String(payload.EmpId || "").trim();
  const backupEmployeeId = String(payload.BackupEmpId || "").trim();
  const startISO = String(payload.StartDate || "").trim();
  const endISO = String(payload.EndDate || payload.StartDate || "").trim();
  const excludeRequestId = String(payload.ExcludeRequestId || "").trim();

  if (!employeeId || !startISO || !endISO) {
    return {
      hasOverlap: false,
      overlaps: [],
      hasBackupConflict: false,
      backupOverlaps: [],
      message: ""
    };
  }

  validateDateRange_(startISO, endISO);

  const employeeMap = objectBy_(getEmployees_(), "EmpId");

  const overlaps = findLeaveOverlaps_(
    employeeId,
    startISO,
    endISO,
    excludeRequestId
  );

  const backupOverlaps =
    backupEmployeeId && backupEmployeeId !== employeeId
      ? findLeaveOverlaps_(backupEmployeeId, startISO, endISO, "")
      : [];

  let message = "";

  if (overlaps.length) {
    message = buildOverlapMessage_(overlaps);
  } else if (backupOverlaps.length) {
    const backupEmployee = employeeMap[backupEmployeeId];
    const backupName = backupEmployee
      ? backupEmployee.EmpName
      : backupEmployeeId;
    const first = backupOverlaps[0];

    message =
      "Backup / Acting PIC " +
      backupName +
      " juga sedang on leave (" +
      first.StartDate +
      " sampai " +
      first.EndDate +
      ").";
  }

  return {
    hasOverlap: overlaps.length > 0,
    overlaps: overlaps,
    hasBackupConflict: backupOverlaps.length > 0,
    backupOverlaps: backupOverlaps,
    message: message
  };
}

function createLeaveRequest(payload) {
  payload = payload || {};

  const employeeId = String(payload.EmpId || "").trim();
  const backupEmployeeId = String(payload.BackupEmpId || "").trim();
  const leaveType = String(payload.LeaveType || "").trim();
  const startISO = String(payload.StartDate || "").trim();
  const endISO = String(payload.EndDate || payload.StartDate || "").trim();

  if (!employeeId) {
    throw new Error("Employee wajib dipilih.");
  }

  if (!leaveType) {
    throw new Error("Leave Type wajib dipilih.");
  }

  if (!backupEmployeeId) {
    throw new Error("Backup / Acting PIC wajib dipilih.");
  }

  if (employeeId === backupEmployeeId) {
    throw new Error("Backup PIC tidak boleh sama dengan employee yang cuti.");
  }

  validateDateRange_(startISO, endISO);

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const employee = employeeMap[employeeId];
  const backupEmployee = employeeMap[backupEmployeeId];

  if (!employee) {
    throw new Error("Employee tidak ditemukan pada sheet Employees.");
  }

  if (!backupEmployee) {
    throw new Error("Backup / Acting PIC tidak ditemukan pada sheet Employees.");
  }

  const overlaps = findLeaveOverlaps_(employeeId, startISO, endISO, "");
  if (overlaps.length) {
    throw new Error(buildOverlapMessage_(overlaps));
  }

  const backupOverlaps = findLeaveOverlaps_(
    backupEmployeeId,
    startISO,
    endISO,
    ""
  );

  if (backupOverlaps.length) {
    const first = backupOverlaps[0];
    throw new Error(
      "Backup / Acting PIC " +
      backupEmployee.EmpName +
      " juga sedang on leave (" +
      first.StartDate +
      " sampai " +
      first.EndDate +
      "). Pilih backup lain."
    );
  }

  const requestId = "LR-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const sheet = getOrCreateSheet_(SHEET_LEAVE_REQUESTS, LEAVE_HEADERS);
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    appendObjectRow_(sheet, LEAVE_HEADERS, {
      Timestamp: new Date(),
      RequestId: requestId,
      EmpId: employee.EmpId,
      EmpName: employee.EmpName,
      Team: employee.Team,
      Position: employee.Position,
      LeaveType: leaveType,
      StartDate: startISO,
      EndDate: endISO,
      StartTime: String(payload.TimeFrom || "").trim(),
      EndTime: String(payload.TimeTo || "").trim(),
      Note: String(payload.Note || "").trim(),
      BackupEmpId: backupEmployee.EmpId,
      BackupEmpName: backupEmployee.EmpName,
      BackupTeam: backupEmployee.Team,
      BackupPosition: backupEmployee.Position,
      SiteDedicated: employee.SiteDedicated,
      BackupSiteDedicated: backupEmployee.SiteDedicated
    });
  } finally {
    lock.releaseLock();
  }

  return {
    requestId: requestId
  };
}

function getCalendarRange(request) {
  request = request || {};

  const viewMode = String(request.viewMode || "WEEK").toUpperCase();
  const anchor =
    parseISO_(String(request.anchorISO || "")) ||
    startOfDay_(new Date());

  const team = String(request.team || "All Teams").trim();
  const site = String(request.site || "All Sites").trim();
  const search = String(request.search || "").trim().toLowerCase();

  let rangeStart;
  let rangeEnd;

  if (viewMode === "YEAR") {
    rangeStart = new Date(anchor.getFullYear(), 0, 1);
    rangeEnd = new Date(anchor.getFullYear(), 11, 31);
  } else if (viewMode === "MONTH") {
    rangeStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    rangeEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  } else {
    rangeStart = startOfWeekMonday_(anchor);
    rangeEnd = addDays_(rangeStart, 6);
  }

  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(0, 0, 0, 0);

  const rangeStartISO = formatISO_(rangeStart);
  const rangeEndISO = formatISO_(rangeEnd);
  const holidays = getHolidaysMap_();
  const allEmployees = getEmployees_();
  const employeeMap = objectBy_(allEmployees, "EmpId");

  const allLeaves = getLeaveRequests_().map(function (leave) {
    return enrichLeave_(leave, employeeMap);
  });

  const leavesByEmployee = {};
  allLeaves.forEach(function (leave) {
    const employeeId = String(leave.EmpId || "");
    if (!employeeId) {
      return;
    }

    if (!leavesByEmployee[employeeId]) {
      leavesByEmployee[employeeId] = [];
    }

    leavesByEmployee[employeeId].push(leave);
  });

  Object.keys(leavesByEmployee).forEach(function (employeeId) {
    leavesByEmployee[employeeId].sort(function (a, b) {
      return String(a.StartDate || "").localeCompare(String(b.StartDate || ""));
    });
  });

  const year = rangeStart.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const today = startOfDay_(new Date());

  yearStart.setHours(0, 0, 0, 0);
  yearEnd.setHours(0, 0, 0, 0);

  let cutoff = yearEnd;

  if (year === today.getFullYear()) {
    cutoff = today;
  } else if (year > today.getFullYear()) {
    cutoff = addDays_(yearStart, -1);
  }

  // Sheet Employees sekarang puluhan ribu baris -- JANGAN pre-inisialisasi
  // container untuk semua employee di sini. yearlyDaysByEmployee /
  // yearlyBreakdownByEmployee / personItems dibuat on-demand (lihat fallback
  // di bawah dan addPersonCalendarItem_) hanya untuk employee yang memang
  // punya leave/assignment, supaya tidak membengkakkan payload dengan
  // puluhan ribu entri kosong.
  const yearlyDaysByEmployee = {};
  const yearlyBreakdownByEmployee = {};
  const personItems = {};

  allLeaves.forEach(function (leave) {
    const employeeId = String(leave.EmpId || "");
    const startDate = parseISO_(leave.StartDate);
    const endDate = parseISO_(leave.EndDate);

    if (!employeeId || !startDate || !endDate) {
      return;
    }

    const clippedStart = new Date(Math.max(
      startDate.getTime(),
      yearStart.getTime()
    ));

    const clippedEnd = new Date(Math.min(
      endDate.getTime(),
      cutoff.getTime()
    ));

    clippedStart.setHours(0, 0, 0, 0);
    clippedEnd.setHours(0, 0, 0, 0);

    if (clippedEnd.getTime() >= clippedStart.getTime()) {
      const workingDays = countWorkingDaysInclusive_(
        clippedStart,
        clippedEnd,
        holidays
      );

      /*
       * Data leave lama dapat merujuk EmpId yang sudah tidak ada atau berubah
       * pada sheet Employees. Inisialisasi ulang container per employee agar
       * perhitungan tidak gagal saat membaca LeaveType, misalnya "Cuti Fix".
       */
      if (!Object.prototype.hasOwnProperty.call(yearlyDaysByEmployee, employeeId)) {
        yearlyDaysByEmployee[employeeId] = 0;
      }

      if (!yearlyBreakdownByEmployee[employeeId]) {
        yearlyBreakdownByEmployee[employeeId] = {};
      }

      if (!personItems[employeeId]) {
        personItems[employeeId] = [];
      }

      yearlyDaysByEmployee[employeeId] =
        Number(yearlyDaysByEmployee[employeeId] || 0) + workingDays;

      const leaveType = String(leave.LeaveType || "Leave").trim() || "Leave";
      const employeeBreakdown = yearlyBreakdownByEmployee[employeeId];

      employeeBreakdown[leaveType] =
        Number(employeeBreakdown[leaveType] || 0) + workingDays;
    }

    if (!isDateRangeOverlap_(
      leave.StartDate,
      leave.EndDate,
      rangeStartISO,
      rangeEndISO
    )) {
      return;
    }

    addPersonCalendarItem_(personItems, employeeId, {
      category: "LEAVE",
      startDate: leave.StartDate,
      endDate: leave.EndDate,
      title:
        (leave.LeaveType || "Leave") +
        (leave.BackupEmpName ? " → " + leave.BackupEmpName : ""),
      detail:
        "Employee: " + (leave.EmpName || leave.EmpId || "-") + "\n" +
        "Periode: " + leave.StartDate + " - " + leave.EndDate + "\n" +
        "Backup PIC: " + (leave.BackupEmpName || leave.BackupEmpId || "-") + "\n" +
        "Handover: " + (leave.Note || "-"),
      status: leave.LeaveType || "Leave",
      searchText: [
        leave.LeaveType,
        leave.EmpName,
        leave.BackupEmpName,
        leave.Note
      ].join(" ")
    });
  });

  /* =======================================================
   * EVENT / PROJECT / ISSUE ASSIGNMENTS
   * Semua assignment melekat pada PIC asal. Selama PIC cuti,
   * assignment dipindahkan sementara ke Backup PIC terdaftar.
   * ======================================================= */
  const assignments = [];

  getEvents_()
    .map(function (event) {
      return enrichEvent_(event, employeeMap);
    })
    .filter(function (event) {
      return Boolean(
        event.PICEmpId &&
        isISODateInRange_(event.EventDate, rangeStartISO, rangeEndISO)
      );
    })
    .sort(sortEventByDate_)
    .forEach(function (event) {
      assignments.push({
        category: "EVENT",
        ownerEmpId: String(event.PICEmpId),
        startDate: event.EventDate,
        endDate: event.EventDate,
        title: "EVENT • " + (event.EventName || "Event"),
        status: "Event",
        detail:
          "Event: " + (event.EventName || "-") + "\n" +
          "Tanggal: " + (event.EventDate || "-") + "\n" +
          "PIC asal: " + (event.PICName || event.PICEmpId || "-") + "\n" +
          "Lokasi: " + (event.Where || "-") + "\n" +
          "Deskripsi: " + (event.Description || "-") + "\n" +
          "Update Kesiapan: " + (event.ReadinessUpdate || "-"),
        searchText: [
          event.EventId,
          event.EventName,
          event.Description,
          event.Where,
          event.ReadinessUpdate,
          event.PICName,
          event.PICTeam,
          event.PICSiteDedicated
        ].join(" ")
      });
    });

  /* =======================================================
   * PROJECT / ISSUE ATTACHED TO OWNER PERSON.
   * ======================================================= */

  getTrackersWithSubTasks_(employeeMap).forEach(function (tracker) {
    const trackerType = normalizeTrackerType_(tracker.TrackerType) || "Project";
    const category = trackerType === "Issue" ? "ISSUE" : "PROJECT";
    const parentStart = tracker.StartDate || tracker.DueDate;
    const parentEnd = tracker.DueDate || tracker.StartDate;
    const parentPercent = normalizePercentComplete_(
      tracker.CurrentPercentComplete
    );

    if (tracker.ProjectLeaderEmpId && parentStart && parentEnd) {
      assignments.push({
        category: category,
        ownerEmpId: String(tracker.ProjectLeaderEmpId),
        startDate: parentStart,
        endDate: parentEnd,
        title:
          category + " • " +
          (tracker.ProjectIssueName || tracker.TrackerId) +
          " • " + parentPercent + "%",
        status: tracker.EffectiveStatus || tracker.Status || "On Going",
        detail:
          category + ": " + (tracker.ProjectIssueName || "-") + "\n" +
          "Assignment: Overall Project / Issue\n" +
          "Timeline: " + parentStart + " - " + parentEnd + "\n" +
          "Project Leader: " + (tracker.ProjectLeaderName || "-") + "\n" +
          "Department / Site: " +
            [tracker.Department, tracker.Site].filter(Boolean).join(" • ") + "\n" +
          "Progress: " + parentPercent + "%\n" +
          "Status: " + (tracker.EffectiveStatus || tracker.Status || "On Going") + "\n" +
          "Weekly Report: " + (tracker.CurrentProgressReportWeekly || "-"),
        searchText: [
          tracker.TrackerId,
          tracker.TrackerType,
          tracker.ProjectIssueName,
          tracker.Department,
          tracker.Site,
          tracker.ProjectLeaderName,
          tracker.DescriptionProject,
          tracker.BackgroundProject,
          tracker.ImpactProject,
          tracker.SuccessIndicator,
          tracker.CurrentProgressReportWeekly,
          tracker.CurrentRemarks
        ].join(" ")
      });
    }

    (tracker.SubTasks || []).forEach(function (task) {
      const taskStart = task.StartDate || task.DueDate || parentStart;
      const taskEnd = task.DueDate || task.StartDate || parentEnd;
      const taskPercent = normalizePercentComplete_(
        task.CurrentPercentComplete
      );

      if (!task.PICEmpId || !taskStart || !taskEnd) {
        return;
      }

      assignments.push({
        category: category,
        ownerEmpId: String(task.PICEmpId),
        startDate: taskStart,
        endDate: taskEnd,
        title:
          category + " TASK • " +
          (task.SubTaskName || task.SubTaskId) +
          " • " + taskPercent + "%",
        status: task.EffectiveStatus || task.Status || "On Going",
        detail:
          category + ": " + (tracker.ProjectIssueName || "-") + "\n" +
          "Sub Task: " + (task.SubTaskName || "-") + "\n" +
          "Timeline: " + taskStart + " - " + taskEnd + "\n" +
          "PIC: " + (task.PICName || task.PICEmpId || "-") + "\n" +
          "Department / Site: " +
            [task.Department, task.Site].filter(Boolean).join(" • ") + "\n" +
          "Progress: " + taskPercent + "%\n" +
          "Status: " + (task.EffectiveStatus || task.Status || "On Going") + "\n" +
          "Weekly Report: " + (task.CurrentProgressReportWeekly || "-"),
        searchText: [
          tracker.TrackerId,
          tracker.ProjectIssueName,
          task.SubTaskId,
          task.SubTaskName,
          task.PICName,
          task.Department,
          task.Site,
          task.DescriptionSubTask,
          task.SuccessIndicator,
          task.CurrentProgressReportWeekly,
          task.CurrentRemarks
        ].join(" ")
      });
    });
  });

  let actingTransfers = 0;

  assignments.forEach(function (assignment) {
    const segments = distributeAssignmentToBackup_(
      assignment,
      leavesByEmployee,
      employeeMap
    );

    segments.forEach(function (segment) {
      if (!isDateRangeOverlap_(
        segment.startDate,
        segment.endDate,
        rangeStartISO,
        rangeEndISO
      )) {
        return;
      }

      if (segment.acting) {
        actingTransfers++;
      }

      addPersonCalendarItem_(personItems, segment.employeeId, segment);
    });
  });

  let employees = allEmployees.slice();

  if (team !== "All Teams") {
    employees = employees.filter(function (employee) {
      return employee.Team === team;
    });
  }

  if (site !== "All Sites") {
    employees = employees.filter(function (employee) {
      return employee.SiteDedicated === site;
    });
  }

  if (search) {
    employees = employees.filter(function (employee) {
      const employeeId = String(employee.EmpId);
      const employeeMatch = [
        employee.EmpId,
        employee.SID,
        employee.EmpName,
        employee.Position,
        employee.Team,
        employee.SiteDedicated
      ].some(function (value) {
        return String(value || "").toLowerCase().includes(search);
      });

      const itemMatch = (personItems[employeeId] || []).some(function (item) {
        return [
          item.category,
          item.title,
          item.detail,
          item.status,
          item.searchText,
          item.originalOwnerName,
          item.actingEmployeeName
        ].some(function (value) {
          return String(value || "").toLowerCase().includes(search);
        });
      });

      return employeeMatch || itemMatch;
    });
  }

  // Tampilan default (tanpa filter team/site/search) tidak perlu menampilkan
  // puluhan ribu baris employee yang kosong -- cukup yang punya leave,
  // event, atau project/issue pada tahun ini. Kalau user memang memfilter
  // team/site tertentu atau mencari sesuatu, roster lengkap tetap
  // ditampilkan (termasuk yang kosong) supaya tetap terlihat siapa yang free.
  if (team === "All Teams" && site === "All Sites" && !search) {
    employees = employees.filter(function (employee) {
      return (personItems[String(employee.EmpId)] || []).length > 0;
    });
  }

  const calendarRows = employees
    .slice()
    .sort(function (a, b) {
      return (
        String(a.Team || "").localeCompare(String(b.Team || "")) ||
        String(a.EmpName || "").localeCompare(String(b.EmpName || ""))
      );
    })
    .map(function (employee) {
      const employeeId = String(employee.EmpId);
      const items = (personItems[employeeId] || []).slice().sort(function (a, b) {
        return (
          String(a.startDate || "").localeCompare(String(b.startDate || "")) ||
          String(a.category || "").localeCompare(String(b.category || "")) ||
          String(a.title || "").localeCompare(String(b.title || ""))
        );
      });

      const activeCount = items.filter(function (item) {
        return item.category !== "LEAVE";
      }).length;

      const actingCount = items.filter(function (item) {
        return Boolean(item.acting);
      }).length;

      return {
        groupKey: "PERSON_" + (employee.Team || "NO_TEAM"),
        groupLabel: "TEAM • " + (employee.Team || "No Team"),
        groupOrder: 1,
        rowKey: "PERSON_" + employeeId,
        rowType: "PERSON",
        label: employee.EmpName || employee.EmpId,
        meta: [employee.Position, employee.SiteDedicated].filter(Boolean).join(" • "),
        chip:
          "Leave YTD " + year + ": " +
          Number(yearlyDaysByEmployee[employeeId] || 0) + " hari" +
          " • Assignment: " + activeCount +
          (actingCount ? " • Acting: " + actingCount : ""),
        items: items
      };
    });

  const visibleItems = [];
  calendarRows.forEach(function (row) {
    (row.items || []).forEach(function (item) {
      visibleItems.push(item);
    });
  });

  const leaveEmployeeSet = {};
  calendarRows.forEach(function (row) {
    if ((row.items || []).some(function (item) {
      return item.category === "LEAVE";
    })) {
      leaveEmployeeSet[row.rowKey] = true;
    }
  });

  return {
    viewMode: viewMode,
    year: year,
    rangeStartISO: rangeStartISO,
    rangeEndISO: rangeEndISO,
    cols: buildCalendarColumns_(viewMode, rangeStart, rangeEnd),
    employees: employees,
    eventsByEmp: personItems,
    yearlyDaysByEmp: yearlyDaysByEmployee,
    yearlyBreakdownByEmp: yearlyBreakdownByEmployee,
    holidays: holidays,
    calendarRows: calendarRows,
    counts: {
      events: visibleItems.filter(function (item) {
        return item.category === "EVENT";
      }).length,
      projects: visibleItems.filter(function (item) {
        return item.category === "PROJECT";
      }).length,
      issues: visibleItems.filter(function (item) {
        return item.category === "ISSUE";
      }).length,
      leaveEmployees: Object.keys(leaveEmployeeSet).length,
      actingTransfers: visibleItems.filter(function (item) {
        return Boolean(item.acting);
      }).length
    }
  };
}

function addPersonCalendarItem_(personItems, employeeId, item) {
  const key = String(employeeId || "").trim();

  if (!key || !item) {
    return;
  }

  if (!personItems[key]) {
    personItems[key] = [];
  }

  personItems[key].push(item);
}

/**
 * Membagi timeline Event, Project, dan Issue berdasarkan periode leave PIC asal.
 * Pada tanggal leave, segmen assignment dipindahkan sementara ke Backup PIC.
 * Data owner/PIC pada sheet tidak berubah; perpindahan hanya untuk tampilan kalender.
 */
function distributeAssignmentToBackup_(assignment, leavesByEmployee, employeeMap) {
  const ownerId = String(assignment.ownerEmpId || "").trim();
  const startDate = parseISO_(assignment.startDate);
  const endDate = parseISO_(assignment.endDate);

  if (!ownerId || !startDate || !endDate || endDate < startDate) {
    return [];
  }

  const owner = employeeMap[ownerId] || {};
  const relevantLeaves = (leavesByEmployee[ownerId] || [])
    .filter(function (leave) {
      return isDateRangeOverlap_(
        assignment.startDate,
        assignment.endDate,
        leave.StartDate,
        leave.EndDate
      );
    })
    .sort(function (a, b) {
      return String(a.StartDate || "").localeCompare(String(b.StartDate || ""));
    });

  if (!relevantLeaves.length) {
    return [Object.assign({}, assignment, {
      employeeId: ownerId,
      acting: false,
      originalOwnerEmpId: ownerId,
      originalOwnerName: owner.EmpName || ownerId
    })];
  }

  const segments = [];
  let cursor = startOfDay_(startDate);

  relevantLeaves.forEach(function (leave) {
    const leaveStart = parseISO_(leave.StartDate);
    const leaveEnd = parseISO_(leave.EndDate);

    if (!leaveStart || !leaveEnd) {
      return;
    }

    const overlapStart = new Date(Math.max(
      startDate.getTime(),
      leaveStart.getTime()
    ));

    const overlapEnd = new Date(Math.min(
      endDate.getTime(),
      leaveEnd.getTime()
    ));

    overlapStart.setHours(0, 0, 0, 0);
    overlapEnd.setHours(0, 0, 0, 0);

    if (overlapEnd < overlapStart || overlapEnd < cursor) {
      return;
    }

    if (cursor < overlapStart) {
      segments.push(Object.assign({}, assignment, {
        employeeId: ownerId,
        startDate: formatISO_(cursor),
        endDate: formatISO_(addDays_(overlapStart, -1)),
        acting: false,
        originalOwnerEmpId: ownerId,
        originalOwnerName: owner.EmpName || ownerId
      }));
    }

    const backupId = String(leave.BackupEmpId || "").trim();
    const backup = employeeMap[backupId] || {};
    const targetId = backupId && backupId !== ownerId ? backupId : ownerId;
    const isActing = targetId !== ownerId;

    segments.push(Object.assign({}, assignment, {
      employeeId: targetId,
      startDate: formatISO_(overlapStart),
      endDate: formatISO_(overlapEnd),
      acting: isActing,
      originalOwnerEmpId: ownerId,
      originalOwnerName: owner.EmpName || ownerId,
      actingEmployeeName: backup.EmpName || backupId,
      leaveRequestId: leave.RequestId || "",
      title: isActing
        ? "ACTING for " + (owner.EmpName || ownerId) + " • " + assignment.title
        : assignment.title,
      detail:
        assignment.detail + "\n" +
        (isActing
          ? "Temporary handover: " +
            (owner.EmpName || ownerId) + " → " +
            (backup.EmpName || backupId) + "\n" +
            "Leave period: " + leave.StartDate + " - " + leave.EndDate + "\n" +
            "Handover note: " + (leave.Note || "-")
          : "Backup PIC tidak valid; assignment tetap pada PIC asal.")
    }));

    cursor = addDays_(overlapEnd, 1);
  });

  if (cursor <= endDate) {
    segments.push(Object.assign({}, assignment, {
      employeeId: ownerId,
      startDate: formatISO_(cursor),
      endDate: formatISO_(endDate),
      acting: false,
      originalOwnerEmpId: ownerId,
      originalOwnerName: owner.EmpName || ownerId
    }));
  }

  return segments.filter(function (segment) {
    const segmentStart = parseISO_(segment.startDate);
    const segmentEnd = parseISO_(segment.endDate);
    return Boolean(segmentStart && segmentEnd && segmentEnd >= segmentStart);
  });
}

function createEvent(payload) {
  payload = payload || {};

  const eventName = String(payload.EventName || "").trim();
  const description = String(payload.Description || "").trim();
  const where = String(payload.Where || "").trim();
  const picEmployeeId = String(payload.PICEmpId || "").trim();
  const eventDateISO = String(payload.EventDate || "").trim();

  if (!eventName) {
    throw new Error("Nama event wajib diisi.");
  }

  if (!description) {
    throw new Error("Deskripsi event wajib diisi.");
  }

  if (!where) {
    throw new Error("Where / lokasi event wajib diisi.");
  }

  if (!picEmployeeId) {
    throw new Error("PIC event wajib dipilih.");
  }

  const eventDate = parseISO_(eventDateISO);

  if (!eventDate) {
    throw new Error("Tanggal event tidak valid.");
  }

  if (eventDate.getTime() < startOfDay_(new Date()).getTime()) {
    throw new Error("Tanggal event tidak boleh sebelum hari ini.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const picEmployee = employeeMap[picEmployeeId];

  if (!picEmployee) {
    throw new Error("PIC tidak ditemukan pada sheet Employees.");
  }

  const eventId = "EV-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const sheet = getOrCreateSheet_(SHEET_EVENTS, EVENT_HEADERS);
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    appendObjectRow_(sheet, EVENT_HEADERS, {
      Timestamp: new Date(),
      EventId: eventId,
      EventName: eventName,
      Description: description,
      Where: where,
      ReadinessUpdate: "",
      ReadinessUpdatedAt: "",
      PICEmpId: picEmployee.EmpId,
      PICName: picEmployee.EmpName,
      PICTeam: picEmployee.Team,
      PICPosition: picEmployee.Position,
      PICSiteDedicated: picEmployee.SiteDedicated,
      EventDate: eventDateISO
    });
  } finally {
    lock.releaseLock();
  }

  return {
    eventId: eventId
  };
}


/**
 * Mengubah informasi utama event yang sudah dibuat.
 * Update kesiapan tetap dipertahankan dan tidak diubah dari fungsi ini.
 */
function updateEvent(payload) {
  payload = payload || {};

  const eventId = String(payload.EventId || "").trim();
  const eventName = String(payload.EventName || "").trim();
  const description = String(payload.Description || "").trim();
  const where = String(payload.Where || "").trim();
  const picEmployeeId = String(payload.PICEmpId || "").trim();
  const eventDateISO = String(payload.EventDate || "").trim();

  if (!eventId) {
    throw new Error("Event ID wajib diisi.");
  }

  if (!eventName) {
    throw new Error("Nama event wajib diisi.");
  }

  if (!description) {
    throw new Error("Deskripsi event wajib diisi.");
  }

  if (!where) {
    throw new Error("Where / lokasi event wajib diisi.");
  }

  if (!picEmployeeId) {
    throw new Error("PIC event wajib dipilih.");
  }

  const eventDate = parseISO_(eventDateISO);

  if (!eventDate) {
    throw new Error("Tanggal event tidak valid.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const picEmployee = employeeMap[picEmployeeId];

  if (!picEmployee) {
    throw new Error("PIC tidak ditemukan pada sheet Employees.");
  }

  const sheet = getOrCreateSheet_(SHEET_EVENTS, EVENT_HEADERS);
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    ensureHeaders_(sheet, EVENT_HEADERS);

    if (sheet.getLastRow() < 2) {
      throw new Error("Data event belum tersedia.");
    }

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map(function (value) {
        return String(value || "").trim();
      });

    const eventIdIndex = headers.indexOf("EventId");

    if (eventIdIndex < 0) {
      throw new Error('Kolom "EventId" tidak ditemukan pada sheet Events.');
    }

    const values = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getValues();

    let targetRow = -1;

    for (let index = 0; index < values.length; index++) {
      if (String(values[index][eventIdIndex] || "").trim() === eventId) {
        targetRow = index + 2;
        break;
      }
    }

    if (targetRow < 2) {
      throw new Error("Event tidak ditemukan: " + eventId);
    }

    setObjectRowValues_(sheet, targetRow, {
      EventName: eventName,
      Description: description,
      Where: where,
      PICEmpId: picEmployee.EmpId,
      PICName: picEmployee.EmpName,
      PICTeam: picEmployee.Team,
      PICPosition: picEmployee.Position,
      PICSiteDedicated: picEmployee.SiteDedicated,
      EventDate: eventDateISO
    });
  } finally {
    lock.releaseLock();
  }

  return {
    eventId: eventId
  };
}

/**
 * Memperbarui hanya kolom Update Kesiapan untuk event yang sudah dibuat.
 * Field event lain tidak diubah.
 */
function updateEventReadiness(payload) {
  payload = payload || {};

  const eventId = String(payload.EventId || "").trim();
  const readinessUpdate = String(payload.ReadinessUpdate || "").trim();

  if (!eventId) {
    throw new Error("Event ID wajib diisi.");
  }

  if (!readinessUpdate) {
    throw new Error("Update Kesiapan wajib diisi.");
  }

  const sheet = getOrCreateSheet_(SHEET_EVENTS, EVENT_HEADERS);
  const lock = LockService.getScriptLock();
  const now = new Date();

  lock.waitLock(30000);

  try {
    ensureHeaders_(sheet, EVENT_HEADERS);

    if (sheet.getLastRow() < 2) {
      throw new Error("Data event belum tersedia.");
    }

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map(function (value) {
        return String(value || "").trim();
      });

    const eventIdIndex = headers.indexOf("EventId");

    if (eventIdIndex < 0) {
      throw new Error('Kolom "EventId" tidak ditemukan pada sheet Events.');
    }

    const values = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getValues();

    let targetRow = -1;

    for (let index = 0; index < values.length; index++) {
      if (String(values[index][eventIdIndex] || "").trim() === eventId) {
        targetRow = index + 2;
        break;
      }
    }

    if (targetRow < 2) {
      throw new Error("Event tidak ditemukan: " + eventId);
    }

    setObjectRowValues_(sheet, targetRow, {
      ReadinessUpdate: readinessUpdate,
      ReadinessUpdatedAt: now
    });
  } finally {
    lock.releaseLock();
  }

  return {
    eventId: eventId,
    readinessUpdate: readinessUpdate,
    readinessUpdatedAt: normalizeDateTimeCell_(now)
  };
}

function getEventMakerData(request) {
  request = request || {};

  const team = String(request.team || "All Teams").trim();
  const site = String(request.site || "All Sites").trim();
  const search = String(request.search || "").trim().toLowerCase();

  const today = startOfDay_(new Date());
  const todayISO = formatISO_(today);
  const thisWeekStart = startOfWeekMonday_(today);
  const thisWeekEnd = addDays_(thisWeekStart, 6);
  const nextWeekStart = addDays_(thisWeekStart, 7);
  const nextWeekEnd = addDays_(thisWeekStart, 13);
  const nextTwoWeekStart = addDays_(thisWeekStart, 14);
  const nextTwoWeekEnd = addDays_(thisWeekStart, 20);

  const periods = {
    today: todayISO,
    thisWeekStart: formatISO_(thisWeekStart),
    thisWeekEnd: formatISO_(thisWeekEnd),
    nextWeekStart: formatISO_(nextWeekStart),
    nextWeekEnd: formatISO_(nextWeekEnd),
    nextTwoWeekStart: formatISO_(nextTwoWeekStart),
    nextTwoWeekEnd: formatISO_(nextTwoWeekEnd)
  };

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  let events = getEvents_().map(function (event) {
    return enrichEvent_(event, employeeMap);
  });

  if (team !== "All Teams") {
    events = events.filter(function (event) {
      return event.PICTeam === team;
    });
  }

  if (site !== "All Sites") {
    events = events.filter(function (event) {
      return event.PICSiteDedicated === site;
    });
  }

  if (search) {
    events = events.filter(function (event) {
      return [
        event.EventName,
        event.Description,
        event.Where,
        event.ReadinessUpdate,
        event.PICName,
        event.PICTeam,
        event.PICSiteDedicated
      ].some(function (value) {
        return String(value || "").toLowerCase().includes(search);
      });
    });
  }

  const visibleEvents = events
    .map(function (event) {
      let scheduleStatus = "More Than 2 Weeks Ahead";
      let scheduleOrder = 4;

      if (String(event.EventDate || "") < todayISO) {
        scheduleStatus = "Previous Event";
        scheduleOrder = 5;
      } else if (isISODateInRange_(event.EventDate, todayISO, periods.thisWeekEnd)) {
        scheduleStatus = "This Week";
        scheduleOrder = 1;
      } else if (isISODateInRange_(event.EventDate, periods.nextWeekStart, periods.nextWeekEnd)) {
        scheduleStatus = "Next Week";
        scheduleOrder = 2;
      } else if (isISODateInRange_(event.EventDate, periods.nextTwoWeekStart, periods.nextTwoWeekEnd)) {
        scheduleStatus = "Next 2 Week";
        scheduleOrder = 3;
      }

      return Object.assign({}, event, {
        ScheduleStatus: scheduleStatus,
        ScheduleOrder: scheduleOrder
      });
    })
    .sort(function (a, b) {
      const aPrevious = a.ScheduleStatus === "Previous Event";
      const bPrevious = b.ScheduleStatus === "Previous Event";

      if (aPrevious && bPrevious) {
        return (
          String(b.EventDate || "").localeCompare(String(a.EventDate || "")) ||
          String(a.EventName || "").localeCompare(String(b.EventName || ""))
        );
      }

      if (aPrevious !== bPrevious) {
        return aPrevious ? 1 : -1;
      }

      return (
        Number(a.ScheduleOrder || 99) - Number(b.ScheduleOrder || 99) ||
        sortEventByDate_(a, b)
      );
    });

  const counts = {
    thisWeek: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "This Week";
    }).length,
    nextWeek: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "Next Week";
    }).length,
    nextTwoWeek: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "Next 2 Week";
    }).length,
    moreThanTwoWeeks: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "More Than 2 Weeks Ahead";
    }).length,
    previous: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "Previous Event";
    }).length
  };

  return {
    periods: periods,
    counts: counts,
    events: visibleEvents,
    thisWeek: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "This Week";
    }),
    nextWeek: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "Next Week";
    }),
    nextTwoWeek: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "Next 2 Week";
    }),
    moreThanTwoWeeks: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "More Than 2 Weeks Ahead";
    }),
    previous: visibleEvents.filter(function (event) {
      return event.ScheduleStatus === "Previous Event";
    })
  };
}

function getAvailableOverviewYears_() {
  const yearMap = {};
  const currentYear = new Date().getFullYear();

  yearMap[currentYear] = true;
  yearMap[currentYear - 1] = true;

  function addDateYear(value) {
    const date = parseISO_(normalizeDateCell_(value));
    if (date) {
      yearMap[date.getFullYear()] = true;
    }
  }

  try {
    getLeaveRequests_().forEach(function (leave) {
      addDateYear(leave.StartDate);
      addDateYear(leave.EndDate);
    });
  } catch (error) {
    // Tetap kembalikan tahun default apabila data leave belum siap.
  }

  try {
    getEvents_().forEach(function (event) {
      addDateYear(event.EventDate);
    });
  } catch (error) {
    // Tetap kembalikan tahun default apabila data event belum siap.
  }

  try {
    getTrackers_().forEach(function (tracker) {
      addDateYear(tracker.StartDate);
      addDateYear(tracker.DueDate);
    });
  } catch (error) {
    // Tetap kembalikan tahun default apabila tracker belum siap.
  }

  return Object.keys(yearMap)
    .map(function (year) {
      return Number(year);
    })
    .filter(function (year) {
      return Number.isFinite(year);
    })
    .sort(function (a, b) {
      return b - a;
    });
}

function buildReferenceDateForYear_(today, selectedYear) {
  const month = today.getMonth();
  const requestedDay = today.getDate();
  const lastDay = new Date(selectedYear, month + 1, 0).getDate();
  const result = new Date(selectedYear, month, Math.min(requestedDay, lastDay));
  result.setHours(0, 0, 0, 0);
  return result;
}

function trackerOverlapsYear_(tracker, yearStartISO, yearEndISO) {
  const startISO = String(tracker.StartDate || "");
  const endISO = String(tracker.DueDate || tracker.StartDate || "");

  if (!startISO && !endISO) {
    return true;
  }

  const effectiveStart = startISO || endISO;
  const effectiveEnd = endISO || startISO;

  return effectiveStart <= yearEndISO && effectiveEnd >= yearStartISO;
}

/* =========================================================
 * DATA ACCESS
 * ========================================================= */

function getEmployees_() {
  const table = readTable_(getSheet_(SHEET_EMPLOYEES));
  const head = table.head;
  const rows = table.rows;

  const indexEmployeeId = head.indexOf("EmpId");
  const indexSID = head.indexOf("SID");
  const indexEmployeeName = head.indexOf("EmpName");
  const indexPosition = head.indexOf("Position");
  const indexTeam = head.indexOf("Team");
  const indexSite = findHeaderIndex_(head, [
    "Site_Dedicated",
    "SiteDedicated",
    "Site Dedicated"
  ]);
  const indexPhoto = head.indexOf("PhotoUrl");
  const indexCompany = head.indexOf("Company");

  if (indexEmployeeId < 0 || indexEmployeeName < 0) {
    throw new Error('Employees wajib memiliki kolom "EmpId" dan "EmpName".');
  }

  return rows
    .map(function (row) {
      return {
        EmpId: getCellString_(row, indexEmployeeId),
        SID: getCellString_(row, indexSID),
        EmpName: getCellString_(row, indexEmployeeName),
        Position: getCellString_(row, indexPosition),
        Team: getCellString_(row, indexTeam),
        SiteDedicated: getCellString_(row, indexSite),
        Company: getCellString_(row, indexCompany),
        PhotoUrl: getCellString_(row, indexPhoto)
      };
    })
    .filter(function (employee) {
      return employee.EmpId && employee.EmpName;
    });
}

/**
 * Pencarian karyawan server-side (dipakai oleh kotak cari PIC di seluruh
 * halaman & halaman absensi publik) -- sheet Employees sekarang puluhan
 * ribu baris, jadi TIDAK boleh lagi dikirim penuh ke client. Hanya
 * mengembalikan sejumlah kecil hasil yang cocok.
 */
function getEmployeeSearchResults(request) {
  request = request || {};

  const text = String(request.query || "").trim().toLowerCase();
  const limit = clampInteger_(request.limit, 1, 50, 20);

  if (!text) {
    return [];
  }

  const matches = getEmployees_().filter(function (employee) {
    return (
      (employee.EmpName || "").toLowerCase().indexOf(text) >= 0 ||
      (employee.EmpId || "").toLowerCase().indexOf(text) >= 0 ||
      (employee.Company || "").toLowerCase().indexOf(text) >= 0 ||
      (employee.Team || "").toLowerCase().indexOf(text) >= 0
    );
  });

  return matches.slice(0, limit);
}

function getLeaveTypes_() {
  const table = readTable_(getSheet_(SHEET_LEAVE_TYPES));
  const head = table.head;
  const rows = table.rows;

  const indexType = head.indexOf("LeaveType");
  const indexAvailable = head.indexOf("AvailableDays");

  if (indexType < 0) {
    throw new Error('LeaveTypes wajib memiliki kolom "LeaveType".');
  }

  return rows
    .map(function (row) {
      return {
        LeaveType: getCellString_(row, indexType),
        AvailableDays: getCellString_(row, indexAvailable)
      };
    })
    .filter(function (item) {
      return item.LeaveType;
    });
}

function getLeaveRequests_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_LEAVE_REQUESTS);

  if (!sheet) {
    return [];
  }

  const table = readTable_(sheet);
  const head = table.head;
  const rows = table.rows;

  if (!head.length) {
    return [];
  }

  const index = headerIndexMap_(head);

  if (
    index.EmpId < 0 ||
    index.LeaveType < 0 ||
    index.StartDate < 0 ||
    index.EndDate < 0
  ) {
    throw new Error(
      "LeaveRequests wajib memiliki kolom EmpId, LeaveType, StartDate, dan EndDate."
    );
  }

  return rows
    .map(function (row) {
      return {
        RequestId: getCellString_(row, index.RequestId),
        EmpId: getCellString_(row, index.EmpId),
        EmpName: getCellString_(row, index.EmpName),
        Team: getCellString_(row, index.Team),
        Position: getCellString_(row, index.Position),
        LeaveType: getCellString_(row, index.LeaveType),
        StartDate: normalizeDateCell_(row[index.StartDate]),
        EndDate: normalizeDateCell_(row[index.EndDate]),
        StartTime: normalizeTimeCellByIndex_(row, index.StartTime),
        EndTime: normalizeTimeCellByIndex_(row, index.EndTime),
        Note: getCellString_(row, index.Note),
        BackupEmpId: getCellString_(row, index.BackupEmpId),
        BackupEmpName: getCellString_(row, index.BackupEmpName),
        BackupTeam: getCellString_(row, index.BackupTeam),
        BackupPosition: getCellString_(row, index.BackupPosition),
        SiteDedicated: getCellString_(row, index.SiteDedicated),
        BackupSiteDedicated: getCellString_(row, index.BackupSiteDedicated)
      };
    })
    .filter(function (leave) {
      return leave.EmpId && leave.StartDate && leave.EndDate;
    });
}

function getEvents_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_EVENTS);

  if (!sheet) {
    return [];
  }

  const table = readTable_(sheet);
  const head = table.head;
  const rows = table.rows;

  if (!head.length) {
    return [];
  }

  const index = headerIndexMap_(head);

  if (index.EventName < 0 || index.PICEmpId < 0 || index.EventDate < 0) {
    throw new Error(
      "Events wajib memiliki kolom EventName, PICEmpId, dan EventDate."
    );
  }

  return rows
    .map(function (row) {
      return {
        EventId: getCellString_(row, index.EventId),
        EventName: getCellString_(row, index.EventName),
        Description: getCellString_(row, index.Description),
        Where: getCellString_(row, index.Where),
        ReadinessUpdate: getCellString_(row, index.ReadinessUpdate),
        ReadinessUpdatedAt: index.ReadinessUpdatedAt >= 0
          ? normalizeDateTimeCell_(row[index.ReadinessUpdatedAt])
          : "",
        PICEmpId: getCellString_(row, index.PICEmpId),
        PICName: getCellString_(row, index.PICName),
        PICTeam: getCellString_(row, index.PICTeam),
        PICPosition: getCellString_(row, index.PICPosition),
        PICSiteDedicated: getCellString_(row, index.PICSiteDedicated),
        EventDate: normalizeDateCell_(row[index.EventDate])
      };
    })
    .filter(function (event) {
      return event.EventName && event.EventDate;
    });
}

function getTrackers_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_TRACKERS);

  if (!sheet) {
    return [];
  }

  const table = readTable_(sheet);
  const head = table.head;
  const rows = table.rows;

  if (!head.length) {
    return [];
  }

  const index = headerIndexMap_(head);

  if (index.TrackerId < 0 || index.TrackerType < 0) {
    throw new Error(
      "ProjectIssueTracker wajib memiliki TrackerId dan TrackerType."
    );
  }

  return rows
    .map(function (row, rowIndex) {
      const legacyStatus = getCellString_(row, index.Status);
      const legacyPercent =
        legacyStatus.toLowerCase() === "closed" ? 100 : 0;

      return {
        SheetRow: rowIndex + 2,
        TrackerId: getCellString_(row, index.TrackerId),
        TrackerType: getCellString_(row, index.TrackerType),
        ProjectIssueName:
          getCellString_(row, index.ProjectIssueName) ||
          getCellString_(row, index.Title),
        Department:
          getCellString_(row, index.Department) ||
          getCellString_(row, index.PICTeam),
        OwnerEmpId: getCellString_(row, index.OwnerEmpId),
        OwnerName: getCellString_(row, index.OwnerName),
        OwnerTeam: getCellString_(row, index.OwnerTeam),
        OwnerPosition: getCellString_(row, index.OwnerPosition),
        OwnerSiteDedicated: getCellString_(row, index.OwnerSiteDedicated),
        ProjectLeaderEmpId:
          getCellString_(row, index.ProjectLeaderEmpId) ||
          getCellString_(row, index.PICEmpId),
        ProjectLeaderName:
          getCellString_(row, index.ProjectLeaderName) ||
          getCellString_(row, index.PICName),
        ProjectLeaderTeam:
          getCellString_(row, index.ProjectLeaderTeam) ||
          getCellString_(row, index.PICTeam),
        ProjectLeaderPosition:
          getCellString_(row, index.ProjectLeaderPosition) ||
          getCellString_(row, index.PICPosition),
        ProjectLeaderSiteDedicated:
          getCellString_(row, index.ProjectLeaderSiteDedicated) ||
          getCellString_(row, index.PICSiteDedicated),
        Site:
          getCellString_(row, index.Site) ||
          getCellString_(row, index.PICSiteDedicated),
        DescriptionProject:
          getCellString_(row, index.DescriptionProject) ||
          getCellString_(row, index.Description),
        BackgroundProject: getCellString_(row, index.BackgroundProject),
        ImpactProject: getCellString_(row, index.ImpactProject),
        StartDate: normalizeDateCellByIndex_(row, index.StartDate),
        DueDate: normalizeDateCellByIndex_(row, index.DueDate),
        SuccessIndicator: getCellString_(row, index.SuccessIndicator),
        CurrentPercentComplete:
          index.CurrentPercentComplete >= 0 &&
          getCellString_(row, index.CurrentPercentComplete) !== ""
            ? normalizePercentComplete_(row[index.CurrentPercentComplete])
            : legacyPercent,
        CurrentProgressReportWeekly:
          getCellString_(row, index.CurrentProgressReportWeekly) ||
          getCellString_(row, index.ProgressUpdate),
        CurrentRemarks: getCellString_(row, index.CurrentRemarks),
        Status: legacyStatus,
        LastUpdated: normalizeDateTimeCell_(
          index.LastUpdated >= 0 ? row[index.LastUpdated] : ""
        )
      };
    })
    .filter(function (tracker) {
      return tracker.TrackerId && tracker.ProjectIssueName;
    });
}

function getTrackerSubTasks_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_TRACKER_TASKS);

  if (!sheet) {
    return [];
  }

  const table = readTable_(sheet);
  const head = table.head;
  const rows = table.rows;

  if (!head.length) {
    return [];
  }

  const index = headerIndexMap_(head);

  if (index.SubTaskId < 0 || index.TrackerId < 0) {
    throw new Error("ProjectIssueSubTasks wajib memiliki SubTaskId dan TrackerId.");
  }

  return rows
    .map(function (row, rowIndex) {
      return {
        SheetRow: rowIndex + 2,
        Timestamp: normalizeDateTimeCell_(
          index.Timestamp >= 0 ? row[index.Timestamp] : ""
        ),
        SubTaskId: getCellString_(row, index.SubTaskId),
        TrackerId: getCellString_(row, index.TrackerId),
        SubTaskName: getCellString_(row, index.SubTaskName),
        Department: getCellString_(row, index.Department),
        PICEmpId: getCellString_(row, index.PICEmpId),
        PICName: getCellString_(row, index.PICName),
        PICTeam: getCellString_(row, index.PICTeam),
        PICPosition: getCellString_(row, index.PICPosition),
        PICSiteDedicated: getCellString_(row, index.PICSiteDedicated),
        Site: getCellString_(row, index.Site),
        DescriptionSubTask: getCellString_(row, index.DescriptionSubTask),
        StartDate: normalizeDateCellByIndex_(row, index.StartDate),
        DueDate: normalizeDateCellByIndex_(row, index.DueDate),
        SuccessIndicator: getCellString_(row, index.SuccessIndicator),
        CurrentPercentComplete: normalizePercentComplete_(
          index.CurrentPercentComplete >= 0 ? row[index.CurrentPercentComplete] : 0
        ),
        CurrentProgressReportWeekly: getCellString_(
          row,
          index.CurrentProgressReportWeekly
        ),
        CurrentRemarks: getCellString_(row, index.CurrentRemarks),
        Status: getCellString_(row, index.Status),
        LastUpdated: normalizeDateTimeCell_(
          index.LastUpdated >= 0 ? row[index.LastUpdated] : ""
        )
      };
    })
    .filter(function (task) {
      return task.SubTaskId && task.TrackerId && task.SubTaskName;
    });
}

function getTrackerSubTaskUpdateLogs_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_TRACKER_TASK_UPDATES);

  if (!sheet) {
    return [];
  }

  const table = readTable_(sheet);
  const head = table.head;
  const rows = table.rows;

  if (!head.length) {
    return [];
  }

  const index = headerIndexMap_(head);

  return rows
    .map(function (row) {
      return {
        Timestamp: normalizeDateTimeCell_(
          index.Timestamp >= 0 ? row[index.Timestamp] : ""
        ),
        UpdateId: getCellString_(row, index.UpdateId),
        TrackerId: getCellString_(row, index.TrackerId),
        SubTaskId: getCellString_(row, index.SubTaskId),
        PercentComplete: normalizePercentComplete_(
          index.PercentComplete >= 0 ? row[index.PercentComplete] : 0
        ),
        ProgressReportWeekly: getCellString_(row, index.ProgressReportWeekly),
        Remarks: getCellString_(row, index.Remarks),
        Status: getCellString_(row, index.Status),
        UpdatedByEmpId: getCellString_(row, index.UpdatedByEmpId),
        UpdatedByName: getCellString_(row, index.UpdatedByName),
        UpdatedByTeam: getCellString_(row, index.UpdatedByTeam),
        UpdatedByPosition: getCellString_(row, index.UpdatedByPosition),
        UpdatedBySiteDedicated: getCellString_(row, index.UpdatedBySiteDedicated)
      };
    })
    .filter(function (log) {
      return log.SubTaskId && log.UpdateId;
    });
}

function getTrackerUpdateLogs_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_TRACKER_UPDATES);

  if (!sheet) {
    return [];
  }

  const table = readTable_(sheet);
  const head = table.head;
  const rows = table.rows;

  if (!head.length) {
    return [];
  }

  const index = headerIndexMap_(head);

  return rows
    .map(function (row) {
      return {
        Timestamp: normalizeDateTimeCell_(
          index.Timestamp >= 0 ? row[index.Timestamp] : ""
        ),
        UpdateId: getCellString_(row, index.UpdateId),
        TrackerId: getCellString_(row, index.TrackerId),
        PercentComplete: normalizePercentComplete_(
          index.PercentComplete >= 0 ? row[index.PercentComplete] : 0
        ),
        ProgressReportWeekly: getCellString_(row, index.ProgressReportWeekly),
        Remarks: getCellString_(row, index.Remarks),
        Status: getCellString_(row, index.Status),
        UpdatedByEmpId: getCellString_(row, index.UpdatedByEmpId),
        UpdatedByName: getCellString_(row, index.UpdatedByName),
        UpdatedByTeam: getCellString_(row, index.UpdatedByTeam),
        UpdatedByPosition: getCellString_(row, index.UpdatedByPosition),
        UpdatedBySiteDedicated: getCellString_(row, index.UpdatedBySiteDedicated)
      };
    })
    .filter(function (log) {
      return log.TrackerId && log.UpdateId;
    });
}

function getHolidaysMap_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_HOLIDAYS);

  if (!sheet) {
    return {};
  }

  const table = readTable_(sheet);
  const head = table.head;
  const rows = table.rows;

  const indexDate = head.indexOf("Date");
  const indexName = head.indexOf("Name");

  if (indexDate < 0 || indexName < 0) {
    throw new Error('Holidays wajib memiliki kolom "Date" dan "Name".');
  }

  const result = {};

  rows.forEach(function (row) {
    const iso = normalizeDateCell_(row[indexDate]);
    if (iso) {
      result[iso] = String(row[indexName] || "Holiday").trim();
    }
  });

  return result;
}

/* =========================================================
 * LEAVE & EVENT HELPERS
 * ========================================================= */

function findLeaveOverlaps_(employeeId, startISO, endISO, excludeRequestId) {
  const newStart = parseISO_(startISO);
  const newEnd = parseISO_(endISO);

  if (!employeeId || !newStart || !newEnd) {
    return [];
  }

  return getLeaveRequests_()
    .filter(function (leave) {
      return String(leave.EmpId) === String(employeeId);
    })
    .filter(function (leave) {
      return (
        !excludeRequestId ||
        String(leave.RequestId || "") !== String(excludeRequestId)
      );
    })
    .map(function (leave) {
      const oldStart = parseISO_(leave.StartDate);
      const oldEnd = parseISO_(leave.EndDate);

      if (!oldStart || !oldEnd) {
        return null;
      }

      const isOverlap =
        newStart.getTime() <= oldEnd.getTime() &&
        newEnd.getTime() >= oldStart.getTime();

      if (!isOverlap) {
        return null;
      }

      const result = Object.assign({}, leave);
      result.OverlapStart = formatISO_(new Date(Math.max(
        newStart.getTime(),
        oldStart.getTime()
      )));
      result.OverlapEnd = formatISO_(new Date(Math.min(
        newEnd.getTime(),
        oldEnd.getTime()
      )));

      return result;
    })
    .filter(Boolean)
    .sort(function (a, b) {
      return String(a.OverlapStart || "").localeCompare(
        String(b.OverlapStart || "")
      );
    });
}

function buildOverlapMessage_(overlaps) {
  const first = overlaps[0] || {};
  const suffix = overlaps.length > 1
    ? " dan " + (overlaps.length - 1) + " request lain"
    : "";

  return (
    "Tanggal beririsan dengan " +
    (first.LeaveType || "Leave") +
    " (" +
    (first.StartDate || "-") +
    " sampai " +
    (first.EndDate || "-") +
    ")" +
    suffix +
    "."
  );
}

function enrichLeave_(leave, employeeMap) {
  const employee = employeeMap[String(leave.EmpId)] || {};
  const backupEmployee = employeeMap[String(leave.BackupEmpId)] || {};

  return Object.assign({}, leave, {
    EmpName: leave.EmpName || employee.EmpName || "",
    Team: leave.Team || employee.Team || "",
    Position: leave.Position || employee.Position || "",
    SiteDedicated:
      leave.SiteDedicated || employee.SiteDedicated || "",
    BackupEmpName:
      leave.BackupEmpName || backupEmployee.EmpName || "",
    BackupTeam:
      leave.BackupTeam || backupEmployee.Team || "",
    BackupPosition:
      leave.BackupPosition || backupEmployee.Position || "",
    BackupSiteDedicated:
      leave.BackupSiteDedicated || backupEmployee.SiteDedicated || ""
  });
}

function enrichEvent_(event, employeeMap) {
  const picEmployee = employeeMap[String(event.PICEmpId)] || {};

  return Object.assign({}, event, {
    PICName: event.PICName || picEmployee.EmpName || "",
    PICTeam: event.PICTeam || picEmployee.Team || "",
    PICPosition: event.PICPosition || picEmployee.Position || "",
    PICSiteDedicated:
      event.PICSiteDedicated || picEmployee.SiteDedicated || "",
    PICCompany: event.PICCompany || picEmployee.Company || ""
  });
}

function sortLeaveByDate_(a, b) {
  return (
    String(a.StartDate || "").localeCompare(String(b.StartDate || "")) ||
    String(a.EmpName || "").localeCompare(String(b.EmpName || ""))
  );
}

function sortEventByDate_(a, b) {
  return (
    String(a.EventDate || "").localeCompare(String(b.EventDate || "")) ||
    String(a.EventName || "").localeCompare(String(b.EventName || ""))
  );
}

/* =========================================================
 * ABSENSI ONLINE (QR CHECK-IN) & NOTULENSI EVENT
 * ========================================================= */

function findEventById_(eventId) {
  const id = String(eventId || "").trim();

  return getEvents_().find(function (event) {
    return String(event.EventId) === id;
  });
}

function findRowIndexByValue_(sheet, columnName, value) {
  const table = readTable_(sheet);

  if (!table.head.length) {
    return -1;
  }

  const columnIndex = table.head.indexOf(columnName);

  if (columnIndex < 0) {
    return -1;
  }

  const values = table.rows;

  for (let index = 0; index < values.length; index++) {
    if (String(values[index][columnIndex] || "").trim() === String(value)) {
      return index + 2;
    }
  }

  return -1;
}

function getEventAttendanceRows_(eventId) {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_EVENT_ATTENDANCE);

  if (!sheet) {
    return [];
  }

  const table = readTable_(sheet);
  const head = table.head;

  if (!head.length) {
    return [];
  }

  const index = headerIndexMap_(head);
  const id = String(eventId || "").trim();

  return table.rows
    .map(function (row) {
      return {
        AttendanceId: getCellString_(row, index.AttendanceId),
        EventId: getCellString_(row, index.EventId),
        EmpId: getCellString_(row, index.EmpId),
        EmpName: getCellString_(row, index.EmpName),
        Team: getCellString_(row, index.Team),
        Position: getCellString_(row, index.Position),
        SiteDedicated: getCellString_(row, index.SiteDedicated),
        CheckInAt:
          index.CheckInAt >= 0 ? normalizeDateTimeCell_(row[index.CheckInAt]) : ""
      };
    })
    .filter(function (row) {
      return row.EventId && row.EventId === id;
    })
    .sort(function (a, b) {
      return String(a.CheckInAt || "").localeCompare(String(b.CheckInAt || ""));
    });
}

function getEventActionItemRows_(eventId) {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_EVENT_ACTION_ITEMS);

  if (!sheet) {
    return [];
  }

  const table = readTable_(sheet);
  const head = table.head;

  if (!head.length) {
    return [];
  }

  const index = headerIndexMap_(head);
  const id = String(eventId || "").trim();

  return table.rows
    .map(function (row) {
      return {
        ActionItemId: getCellString_(row, index.ActionItemId),
        EventId: getCellString_(row, index.EventId),
        Task: getCellString_(row, index.Task),
        PICEmpId: getCellString_(row, index.PICEmpId),
        PICName: getCellString_(row, index.PICName),
        DueDate: index.DueDate >= 0 ? normalizeDateCell_(row[index.DueDate]) : "",
        Status: getCellString_(row, index.Status) || "Open"
      };
    })
    .filter(function (row) {
      return row.EventId && row.EventId === id;
    });
}

/**
 * Data untuk halaman check-in publik (hasil scan QR). Tidak butuh login --
 * siapa pun yang membuka link/QR bisa memuat data ini.
 */
function getEventCheckinInfo(eventId) {
  const event = findEventById_(eventId);

  if (!event) {
    throw new Error("Event tidak ditemukan atau QR sudah tidak berlaku.");
  }

  const attendance = getEventAttendanceRows_(event.EventId);

  return {
    event: {
      EventId: event.EventId,
      EventName: event.EventName,
      Description: event.Description,
      Where: event.Where,
      EventDate: event.EventDate
    },
    checkedInEmpIds: attendance.map(function (row) {
      return row.EmpId;
    }),
    attendanceCount: attendance.length
  };
}

/**
 * Submit absensi dari halaman check-in publik. Satu EmpId hanya bisa
 * absen sekali per event -- percobaan kedua dikembalikan sebagai info,
 * bukan error, supaya tidak membingungkan peserta yang scan ulang.
 */
function submitEventCheckin(payload) {
  payload = payload || {};

  const eventId = String(payload.EventId || "").trim();
  const empId = String(payload.EmpId || "").trim();

  if (!eventId) {
    throw new Error("Event ID wajib diisi.");
  }

  if (!empId) {
    throw new Error("Silakan pilih nama Anda terlebih dahulu.");
  }

  const event = findEventById_(eventId);

  if (!event) {
    throw new Error("Event tidak ditemukan atau QR sudah tidak berlaku.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const employee = employeeMap[empId];

  if (!employee) {
    throw new Error("Nama tidak ditemukan pada data Employees.");
  }

  const sheet = getOrCreateSheet_(SHEET_EVENT_ATTENDANCE, EVENT_ATTENDANCE_HEADERS);
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    ensureHeaders_(sheet, EVENT_ATTENDANCE_HEADERS);

    const existing = getEventAttendanceRows_(eventId).find(function (row) {
      return row.EmpId === empId;
    });

    if (existing) {
      return {
        alreadyCheckedIn: true,
        empName: employee.EmpName,
        checkInAt: existing.CheckInAt
      };
    }

    const now = new Date();
    const attendanceId = "ATT-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    appendObjectRow_(sheet, EVENT_ATTENDANCE_HEADERS, {
      Timestamp: now,
      AttendanceId: attendanceId,
      EventId: eventId,
      EmpId: employee.EmpId,
      EmpName: employee.EmpName,
      Team: employee.Team,
      Position: employee.Position,
      SiteDedicated: employee.SiteDedicated,
      CheckInAt: now
    });

    // Data absensi sudah tersimpan di atas -- kalau format tanggal untuk
    // respons gagal karena sebab apa pun, jangan sampai peserta melihat
    // pesan error padahal kehadirannya sebenarnya sudah tercatat.
    let checkInAtLabel;
    try {
      checkInAtLabel = normalizeDateTimeCell_(now);
    } catch (formatError) {
      checkInAtLabel = now.toISOString();
    }

    return {
      alreadyCheckedIn: false,
      empName: employee.EmpName,
      checkInAt: checkInAtLabel
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ringkasan daftar hadir untuk admin (Event Maker), bukan halaman publik.
 */
function getEventAttendanceSummary(eventId) {
  const event = findEventById_(eventId);

  if (!event) {
    throw new Error("Event tidak ditemukan.");
  }

  const attendance = getEventAttendanceRows_(event.EventId);

  return {
    event: {
      EventId: event.EventId,
      EventName: event.EventName,
      EventDate: event.EventDate
    },
    attendance: attendance,
    attendanceCount: attendance.length
  };
}

/**
 * Notulensi (ringkasan rapat + action item) untuk satu event.
 */
function getEventMinutes(eventId) {
  const event = findEventById_(eventId);

  if (!event) {
    throw new Error("Event tidak ditemukan.");
  }

  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_EVENT_MINUTES);

  let summary = "";
  let updatedAt = "";
  let updatedByName = "";

  if (sheet) {
    const table = readTable_(sheet);
    const index = headerIndexMap_(table.head);

    const row = table.rows.find(function (candidate) {
      return getCellString_(candidate, index.EventId) === event.EventId;
    });

    if (row) {
      summary = getCellString_(row, index.Summary);
      updatedAt =
        index.UpdatedAt >= 0 ? normalizeDateTimeCell_(row[index.UpdatedAt]) : "";
      updatedByName = getCellString_(row, index.UpdatedByName);
    }
  }

  return {
    eventId: event.EventId,
    eventName: event.EventName,
    summary: summary,
    updatedAt: updatedAt,
    updatedByName: updatedByName,
    actionItems: getEventActionItemRows_(event.EventId)
  };
}

/**
 * Simpan / perbarui ringkasan notulensi (bukan action item -- itu terpisah,
 * lihat addEventActionItem / updateEventActionItemStatus).
 */
function saveEventMinutes(payload) {
  payload = payload || {};

  const eventId = String(payload.EventId || "").trim();
  const summary = String(payload.Summary || "").trim();

  if (!eventId) {
    throw new Error("Event ID wajib diisi.");
  }

  const event = findEventById_(eventId);

  if (!event) {
    throw new Error("Event tidak ditemukan.");
  }

  const updatedByEmpId = String(payload.UpdatedByEmpId || "").trim();
  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const updatedByEmployee = employeeMap[updatedByEmpId] || {};

  const sheet = getOrCreateSheet_(SHEET_EVENT_MINUTES, EVENT_MINUTES_HEADERS);
  const lock = LockService.getScriptLock();
  const now = new Date();

  lock.waitLock(30000);

  try {
    ensureHeaders_(sheet, EVENT_MINUTES_HEADERS);

    const targetRow = findRowIndexByValue_(sheet, "EventId", eventId);

    const rowValues = {
      Summary: summary,
      UpdatedAt: now,
      UpdatedByEmpId: updatedByEmpId,
      UpdatedByName: updatedByEmployee.EmpName || ""
    };

    if (targetRow > 0) {
      setObjectRowValues_(sheet, targetRow, rowValues);
    } else {
      appendObjectRow_(
        sheet,
        EVENT_MINUTES_HEADERS,
        Object.assign({ Timestamp: now, EventId: eventId }, rowValues)
      );
    }
  } finally {
    lock.releaseLock();
  }

  return getEventMinutes(eventId);
}

/**
 * Tambah satu action item baru pada notulensi event.
 */
function addEventActionItem(payload) {
  payload = payload || {};

  const eventId = String(payload.EventId || "").trim();
  const task = String(payload.Task || "").trim();
  const picEmployeeId = String(payload.PICEmpId || "").trim();
  const dueDateISO = String(payload.DueDate || "").trim();

  if (!eventId) {
    throw new Error("Event ID wajib diisi.");
  }

  if (!task) {
    throw new Error("Action item wajib diisi.");
  }

  const event = findEventById_(eventId);

  if (!event) {
    throw new Error("Event tidak ditemukan.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const picEmployee = employeeMap[picEmployeeId] || {};

  const sheet = getOrCreateSheet_(SHEET_EVENT_ACTION_ITEMS, EVENT_ACTION_ITEM_HEADERS);
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    ensureHeaders_(sheet, EVENT_ACTION_ITEM_HEADERS);

    const actionItemId = "AI-" + Utilities.getUuid().slice(0, 8).toUpperCase();

    appendObjectRow_(sheet, EVENT_ACTION_ITEM_HEADERS, {
      Timestamp: new Date(),
      ActionItemId: actionItemId,
      EventId: eventId,
      Task: task,
      PICEmpId: picEmployeeId,
      PICName: picEmployee.EmpName || "",
      DueDate: dueDateISO,
      Status: "Open"
    });
  } finally {
    lock.releaseLock();
  }

  return getEventMinutes(eventId);
}

/**
 * Tandai action item selesai / buka kembali.
 */
function updateEventActionItemStatus(payload) {
  payload = payload || {};

  const actionItemId = String(payload.ActionItemId || "").trim();
  const status = String(payload.Status || "").trim();
  const eventId = String(payload.EventId || "").trim();

  if (!actionItemId) {
    throw new Error("Action Item ID wajib diisi.");
  }

  if (status !== "Open" && status !== "Done") {
    throw new Error('Status wajib "Open" atau "Done".');
  }

  const sheet = getOrCreateSheet_(SHEET_EVENT_ACTION_ITEMS, EVENT_ACTION_ITEM_HEADERS);
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    ensureHeaders_(sheet, EVENT_ACTION_ITEM_HEADERS);

    const targetRow = findRowIndexByValue_(sheet, "ActionItemId", actionItemId);

    if (targetRow < 0) {
      throw new Error("Action item tidak ditemukan.");
    }

    setObjectRowValues_(sheet, targetRow, { Status: status });
  } finally {
    lock.releaseLock();
  }

  return getEventMinutes(eventId);
}

function enrichTrackerSubTask_(task, employeeMap) {
  const picEmployee = employeeMap[String(task.PICEmpId)] || {};
  const percentComplete = normalizePercentComplete_(task.CurrentPercentComplete);
  const effectiveStatus = deriveTrackerStatus_(
    percentComplete,
    task.DueDate,
    formatISO_(startOfDay_(new Date()))
  );

  return Object.assign({}, task, {
    PICName: task.PICName || picEmployee.EmpName || "",
    PICTeam: task.PICTeam || picEmployee.Team || "",
    PICPosition: task.PICPosition || picEmployee.Position || "",
    PICSiteDedicated:
      task.PICSiteDedicated || picEmployee.SiteDedicated || "",
    PICCompany: task.PICCompany || picEmployee.Company || "",
    Department: task.Department || task.PICTeam || picEmployee.Team || "",
    Site: task.Site || task.PICSiteDedicated || picEmployee.SiteDedicated || "",
    CurrentPercentComplete: percentComplete,
    Status: effectiveStatus,
    EffectiveStatus: effectiveStatus
  });
}

function calculateTrackerAggregate_(tasks, parentDueDate, todayISO) {
  const list = tasks || [];

  if (!list.length) {
    return {
      PercentComplete: 0,
      Status: deriveTrackerStatus_(0, parentDueDate, todayISO),
      ClosedCount: 0,
      OverdueCount: 0,
      OnGoingCount: 0,
      ProgressSummary: "Belum ada sub task.",
      RemarksSummary: "Tambahkan sub task dan PIC untuk memulai tracking.",
      LastUpdated: ""
    };
  }

  const percentComplete = Math.round(
    list.reduce(function (total, task) {
      return total + normalizePercentComplete_(task.CurrentPercentComplete);
    }, 0) / list.length * 100
  ) / 100;

  const closedCount = list.filter(function (task) {
    return task.EffectiveStatus === "Closed";
  }).length;
  const overdueCount = list.filter(function (task) {
    return task.EffectiveStatus === "Overdue";
  }).length;
  const onGoingCount = list.length - closedCount - overdueCount;

  let status = "On Going";
  if (closedCount === list.length) {
    status = "Closed";
  } else if (
    overdueCount > 0 ||
    (parentDueDate && todayISO && String(parentDueDate) < String(todayISO))
  ) {
    status = "Overdue";
  }

  const latestTask = list.slice().sort(function (a, b) {
    return String(b.LastUpdated || "").localeCompare(String(a.LastUpdated || ""));
  })[0] || {};

  return {
    PercentComplete: percentComplete,
    Status: status,
    ClosedCount: closedCount,
    OverdueCount: overdueCount,
    OnGoingCount: onGoingCount,
    ProgressSummary:
      closedCount + "/" + list.length + " sub task closed" +
      (latestTask.CurrentProgressReportWeekly
        ? ". Latest - " + latestTask.SubTaskName + ": " + latestTask.CurrentProgressReportWeekly
        : "."),
    RemarksSummary:
      latestTask.CurrentRemarks ||
      (overdueCount > 0
        ? overdueCount + " sub task overdue."
        : "Progress dihitung dari rata-rata seluruh sub task."),
    LastUpdated: latestTask.LastUpdated || ""
  };
}

function getTrackersWithSubTasks_(employeeMap) {
  employeeMap = employeeMap || objectBy_(getEmployees_(), "EmpId");

  const tasksByTracker = {};
  getTrackerSubTasks_()
    .map(function (task) {
      return enrichTrackerSubTask_(task, employeeMap);
    })
    .forEach(function (task) {
      const trackerId = String(task.TrackerId);
      if (!tasksByTracker[trackerId]) {
        tasksByTracker[trackerId] = [];
      }
      tasksByTracker[trackerId].push(task);
    });

  return getTrackers_().map(function (tracker) {
    const enriched = enrichTracker_(tracker, employeeMap);
    const subTasks = (tasksByTracker[String(tracker.TrackerId)] || [])
      .sort(sortTrackerSubTask_);
    const aggregate = calculateTrackerAggregate_(
      subTasks,
      tracker.DueDate,
      formatISO_(startOfDay_(new Date()))
    );

    if (!subTasks.length) {
      aggregate.PercentComplete = normalizePercentComplete_(
        tracker.CurrentPercentComplete
      );
      aggregate.Status = deriveTrackerStatus_(
        aggregate.PercentComplete,
        tracker.DueDate,
        formatISO_(startOfDay_(new Date()))
      );
      aggregate.ProgressSummary =
        tracker.CurrentProgressReportWeekly || "Legacy tracker tanpa sub task.";
      aggregate.RemarksSummary = tracker.CurrentRemarks || "";
      aggregate.LastUpdated = tracker.LastUpdated || "";
    }

    return Object.assign({}, enriched, {
      SubTasks: subTasks,
      SubTaskCount: subTasks.length,
      ClosedSubTaskCount: aggregate.ClosedCount,
      OverdueSubTaskCount: aggregate.OverdueCount,
      OnGoingSubTaskCount: aggregate.OnGoingCount,
      CurrentPercentComplete: aggregate.PercentComplete,
      CurrentProgressReportWeekly: aggregate.ProgressSummary,
      CurrentRemarks: aggregate.RemarksSummary,
      LastUpdated: aggregate.LastUpdated || tracker.LastUpdated,
      Status: aggregate.Status,
      EffectiveStatus: aggregate.Status
    });
  });
}

function syncTrackerAggregate_(trackerId, now) {
  const trackerSheet = getOrCreateSheet_(SHEET_TRACKERS, TRACKER_HEADERS);
  const tracker = getTrackers_().find(function (item) {
    return String(item.TrackerId) === String(trackerId);
  });

  if (!tracker) {
    throw new Error("Parent Project / Issue tidak ditemukan.");
  }

  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const tasks = getTrackerSubTasks_()
    .filter(function (task) {
      return String(task.TrackerId) === String(trackerId);
    })
    .map(function (task) {
      return enrichTrackerSubTask_(task, employeeMap);
    });

  const aggregate = calculateTrackerAggregate_(
    tasks,
    tracker.DueDate,
    formatISO_(startOfDay_(now || new Date()))
  );

  setObjectRowValues_(trackerSheet, tracker.SheetRow, {
    CurrentPercentComplete: aggregate.PercentComplete,
    CurrentProgressReportWeekly: aggregate.ProgressSummary,
    CurrentRemarks: aggregate.RemarksSummary,
    Status: aggregate.Status,
    LastUpdated: now || new Date()
  });

  return aggregate;
}

function enrichTracker_(tracker, employeeMap) {
  const leaderEmployee = employeeMap[String(tracker.ProjectLeaderEmpId)] || {};
  const percentComplete = normalizePercentComplete_(tracker.CurrentPercentComplete);
  const effectiveStatus = deriveTrackerStatus_(
    percentComplete,
    tracker.DueDate,
    formatISO_(startOfDay_(new Date()))
  );

  return Object.assign({}, tracker, {
    TrackerType: normalizeTrackerType_(tracker.TrackerType) || "Project",
    ProjectLeaderName:
      tracker.ProjectLeaderName || leaderEmployee.EmpName || "",
    ProjectLeaderTeam:
      tracker.ProjectLeaderTeam || leaderEmployee.Team || "",
    ProjectLeaderPosition:
      tracker.ProjectLeaderPosition || leaderEmployee.Position || "",
    ProjectLeaderSiteDedicated:
      tracker.ProjectLeaderSiteDedicated || leaderEmployee.SiteDedicated || "",
    ProjectLeaderCompany:
      tracker.ProjectLeaderCompany || leaderEmployee.Company || "",
    Department:
      tracker.Department || tracker.ProjectLeaderTeam || leaderEmployee.Team || "",
    Site:
      tracker.Site || tracker.ProjectLeaderSiteDedicated || leaderEmployee.SiteDedicated || "",
    CurrentPercentComplete: percentComplete,
    Status: effectiveStatus,
    EffectiveStatus: effectiveStatus,
    Title: tracker.ProjectIssueName,
    Description: tracker.DescriptionProject,
    PICEmpId: tracker.ProjectLeaderEmpId,
    PICName: tracker.ProjectLeaderName || leaderEmployee.EmpName || "",
    PICTeam: tracker.Department || tracker.ProjectLeaderTeam || leaderEmployee.Team || "",
    PICPosition: tracker.ProjectLeaderPosition || leaderEmployee.Position || "",
    PICSiteDedicated: tracker.Site || tracker.ProjectLeaderSiteDedicated || "",
    ProgressUpdate: tracker.CurrentProgressReportWeekly
  });
}

function normalizeTrackerType_(value) {
  const text = String(value || "").trim().toLowerCase();

  if (text === "project") {
    return "Project";
  }
  if (text === "issue") {
    return "Issue";
  }
  return "";
}

function normalizePercentComplete_(value) {
  const parsed = Number(String(value === null || value === undefined ? 0 : value)
    .replace(",", "."));

  if (!isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsed * 100) / 100));
}

function validatePercentComplete_(value) {
  const text = String(value === null || value === undefined ? "" : value).trim();

  if (text === "") {
    throw new Error("% Complete wajib diisi.");
  }

  const parsed = Number(text.replace(",", "."));

  if (!isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error("% Complete harus berupa angka 0 sampai 100.");
  }

  return Math.round(parsed * 100) / 100;
}

function deriveTrackerStatus_(percentComplete, dueDateISO, todayISO) {
  if (normalizePercentComplete_(percentComplete) >= 100) {
    return "Closed";
  }

  if (
    dueDateISO &&
    todayISO &&
    String(dueDateISO) < String(todayISO)
  ) {
    return "Overdue";
  }

  return "On Going";
}

function appendTrackerUpdateLog_(sheet, data) {
  const updatedBy = data.UpdatedBy || {};

  appendObjectRow_(sheet, TRACKER_UPDATE_HEADERS, {
    Timestamp: data.Timestamp || new Date(),
    UpdateId: "UPD-" + Utilities.getUuid().slice(0, 10).toUpperCase(),
    TrackerId: data.TrackerId,
    PercentComplete: normalizePercentComplete_(data.PercentComplete),
    ProgressReportWeekly: data.ProgressReportWeekly || "",
    Remarks: data.Remarks || "",
    Status: data.Status || "On Going",
    UpdatedByEmpId: updatedBy.EmpId || "",
    UpdatedByName: updatedBy.EmpName || "",
    UpdatedByTeam: updatedBy.Team || "",
    UpdatedByPosition: updatedBy.Position || "",
    UpdatedBySiteDedicated: updatedBy.SiteDedicated || ""
  });
}

function appendTrackerSubTaskUpdateLog_(sheet, data) {
  const updatedBy = data.UpdatedBy || {};

  appendObjectRow_(sheet, TRACKER_TASK_UPDATE_HEADERS, {
    Timestamp: data.Timestamp || new Date(),
    UpdateId: "TUP-" + Utilities.getUuid().slice(0, 10).toUpperCase(),
    TrackerId: data.TrackerId,
    SubTaskId: data.SubTaskId,
    PercentComplete: normalizePercentComplete_(data.PercentComplete),
    ProgressReportWeekly: data.ProgressReportWeekly || "",
    Remarks: data.Remarks || "",
    Status: data.Status || "On Going",
    UpdatedByEmpId: updatedBy.EmpId || "",
    UpdatedByName: updatedBy.EmpName || "",
    UpdatedByTeam: updatedBy.Team || "",
    UpdatedByPosition: updatedBy.Position || "",
    UpdatedBySiteDedicated: updatedBy.SiteDedicated || ""
  });
}

function sortTrackerSubTask_(a, b) {
  const priority = {
    Overdue: 0,
    "On Going": 1,
    Closed: 2
  };

  return (
    (priority[a.EffectiveStatus] === undefined ? 9 : priority[a.EffectiveStatus]) -
      (priority[b.EffectiveStatus] === undefined ? 9 : priority[b.EffectiveStatus]) ||
    String(a.DueDate || "").localeCompare(String(b.DueDate || "")) ||
    String(a.SubTaskName || "").localeCompare(String(b.SubTaskName || ""))
  );
}

function sortTracker_(a, b) {
  const priority = {
    Overdue: 0,
    "On Going": 1,
    Closed: 2
  };

  const priorityA = Object.prototype.hasOwnProperty.call(
    priority,
    a.EffectiveStatus
  ) ? priority[a.EffectiveStatus] : 9;

  const priorityB = Object.prototype.hasOwnProperty.call(
    priority,
    b.EffectiveStatus
  ) ? priority[b.EffectiveStatus] : 9;

  return (
    priorityA - priorityB ||
    String(a.DueDate || "").localeCompare(String(b.DueDate || "")) ||
    String(a.ProjectIssueName || "").localeCompare(
      String(b.ProjectIssueName || "")
    )
  );
}

/* =========================================================
 * CALENDAR HELPERS
 * ========================================================= */

function buildCalendarColumns_(viewMode, rangeStart, rangeEnd) {
  const columns = [];

  if (viewMode === "YEAR") {
    for (let month = 0; month < 12; month++) {
      const start = new Date(rangeStart.getFullYear(), month, 1);
      const end = new Date(rangeStart.getFullYear(), month + 1, 0);

      columns.push({
        key:
          rangeStart.getFullYear() +
          "-" +
          String(month + 1).padStart(2, "0"),
        type: "MONTH",
        label: Utilities.formatDate(
          start,
          Session.getScriptTimeZone(),
          "MMM"
        ),
        startISO: formatISO_(start),
        endISO: formatISO_(end)
      });
    }

    return columns;
  }

  if (viewMode === "MONTH") {
    let cursor = startOfWeekMonday_(rangeStart);

    while (cursor.getTime() <= rangeEnd.getTime()) {
      const rawEnd = addDays_(cursor, 6);
      const start = new Date(Math.max(
        cursor.getTime(),
        rangeStart.getTime()
      ));
      const end = new Date(Math.min(
        rawEnd.getTime(),
        rangeEnd.getTime()
      ));
      const weekNumber = getISOWeekNumber_(cursor);

      columns.push({
        key:
          rangeStart.getFullYear() +
          "-W" +
          String(weekNumber).padStart(2, "0") +
          "-" +
          (columns.length + 1),
        type: "WEEK",
        weekNo: weekNumber,
        label: "Week " + weekNumber,
        startISO: formatISO_(start),
        endISO: formatISO_(end)
      });

      cursor = addDays_(cursor, 7);
    }

    return columns;
  }

  let date = new Date(rangeStart);

  while (date.getTime() <= rangeEnd.getTime()) {
    columns.push({
      key: formatISO_(date),
      type: "DAY",
      label: formatISO_(date),
      startISO: formatISO_(date),
      endISO: formatISO_(date)
    });

    date = addDays_(date, 1);
  }

  return columns;
}

/* =========================================================
 * GENERIC UTILITIES
 * ========================================================= */

function getSpreadsheet_() {
  try {
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
      return activeSpreadsheet;
    }
  } catch (error) {
    // Fallback ke openById.
  }

  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);

  if (!sheet) {
    throw new Error('Sheet "' + name + '" tidak ditemukan.');
  }

  return sheet;
}

function getOrCreateSheet_(name, headers) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  ensureHeaders_(sheet, headers || []);
  return sheet;
}

function readTable_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (!values || !values.length) {
    return {
      head: [],
      rows: []
    };
  }

  return {
    head: values[0].map(function (value) {
      return String(value || "").trim();
    }),
    rows: values.length > 1 ? values.slice(1) : []
  };
}

function ensureHeaders_(sheet, headers) {
  if (!headers.length) {
    return;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const existingHeaders = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  if (!existingHeaders.some(Boolean)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  const missingHeaders = headers.filter(function (header) {
    return !existingHeaders.includes(header);
  });

  if (!missingHeaders.length) {
    return;
  }

  const lastUsedHeaderColumn = existingHeaders.reduce(
    function (last, value, index) {
      return value ? index + 1 : last;
    },
    0
  );

  sheet
    .getRange(1, lastUsedHeaderColumn + 1, 1, missingHeaders.length)
    .setValues([missingHeaders]);
}

function appendObjectRow_(sheet, requiredHeaders, rowObject) {
  ensureHeaders_(sheet, requiredHeaders);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  const row = headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(rowObject, header)
      ? rowObject[header]
      : "";
  });

  sheet
    .getRange(sheet.getLastRow() + 1, 1, 1, row.length)
    .setValues([row]);
}

function setObjectRowValues_(sheet, rowNumber, rowObject) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error("Nomor baris data tidak valid.");
  }

  ensureHeaders_(sheet, Object.keys(rowObject || {}));

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  Object.keys(rowObject || {}).forEach(function (header) {
    const columnIndex = headers.indexOf(header);

    if (columnIndex >= 0) {
      sheet.getRange(rowNumber, columnIndex + 1).setValue(rowObject[header]);
    }
  });
}

/**
 * Menimpa seluruh baris data (di luar header) dengan rowObjects yang baru.
 * Baris lama yang tersisa di bawah data baru (kalau jumlahnya berkurang)
 * ikut dikosongkan supaya tidak ada data basi yang nyangkut.
 */
function replaceSheetDataRows_(sheet, headers, rowObjects) {
  ensureHeaders_(sheet, headers);

  const list = rowObjects || [];
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), headers.length);

  if (list.length) {
    const values = list.map(function (rowObject) {
      return headers.map(function (header) {
        return Object.prototype.hasOwnProperty.call(rowObject, header)
          ? rowObject[header]
          : "";
      });
    });

    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }

  const staleRowCount = lastRow - (list.length + 1);

  if (staleRowCount > 0) {
    sheet.getRange(list.length + 2, 1, staleRowCount, lastColumn).clearContent();
  }
}


function headerIndexMap_(head) {
  const knownHeaders = LEAVE_HEADERS.concat(
    EVENT_HEADERS,
    TRACKER_HEADERS,
    TRACKER_UPDATE_HEADERS,
    TRACKER_TASK_HEADERS,
    TRACKER_TASK_UPDATE_HEADERS,
    TRACKER_LEGACY_HEADERS
  );
  const result = {};

  knownHeaders.forEach(function (header) {
    result[header] = -1;
  });

  head.forEach(function (header, index) {
    result[String(header || "").trim()] = index;
  });

  result.SiteDedicated = findHeaderIndex_(head, [
    "SiteDedicated",
    "Site_Dedicated",
    "Site Dedicated"
  ]);

  result.BackupSiteDedicated = findHeaderIndex_(head, [
    "BackupSiteDedicated",
    "Backup_Site_Dedicated",
    "Backup Site Dedicated"
  ]);

  result.PICSiteDedicated = findHeaderIndex_(head, [
    "PICSiteDedicated",
    "PIC_Site_Dedicated",
    "PIC Site Dedicated"
  ]);

  return result;
}

function findHeaderIndex_(head, candidates) {
  for (let i = 0; i < (candidates || []).length; i++) {
    const index = head.indexOf(candidates[i]);
    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

function getCellString_(row, index) {
  if (index < 0 || index >= row.length) {
    return "";
  }

  return String(row[index] === null || row[index] === undefined
    ? ""
    : row[index]
  ).trim();
}

function normalizeTimeCellByIndex_(row, index) {
  if (index < 0 || index >= row.length) {
    return "";
  }

  return normalizeTimeCell_(row[index]);
}

function normalizeDateCellByIndex_(row, index) {
  if (index < 0 || index >= row.length) {
    return "";
  }

  return normalizeDateCell_(row[index]);
}

function objectBy_(items, key) {
  const result = {};

  (items || []).forEach(function (item) {
    result[String(item[key])] = item;
  });

  return result;
}

function uniqueSorted_(items) {
  return Array.from(
    new Set(
      (items || [])
        .map(function (item) {
          return String(item || "").trim();
        })
        .filter(Boolean)
    )
  ).sort(function (a, b) {
    return a.localeCompare(b);
  });
}

function validateDateRange_(startISO, endISO) {
  const startDate = parseISO_(startISO);
  const endDate = parseISO_(endISO);

  if (!startDate || !endDate) {
    throw new Error("Format tanggal harus yyyy-mm-dd.");
  }

  if (endDate.getTime() < startDate.getTime()) {
    throw new Error("End Date tidak boleh sebelum Start Date.");
  }
}

function normalizeDateCell_(cell) {
  if (!cell) {
    return "";
  }

  if (cell instanceof Date) {
    return Utilities.formatDate(
      cell,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  const text = String(cell).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);

  if (isNaN(date.getTime())) {
    return "";
  }

  date.setHours(0, 0, 0, 0);
  return formatISO_(date);
}

function normalizeTimeCell_(cell) {
  if (cell === "" || cell === null || cell === undefined) {
    return "";
  }

  if (cell instanceof Date) {
    return Utilities.formatDate(
      cell,
      Session.getScriptTimeZone(),
      "HH:mm"
    );
  }

  return String(cell).trim();
}

function normalizeDateTimeCell_(cell) {
  if (!cell) {
    return "";
  }

  if (cell instanceof Date) {
    return Utilities.formatDate(
      cell,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd HH:mm"
    );
  }

  return String(cell).trim();
}


/* =========================================================
 * ADMIN EMAIL SCHEDULER
 * ========================================================= */

function getEmailSchedulerSettings() {
  const settings = readEmailSchedulerSettings_();
  const properties = PropertiesService.getScriptProperties();
  const triggerInstalled =
    String(properties.getProperty("PORTAL_SCHEDULER_TRIGGER_INSTALLED") || "") === "TRUE";

  let remainingQuota = null;

  try {
    remainingQuota = MailApp.getRemainingDailyQuota();
  } catch (error) {
    remainingQuota = null;
  }

  return Object.assign({}, settings, {
    PortalUrl: resolvePortalUrl_(settings.PortalUrl),
    TriggerActive: triggerInstalled,
    TriggerCount: triggerInstalled ? 1 : 0,
    TriggerDescription: describePortalEmailTrigger_(settings, triggerInstalled),
    RemainingDailyQuota: remainingQuota,
    TimeZone: Session.getScriptTimeZone(),
    TriggerInstallNote:
      "Jalankan installPortalSchedulerTrigger satu kali dari Apps Script Editor. " +
      "Halaman web tidak lagi memanggil ScriptApp.getProjectTriggers."
  });
}

function saveEmailSchedulerSettings(payload) {
  payload = payload || {};

  const current = readEmailSchedulerSettings_();
  const enabled = toBoolean_(payload.Enabled);
  const scheduleDays = normalizeScheduleDays_(payload.ScheduleDays);
  const sendHour = clampInteger_(payload.SendHour, 0, 23, 7);
  const sendMinute = normalizeSchedulerMinute_(payload.SendMinute);
  const recipients = normalizeEmailList_(payload.Recipients, "Recipients");
  const cc = normalizeEmailList_(payload.Cc, "CC");
  const bcc = normalizeEmailList_(payload.Bcc, "BCC");
  const portalUrl = resolvePortalUrl_(payload.PortalUrl || current.PortalUrl);
  const overviewTeam = String(payload.OverviewTeam || "All Teams").trim() || "All Teams";
  const overviewSite = String(payload.OverviewSite || "All Sites").trim() || "All Sites";
  const includeLeaveSummary = toBoolean_(payload.IncludeLeaveSummary);
  const includeTrackerSummary = toBoolean_(payload.IncludeTrackerSummary);
  const includeLeaderboard = toBoolean_(payload.IncludeLeaderboard);
  const subjectPrefix = String(payload.SubjectPrefix || "[OHS Portal]").trim() || "[OHS Portal]";

  if (enabled && !recipients) {
    throw new Error("Recipients wajib diisi ketika scheduler diaktifkan.");
  }

  if (enabled && !scheduleDays.length) {
    throw new Error("Pilih minimal satu hari pengiriman.");
  }

  if (enabled && !portalUrl) {
    throw new Error(
      "Web Portal URL belum tersedia. Isi URL deployment Web App yang berakhiran /exec."
    );
  }

  const settings = Object.assign({}, current, {
    Enabled: enabled,
    Frequency: "SELECTED_DAYS",
    ScheduleDays: scheduleDays.join(","),
    SendHour: sendHour,
    SendMinute: sendMinute,
    Recipients: recipients,
    Cc: cc,
    Bcc: bcc,
    PortalUrl: portalUrl,
    OverviewTeam: overviewTeam,
    OverviewSite: overviewSite,
    IncludeLeaveSummary: includeLeaveSummary,
    IncludeTrackerSummary: includeTrackerSummary,
    IncludeLeaderboard: includeLeaderboard,
    SubjectPrefix: subjectPrefix,
    UpdatedAt: new Date(),
    UpdatedBy: Session.getActiveUser().getEmail() || "Web App User"
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    writeEmailSchedulerSettings_(settings);
  } finally {
    lock.releaseLock();
  }

  return getEmailSchedulerSettings();
}

function sendSchedulerEmailNow() {
  const settings = readEmailSchedulerSettings_();

  if (!settings.Recipients) {
    throw new Error("Recipients belum diisi pada Admin Scheduler.");
  }

  return executePortalEmailDigest_(settings, false, "Manual run");
}

function sendSchedulerTestEmail() {
  const settings = readEmailSchedulerSettings_();

  if (!settings.Recipients) {
    throw new Error("Recipients belum diisi pada Admin Scheduler.");
  }

  return executePortalEmailDigest_(settings, true, "Test email");
}

function runScheduledPortalEmail() {
  const settings = readEmailSchedulerSettings_();

  if (!settings.Enabled) {
    return {
      sent: false,
      message: "Scheduler disabled."
    };
  }

  const decision = getPortalSchedulerDecision_(settings, new Date());

  if (!decision.shouldSend) {
    return {
      sent: false,
      message: decision.message,
      scheduleKey: decision.scheduleKey || ""
    };
  }

  return executePortalEmailDigest_(
    settings,
    false,
    "Scheduled run",
    decision.scheduleKey
  );
}

/* =========================================================
 * OVERDUE REMINDER (Project & Issue Tracker)
 * Mengirim email H-3 s/d H-0 sebelum DueDate ke daftar penerima tetap,
 * setiap hari pukul OVERDUE_REMINDER_HOUR:OVERDUE_REMINDER_MINUTE,
 * selama Project/Issue/Sub Task masih berstatus On Going.
 * ========================================================= */

function runOverdueReminderCheck() {
  const settings = readEmailSchedulerSettings_();
  const decision = getOverdueReminderDecision_(settings, new Date());

  if (!decision.shouldSend) {
    return {
      sent: false,
      message: decision.message,
      scheduleKey: decision.scheduleKey || ""
    };
  }

  return executeOverdueReminderDigest_(settings, decision.scheduleKey, "Scheduled run");
}

function sendOverdueReminderNow() {
  const settings = readEmailSchedulerSettings_();
  const scheduleKey = formatISO_(startOfDay_(new Date()));

  return executeOverdueReminderDigest_(settings, scheduleKey, "Manual run");
}

function executeOverdueReminderDigest_(settings, scheduleKey, sourceLabel) {
  const startedAt = new Date();
  // Pra-format ke string sekali di sini -- jangan kirim objek Date mentah ke
  // writeEmailSchedulerSettings_, pernah menyebabkan "Invalid time value".
  const startedAtLabel = normalizeDateTimeCell_(startedAt);

  try {
    const items = getDueSoonTrackerItems_(OVERDUE_REMINDER_WINDOW_DAYS);
    const digest = buildOverdueReminderEmail_(items);

    if (items.length) {
      MailApp.sendEmail({
        to: OVERDUE_REMINDER_RECIPIENTS.join(","),
        subject: digest.subject,
        htmlBody: digest.htmlBody,
        body: digest.plainBody,
        name: "OHS Portal Scheduler"
      });
    }

    const updatedSettings = Object.assign({}, settings, {
      OverdueReminderLastKey: scheduleKey || settings.OverdueReminderLastKey || "",
      OverdueReminderLastRunAt: startedAtLabel,
      OverdueReminderLastCount: items.length
    });

    writeEmailSchedulerSettings_(updatedSettings);

    return {
      sent: items.length > 0,
      itemCount: items.length,
      subject: digest.subject,
      recipients: OVERDUE_REMINDER_RECIPIENTS.join(","),
      runAt: startedAtLabel,
      source: sourceLabel
    };
  } catch (error) {
    const failedSettings = Object.assign({}, settings, {
      OverdueReminderLastRunAt: startedAtLabel,
      OverdueReminderLastCount: 0
    });

    writeEmailSchedulerSettings_(failedSettings);
    throw error;
  }
}

function getOverdueReminderDecision_(settings, now) {
  const current = now || new Date();
  const scheduleKey = formatISO_(startOfDay_(current));
  const currentMinutes = current.getHours() * 60 + current.getMinutes();
  const targetMinutes = OVERDUE_REMINDER_HOUR * 60 + OVERDUE_REMINDER_MINUTE;

  // Window 75 menit mengantisipasi trigger yang berjalan terlambat.
  if (currentMinutes < targetMinutes || currentMinutes >= targetMinutes + 75) {
    return {
      shouldSend: false,
      scheduleKey: scheduleKey,
      message: "Belum memasuki window pengiriman overdue reminder."
    };
  }

  if (String(settings.OverdueReminderLastKey || "") === scheduleKey) {
    return {
      shouldSend: false,
      scheduleKey: scheduleKey,
      message: "Overdue reminder hari ini sudah dikirim."
    };
  }

  return {
    shouldSend: true,
    scheduleKey: scheduleKey,
    message: "Jadwal overdue reminder terpenuhi."
  };
}

function getDueSoonTrackerItems_(windowDays) {
  const employeeMap = objectBy_(getEmployees_(), "EmpId");
  const trackers = getTrackersWithSubTasks_(employeeMap);
  const todayISO = formatISO_(startOfDay_(new Date()));
  const limitISO = formatISO_(addDays_(new Date(), windowDays));
  const items = [];

  trackers.forEach(function (tracker) {
    if (tracker.SubTaskCount > 0) {
      tracker.SubTasks.forEach(function (task) {
        if (task.EffectiveStatus !== "On Going") return;

        const dueISO = String(task.DueDate || "").trim();
        if (!dueISO || dueISO < todayISO || dueISO > limitISO) return;

        items.push({
          Type: "Sub Task",
          ProjectIssueName: tracker.ProjectIssueName,
          ItemName: task.SubTaskName,
          PICName: task.PICName || task.PICEmpId || "-",
          PICTeam: task.PICTeam || "",
          PICSiteDedicated: task.PICSiteDedicated || "",
          DueDate: dueISO,
          DaysRemaining: daysBetweenISO_(todayISO, dueISO),
          PercentComplete: task.CurrentPercentComplete
        });
      });
      return;
    }

    if (tracker.EffectiveStatus !== "On Going") return;

    const dueISO = String(tracker.DueDate || "").trim();
    if (!dueISO || dueISO < todayISO || dueISO > limitISO) return;

    items.push({
      Type: tracker.TrackerType || "Project",
      ProjectIssueName: tracker.ProjectIssueName,
      ItemName: tracker.ProjectIssueName,
      PICName: tracker.ProjectLeaderName || tracker.ProjectLeaderEmpId || "-",
      PICTeam: tracker.Department || tracker.ProjectLeaderTeam || "",
      PICSiteDedicated: tracker.Site || tracker.ProjectLeaderSiteDedicated || "",
      DueDate: dueISO,
      DaysRemaining: daysBetweenISO_(todayISO, dueISO),
      PercentComplete: tracker.CurrentPercentComplete
    });
  });

  items.sort(function (a, b) {
    return String(a.DueDate).localeCompare(String(b.DueDate));
  });

  return items;
}

function daysBetweenISO_(fromISO, toISO) {
  const from = parseISO_(fromISO);
  const to = parseISO_(toISO);

  if (!from || !to) {
    return 0;
  }

  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function buildOverdueReminderEmail_(items) {
  const dateLabel = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMM yyyy");

  const subject =
    "[OHS Portal] Reminder Due Date Project & Issue Tracker - " + dateLabel +
    (items.length ? " (" + items.length + " item)" : "");

  const section = buildEmailSection_(
    "Project / Issue / Sub Task Mendekati Due Date",
    items,
    ["Sisa Hari", "Tipe", "Project / Issue", "Item", "PIC", "Due Date", "% Complete"],
    function (item) {
      return [
        item.DaysRemaining <= 0 ? "Hari ini" : "H-" + item.DaysRemaining,
        item.Type || "-",
        item.ProjectIssueName || "-",
        item.ItemName || "-",
        [item.PICName, item.PICTeam, item.PICSiteDedicated].filter(Boolean).join(" • ") || "-",
        formatEmailDate_(item.DueDate),
        normalizePercentComplete_(item.PercentComplete) + "%"
      ];
    },
    "Tidak ada Project, Issue, atau Sub Task yang mendekati due date."
  );

  const htmlBody =
    '<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:1100px;margin:auto;">' +
      '<div style="padding:20px 22px;background:#b91c1c;color:#fff;border-radius:14px 14px 0 0;">' +
        '<div style="font-size:22px;font-weight:800;">Reminder Due Date Project &amp; Issue Tracker</div>' +
        '<div style="margin-top:5px;font-size:12px;opacity:.92;">' +
          htmlEscapeEmail_(dateLabel) + ' - Sebelum status berubah menjadi Overdue' +
        '</div>' +
      '</div>' +
      '<div style="padding:18px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-top:0;">' +
        '<div style="margin-bottom:14px;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;' +
          'border-radius:8px;color:#991b1b;font-size:12px;">' +
          'Daftar berikut akan berubah menjadi <b>Overdue</b> dalam ' + OVERDUE_REMINDER_WINDOW_DAYS +
          ' hari ke depan apabila belum diselesaikan atau diupdate.' +
        '</div>' +
        section +
        '<div style="margin-top:18px;color:#64748b;font-size:11px;">' +
          'Email ini dibuat otomatis oleh OHS Portal berdasarkan DueDate pada Project & Issue Tracker.' +
        '</div>' +
      '</div>' +
    '</div>';

  const plainBody =
    "Reminder Due Date Project & Issue Tracker - " + dateLabel + "\n\n" +
    (items.length
      ? items.map(function (item) {
          return (
            (item.DaysRemaining <= 0 ? "Hari ini" : "H-" + item.DaysRemaining) +
            " - [" + (item.Type || "-") + "] " + (item.ProjectIssueName || "-") +
            (item.ItemName && item.ItemName !== item.ProjectIssueName ? " > " + item.ItemName : "") +
            " - PIC: " + (item.PICName || "-") +
            " - Due: " + formatEmailDate_(item.DueDate) +
            " - " + normalizePercentComplete_(item.PercentComplete) + "%"
          );
        }).join("\n")
      : "Tidak ada Project, Issue, atau Sub Task yang mendekati due date.");

  return {
    subject: subject,
    htmlBody: htmlBody,
    plainBody: plainBody
  };
}

/* =========================================================
 * SINKRONISASI KARYAWAN DARI API HSE
 * Dipanggil sekali seminggu (hari Senin, jam HSE_SYNC_HOUR) lewat cron
 * yang sama dengan digest/reminder -- bukan setiap request, supaya API
 * HSE tidak terlalu sering dipanggil.
 * ========================================================= */

function getHseApiConfig_() {
  return {
    apiKey: PropertiesService.getScriptProperties().getProperty("HSE_API_KEY") || "",
    apiBase:
      PropertiesService.getScriptProperties().getProperty("HSE_API_BASE") ||
      HSE_API_DEFAULT_BASE,
    companyId:
      PropertiesService.getScriptProperties().getProperty("HSE_COMPANY_ID") ||
      HSE_API_DEFAULT_COMPANY_ID
  };
}

/**
 * Daftar seluruh company (PT Berau Coal + kontraktor/mitra kerja) di
 * sistem HSE. Dipakai supaya sinkronisasi karyawan mencakup semua
 * perusahaan, bukan cuma PT Berau Coal sendiri.
 */
function fetchHseCompanies_() {
  const config = getHseApiConfig_();

  const url = config.apiBase + "/sid2/api/ftwApi/getCompany?page=1&size=1000";

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: { "x-api-key": config.apiKey },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(
      "HSE API error " + response.getResponseCode() + " saat mengambil daftar company: " +
      String(response.getContentText() || "").slice(0, 300)
    );
  }

  const data = JSON.parse(response.getContentText());

  return (data.results || [])
    .map(function (company) {
      return company.id || company.companyId;
    })
    .filter(Boolean);
}

/**
 * Ambil karyawan AKTIF untuk satu company. Retry sekali kalau kena
 * error (server HSE kadang 502 sesaat) -- kalau tetap gagal, lempar
 * error supaya company ini ditandai gagal oleh pemanggil (bukan
 * menghentikan seluruh sync).
 */
function fetchHseEmployeesForCompanyOnce_(companyId, config) {
  const url =
    config.apiBase +
    "/sid2/api/ftwApi/getEmployee?companyId=" +
    encodeURIComponent(companyId) +
    "&page=1&size=30000";

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: { "x-api-key": config.apiKey },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error("HTTP " + response.getResponseCode());
  }

  const data = JSON.parse(response.getContentText());

  return (data.results || []).filter(function (item) {
    return String(item.status || "").trim().toUpperCase() === "AKTIF";
  });
}

function fetchHseEmployeesForCompany_(companyId, config) {
  try {
    return fetchHseEmployeesForCompanyOnce_(companyId, config);
  } catch (firstError) {
    return fetchHseEmployeesForCompanyOnce_(companyId, config);
  }
}

/**
 * Ambil karyawan AKTIF dari SEMUA company (bukan cuma PT Berau Coal),
 * beberapa company sekaligus per batch supaya tidak membanjiri server
 * HSE. Company yang tetap gagal setelah retry dilewati (dicatat di
 * failedCompanyIds), tidak menggagalkan seluruh sync.
 */
function fetchHseEmployees_() {
  const config = getHseApiConfig_();

  if (!config.apiKey) {
    throw new Error(
      "HSE_API_KEY belum dikonfigurasi. Set environment variable HSE_API_KEY di Vercel."
    );
  }

  const companyIds = fetchHseCompanies_();
  const concurrency = 8;
  const employees = [];
  const failedCompanyIds = [];

  for (let start = 0; start < companyIds.length; start += concurrency) {
    const chunk = companyIds.slice(start, start + concurrency);

    const chunkResults = await Promise.all(
      chunk.map(async function (companyId) {
        try {
          const list = await fetchHseEmployeesForCompany_(companyId, config);
          return { companyId: companyId, ok: true, employees: list };
        } catch (fetchError) {
          return { companyId: companyId, ok: false, employees: [] };
        }
      })
    );

    chunkResults.forEach(function (result) {
      if (result.ok) {
        employees.push.apply(employees, result.employees);
      } else {
        failedCompanyIds.push(result.companyId);
      }
    });
  }

  return {
    employees: employees,
    totalCompanies: companyIds.length,
    failedCompanyIds: failedCompanyIds
  };
}

/**
 * Mengambil data karyawan dari API HSE (semua company) lalu menimpa
 * sheet Employees. Header kolom mengikuti header yang sudah ada di
 * sheet (kalau sheet sudah ada) supaya variasi nama kolom lama (mis.
 * "Site_Dedicated") tidak dianggap kolom baru.
 */
function syncEmployeesFromHse_() {
  const fetchResult = fetchHseEmployees_();
  const hseEmployees = fetchResult.employees;

  let headers = EMPLOYEE_SYNC_HEADERS;

  try {
    const existingTable = readTable_(getSheet_(SHEET_EMPLOYEES));

    if (existingTable.head.length) {
      headers = existingTable.head;
    }
  } catch (error) {
    // Sheet Employees belum ada -- pakai header default (EMPLOYEE_SYNC_HEADERS).
  }

  const siteHeaderIndex = findHeaderIndex_(headers, [
    "SiteDedicated",
    "Site_Dedicated",
    "Site Dedicated"
  ]);
  const siteHeaderName = siteHeaderIndex >= 0 ? headers[siteHeaderIndex] : "SiteDedicated";

  if (siteHeaderIndex < 0) {
    headers = headers.concat([siteHeaderName]);
  }

  if (headers.indexOf("Company") < 0) {
    headers = headers.concat(["Company"]);
  }

  const sheet = getOrCreateSheet_(SHEET_EMPLOYEES, headers);

  const seenEmpIds = {};

  const rows = hseEmployees
    .map(function (item) {
      const row = {
        EmpId: String(item.npk || "").trim(),
        SID: String(item.sidCode || "").trim(),
        EmpName: String(item.name || "").trim(),
        Position: String(item.structuralPosition || "").trim(),
        Team: String(item.departmentName || "").trim(),
        Company: String(item.companyName || "").trim(),
        PhotoUrl: ""
      };
      row[siteHeaderName] = String(item.dedicatedSite || "").trim();
      return row;
    })
    .filter(function (row) {
      if (!row.EmpId || !row.EmpName) {
        return false;
      }
      // Karyawan bisa muncul di lebih dari satu company (mis. dipekerjakan
      // lintas entitas) -- ambil kemunculan pertama saja.
      if (seenEmpIds[row.EmpId]) {
        return false;
      }
      seenEmpIds[row.EmpId] = true;
      return true;
    });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    replaceSheetDataRows_(sheet, headers, rows);
  } finally {
    lock.releaseLock();
  }

  return {
    syncedCount: rows.length,
    totalCompanies: fetchResult.totalCompanies,
    failedCompanyCount: fetchResult.failedCompanyIds.length,
    failedCompanyIds: fetchResult.failedCompanyIds
  };
}

function getHseSyncDecision_(settings, now) {
  const current = now || new Date();
  const syncKey = formatISO_(startOfWeekMonday_(current));
  const currentMinutes = current.getHours() * 60 + current.getMinutes();
  const targetMinutes = HSE_SYNC_HOUR * 60 + HSE_SYNC_MINUTE;

  if (current.getDay() !== HSE_SYNC_DAY_OF_WEEK) {
    return {
      shouldSync: false,
      syncKey: syncKey,
      message: "Bukan hari sinkronisasi HSE."
    };
  }

  // Window 75 menit mengantisipasi trigger yang berjalan terlambat.
  if (currentMinutes < targetMinutes || currentMinutes >= targetMinutes + 75) {
    return {
      shouldSync: false,
      syncKey: syncKey,
      message: "Belum memasuki window sinkronisasi HSE."
    };
  }

  if (String(settings.HseSyncLastKey || "") === syncKey) {
    return {
      shouldSync: false,
      syncKey: syncKey,
      message: "Sinkronisasi HSE minggu ini sudah dijalankan."
    };
  }

  return {
    shouldSync: true,
    syncKey: syncKey,
    message: "Jadwal sinkronisasi HSE terpenuhi."
  };
}

function runHseSyncCheck() {
  const settings = readEmailSchedulerSettings_();
  const decision = getHseSyncDecision_(settings, new Date());

  if (!decision.shouldSync) {
    return {
      synced: false,
      message: decision.message,
      syncKey: decision.syncKey || ""
    };
  }

  return executeHseSync_(settings, decision.syncKey, "Scheduled run");
}

function syncHseEmployeesNow() {
  const settings = readEmailSchedulerSettings_();
  const syncKey = formatISO_(startOfWeekMonday_(new Date()));

  return executeHseSync_(settings, syncKey, "Manual run");
}

function executeHseSync_(settings, syncKey, sourceLabel) {
  const startedAt = new Date();
  // Pra-format ke string sekali di sini -- jangan kirim objek Date mentah ke
  // writeEmailSchedulerSettings_, pernah menyebabkan "Invalid time value".
  const startedAtLabel = normalizeDateTimeCell_(startedAt);

  try {
    const result = syncEmployeesFromHse_();

    const updatedSettings = Object.assign({}, settings, {
      HseSyncLastKey: syncKey || settings.HseSyncLastKey || "",
      HseSyncLastRunAt: startedAtLabel,
      HseSyncLastCount: result.syncedCount
    });

    writeEmailSchedulerSettings_(updatedSettings);

    return {
      synced: true,
      syncedCount: result.syncedCount,
      totalCompanies: result.totalCompanies,
      failedCompanyCount: result.failedCompanyCount,
      failedCompanyIds: result.failedCompanyIds,
      runAt: startedAtLabel,
      source: sourceLabel
    };
  } catch (error) {
    const failedSettings = Object.assign({}, settings, {
      HseSyncLastRunAt: startedAtLabel,
      HseSyncLastCount: 0
    });

    writeEmailSchedulerSettings_(failedSettings);
    throw error;
  }
}

function executePortalEmailDigest_(settings, isTest, sourceLabel, scheduledKey) {
  const startedAt = new Date();
  // Pra-format ke string sekali di sini -- jangan kirim objek Date mentah ke
  // writeEmailSchedulerSettings_, pernah menyebabkan "Invalid time value".
  const startedAtLabel = normalizeDateTimeCell_(startedAt);

  try {
    const digest = buildPortalEmailDigest_(settings, isTest);
    const mailOptions = {
      to: settings.Recipients,
      subject: digest.subject,
      htmlBody: digest.htmlBody,
      body: digest.plainBody,
      name: "OHS Portal Scheduler"
    };

    if (settings.Cc) {
      mailOptions.cc = settings.Cc;
    }

    if (settings.Bcc) {
      mailOptions.bcc = settings.Bcc;
    }

    MailApp.sendEmail(mailOptions);

    const updatedSettings = Object.assign({}, settings, {
      LastScheduledKey: scheduledKey || settings.LastScheduledKey || "",
      LastRunAt: startedAtLabel,
      LastRunStatus:
        sourceLabel + " berhasil. " + digest.itemCount + " item dirangkum.",
      LastEmailCount: digest.itemCount
    });

    writeEmailSchedulerSettings_(updatedSettings);

    return {
      sent: true,
      itemCount: digest.itemCount,
      subject: digest.subject,
      recipients: settings.Recipients,
      runAt: startedAtLabel
    };
  } catch (error) {
    const failedSettings = Object.assign({}, settings, {
      LastRunAt: startedAtLabel,
      LastRunStatus: sourceLabel + " gagal: " + error.message,
      LastEmailCount: 0
    });

    writeEmailSchedulerSettings_(failedSettings);
    throw error;
  }
}

function buildPortalEmailDigest_(settings, isTest) {
  const today = startOfDay_(new Date());
  const currentYear = today.getFullYear();
  const portalUrl = resolvePortalUrl_(settings.PortalUrl);
  const overviewTeam = String(settings.OverviewTeam || "All Teams").trim() || "All Teams";
  const overviewSite = String(settings.OverviewSite || "All Sites").trim() || "All Sites";

  const overview = getDashboardOverview({
    team: overviewTeam,
    site: overviewSite,
    year: currentYear
  });

  const eventRows = []
    .concat((overview.eventsThisWeek || []).map(function (event) {
      return Object.assign({}, event, { PeriodLabel: "This Week" });
    }))
    .concat((overview.nextWeekEvents || []).map(function (event) {
      return Object.assign({}, event, { PeriodLabel: "Next Week" });
    }))
    .concat((overview.nextTwoWeekEvents || []).map(function (event) {
      return Object.assign({}, event, { PeriodLabel: "Next 2 Week" });
    }))
    .concat((overview.moreThanTwoWeeksEvents || []).map(function (event) {
      return Object.assign({}, event, { PeriodLabel: "More Than 2 Weeks Ahead" });
    }));

  const leaveRows = []
    .concat((overview.leaveThisWeek || []).map(function (leave) {
      return Object.assign({}, leave, { PeriodLabel: "This Week" });
    }))
    .concat((overview.upcomingLeave || []).map(function (leave) {
      return Object.assign({}, leave, { PeriodLabel: "Upcoming" });
    }));

  const trackerRows = settings.IncludeTrackerSummary
    ? (overview.trackerHighlights || [])
    : [];

  const leaderboardRows = settings.IncludeLeaderboard
    ? (overview.leaderboard || []).slice(0, 10)
    : [];

  const dateLabel = Utilities.formatDate(
    today,
    Session.getScriptTimeZone(),
    "dd MMM yyyy"
  );

  const subject =
    (settings.SubjectPrefix || "[OHS Portal]") +
    " " +
    (isTest ? "TEST - " : "") +
    "Overview Dashboard - " +
    dateLabel;

  const counts = overview.counts || {};
  const itemCount =
    Number(counts.eventsThisWeek || 0) +
    Number(counts.upcomingEvents || 0) +
    Number(counts.leaveThisWeek || 0) +
    Number(counts.upcomingLeave || 0) +
    Number(counts.activeProjects || 0) +
    Number(counts.activeIssues || 0);

  const scopeLabel =
    (overviewTeam === "All Teams" ? "All Teams" : overviewTeam) +
    " • " +
    (overviewSite === "All Sites" ? "All Sites" : overviewSite) +
    " • " +
    currentYear;

  const sections = [];

  sections.push(
    buildEmailSection_(
      "Event Status",
      eventRows,
      ["Period", "Event", "Date", "PIC / Team / Site", "Where", "Update Kesiapan"],
      function (event) {
        return [
          event.PeriodLabel || "-",
          event.EventName || "-",
          formatEmailDate_(event.EventDate),
          [
            event.PICName || event.PICEmpId || "-",
            event.PICTeam || "",
            event.PICSiteDedicated || ""
          ].filter(Boolean).join(" • "),
          event.Where || "-",
          event.ReadinessUpdate || "Belum ada update kesiapan"
        ];
      },
      "Tidak ada event pada periode overview."
    )
  );

  if (settings.IncludeLeaveSummary) {
    sections.push(
      buildEmailSection_(
        "Leave Status & Backup PIC",
        leaveRows,
        ["Period", "Employee", "Leave Type", "Date", "Backup PIC", "Handover / Pending Work"],
        function (leave) {
          return [
            leave.PeriodLabel || "-",
            leave.EmpName || leave.EmpId || "-",
            leave.LeaveType || "-",
            formatEmailDate_(leave.StartDate) + " - " + formatEmailDate_(leave.EndDate),
            leave.BackupEmpName || leave.BackupEmpId || "-",
            leave.Note || "-"
          ];
        },
        "Tidak ada leave pada periode overview."
      )
    );
  }

  if (settings.IncludeTrackerSummary) {
    sections.push(
      buildEmailSection_(
        "Active Project & Issue",
        trackerRows,
        ["Type", "Project / Issue", "Department / Site", "Project Leader", "Timeline", "% Complete", "Status", "Latest Weekly Report"],
        function (tracker) {
          return [
            tracker.TrackerType || "-",
            tracker.ProjectIssueName || "-",
            [tracker.Department || "", tracker.Site || ""].filter(Boolean).join(" • ") || "-",
            tracker.ProjectLeaderName || tracker.ProjectLeaderEmpId || "-",
            formatEmailDate_(tracker.StartDate) + " - " + formatEmailDate_(tracker.DueDate),
            normalizePercentComplete_(tracker.CurrentPercentComplete) + "%",
            tracker.EffectiveStatus || tracker.Status || "-",
            tracker.CurrentProgressReportWeekly || "-"
          ];
        },
        "Tidak ada Project atau Issue aktif."
      )
    );
  }

  if (settings.IncludeLeaderboard) {
    sections.push(
      buildEmailSection_(
        "Working Days Effectiveness - Top 10 Leave Days",
        leaderboardRows,
        ["Rank", "Employee", "Position", "Team / Site", "Leave Days", "Effective Days", "Effective %"],
        function (employee, index) {
          return [
            String(index + 1),
            employee.EmpName || employee.EmpId || "-",
            employee.Position || "-",
            [employee.Team || "", employee.SiteDedicated || ""].filter(Boolean).join(" • ") || "-",
            Number(employee.LeaveDaysYTD || employee.LeaveYTD || 0) + " hari",
            Number(employee.EffectiveWorkingDays || 0) + " hari",
            Number(employee.EffectiveWorkingPercent || 0) + "%"
          ];
        },
        "Belum ada data leaderboard."
      )
    );
  }

  const portalButton = portalUrl
    ? '<div style="margin:22px 0 6px;text-align:center;">' +
        '<a href="' + htmlEscapeEmail_(portalUrl) + '" target="_blank" ' +
        'style="display:inline-block;padding:13px 22px;background:#15803d;color:#ffffff;' +
        'text-decoration:none;border-radius:9px;font-size:14px;font-weight:800;">' +
        'Open OHS Web Portal</a>' +
      '</div>' +
      '<div style="text-align:center;color:#64748b;font-size:11px;word-break:break-all;">' +
        htmlEscapeEmail_(portalUrl) +
      '</div>'
    : '<div style="margin-top:18px;padding:11px 13px;background:#fff7ed;border:1px solid #fdba74;' +
      'border-radius:8px;color:#9a3412;font-size:12px;">' +
      'Web Portal URL belum diatur pada Admin Scheduler.' +
      '</div>';

  const htmlBody =
    '<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:1100px;margin:auto;">' +
      '<div style="padding:20px 22px;background:#166534;color:#fff;border-radius:14px 14px 0 0;">' +
        '<div style="font-size:22px;font-weight:800;">OHS Portal Overview Dashboard</div>' +
        '<div style="margin-top:5px;font-size:12px;opacity:.92;">' +
          htmlEscapeEmail_(dateLabel) + ' • ' +
          htmlEscapeEmail_(scopeLabel) + ' • ' +
          htmlEscapeEmail_(Session.getScriptTimeZone()) +
        '</div>' +
      '</div>' +
      '<div style="padding:18px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-top:0;">' +
        (isTest
          ? '<div style="margin-bottom:14px;padding:10px 12px;background:#fff7ed;border:1px solid #fdba74;' +
            'border-radius:8px;color:#9a3412;font-weight:700;">TEST EMAIL</div>'
          : '') +
        buildOverviewEmailKpiCards_(counts, overview.workforceEffectiveness || {}) +
        sections.join("") +
        portalButton +
        '<div style="margin-top:18px;color:#64748b;font-size:11px;">' +
          'Email ini dibuat otomatis dari data Overview Dashboard OHS Portal.' +
        '</div>' +
      '</div>' +
    '</div>';

  const plainBody =
    "OHS Portal Overview Dashboard - " + dateLabel + "\n" +
    "Scope: " + scopeLabel + "\n\n" +
    "Event This Week: " + Number(counts.eventsThisWeek || 0) + "\n" +
    "Upcoming Event: " + Number(counts.upcomingEvents || 0) + "\n" +
    "Leave This Week: " + Number(counts.leaveThisWeek || 0) + "\n" +
    "Upcoming Leave: " + Number(counts.upcomingLeave || 0) + "\n" +
    "Project Active: " + Number(counts.activeProjects || 0) + "\n" +
    "Issue Active: " + Number(counts.activeIssues || 0) + "\n" +
    "Effective Working Days: " + Number((overview.workforceEffectiveness || {}).effectiveWorkingPercent || 0) + "%\n\n" +
    (portalUrl ? "Open Web Portal: " + portalUrl + "\n" : "Web Portal URL belum diatur.\n");

  return {
    subject: subject,
    htmlBody: htmlBody,
    plainBody: plainBody,
    itemCount: itemCount
  };
}

function buildOverviewEmailKpiCards_(counts, effectiveness) {
  effectiveness = effectiveness || {};
  const cards = [
    { label: "Event This Week", value: counts.eventsThisWeek, color: "#166534", bg: "#ecfdf5" },
    { label: "Upcoming Event", value: counts.upcomingEvents, color: "#1d4ed8", bg: "#eff6ff" },
    { label: "Leave This Week", value: counts.leaveThisWeek, color: "#9a3412", bg: "#fff7ed" },
    { label: "Upcoming Leave", value: counts.upcomingLeave, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Project Active", value: counts.activeProjects, color: "#b45309", bg: "#fffbeb" },
    { label: "Issue Active", value: counts.activeIssues, color: "#b91c1c", bg: "#fef2f2" },
    { label: "Effective Working Days", value: Number(effectiveness.effectiveWorkingPercent || 0) + "%", color: "#1d4ed8", bg: "#eff6ff" }
  ];

  return (
    '<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:7px;margin:0 0 10px;">' +
      '<tr>' +
        cards.slice(0, 4).map(function (card) {
          return buildOverviewEmailKpiCard_(card);
        }).join("") +
      '</tr>' +
      '<tr>' +
        cards.slice(4).map(function (card) {
          return buildOverviewEmailKpiCard_(card);
        }).join("") +
      '</tr>' +
    '</table>'
  );
}

function buildOverviewEmailKpiCard_(card) {
  return (
    '<td style="width:25%;padding:14px;background:' + card.bg + ';border:1px solid #e2e8f0;' +
      'border-radius:10px;vertical-align:top;">' +
      '<div style="font-size:11px;font-weight:700;color:#475569;">' +
        htmlEscapeEmail_(card.label) +
      '</div>' +
      '<div style="margin-top:6px;font-size:28px;line-height:1;font-weight:900;color:' + card.color + ';">' +
        Number(card.value || 0) +
      '</div>' +
    '</td>'
  );
}

function resolvePortalUrl_(configuredUrl) {
  const configured = normalizePortalUrl_(configuredUrl);

  if (configured) {
    return configured;
  }

  try {
    return normalizePortalUrl_(ScriptApp.getService().getUrl());
  } catch (error) {
    return "";
  }
}

function normalizePortalUrl_(value) {
  const url = String(value || "").trim();

  if (!url) {
    return "";
  }

  if (!/^https:\/\//i.test(url)) {
    throw new Error("Web Portal URL harus menggunakan https://.");
  }

  return url;
}

function buildEmailSection_(title, items, headers, rowBuilder, emptyText) {
  const rows = items || [];
  let content = "";

  if (!rows.length) {
    content =
      '<div style="padding:12px;color:#64748b;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">' +
      htmlEscapeEmail_(emptyText || "Tidak ada data.") +
      '</div>';
  } else {
    content =
      '<div style="overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">' +
      '<table style="border-collapse:collapse;width:100%;font-size:12px;">' +
      '<thead><tr>' +
      headers.map(function (header) {
        return '<th style="padding:8px;text-align:left;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">' +
          htmlEscapeEmail_(header) + '</th>';
      }).join("") +
      '</tr></thead><tbody>' +
      rows.slice(0, 100).map(function (item, index) {
        return '<tr>' + rowBuilder(item, index).map(function (value) {
          return '<td style="padding:8px;vertical-align:top;border-bottom:1px solid #e2e8f0;white-space:pre-wrap;">' +
            htmlEscapeEmail_(value) + '</td>';
        }).join("") + '</tr>';
      }).join("") +
      '</tbody></table></div>';
  }

  return (
    '<div style="margin-top:16px;">' +
      '<div style="margin-bottom:7px;font-size:15px;font-weight:800;color:#166534;">' +
        htmlEscapeEmail_(title) + ' (' + rows.length + ')' +
      '</div>' +
      content +
    '</div>'
  );
}

function readEmailSchedulerSettings_() {
  const defaults = getDefaultEmailSchedulerSettings_();
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEET_EMAIL_SCHEDULER);

  if (!sheet || sheet.getLastRow() < 2) {
    return defaults;
  }

  ensureHeaders_(sheet, EMAIL_SCHEDULER_HEADERS);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  const row = sheet.getRange(2, 1, 2, sheet.getLastColumn()).getValues()[0] || [];
  const result = Object.assign({}, defaults);

  headers.forEach(function (header, index) {
    if (EMAIL_SCHEDULER_HEADERS.indexOf(header) >= 0) {
      result[header] = row[index];
    }
  });

  result.Enabled = toBoolean_(result.Enabled);
  result.Frequency = "SELECTED_DAYS";
  result.ScheduleDays = normalizeScheduleDays_(result.ScheduleDays).join(",");
  result.SendHour = clampInteger_(result.SendHour, 0, 23, 7);
  result.SendMinute = normalizeSchedulerMinute_(result.SendMinute);
  result.Recipients = String(result.Recipients || "").trim();
  result.Cc = String(result.Cc || "").trim();
  result.Bcc = String(result.Bcc || "").trim();
  result.PortalUrl = String(result.PortalUrl || "").trim();
  result.OverviewTeam = String(result.OverviewTeam || "All Teams").trim() || "All Teams";
  result.OverviewSite = String(result.OverviewSite || "All Sites").trim() || "All Sites";
  result.IncludeLeaveSummary = toBoolean_(result.IncludeLeaveSummary);
  result.IncludeTrackerSummary = toBoolean_(result.IncludeTrackerSummary);
  result.IncludeLeaderboard = toBoolean_(result.IncludeLeaderboard);
  result.EventReminderDays = parseReminderDays_(result.EventReminderDays).join(",");
  result.IncludePreviousDays = clampInteger_(result.IncludePreviousDays, 0, 365, 7);
  result.SubjectPrefix = String(result.SubjectPrefix || "[OHS Portal]").trim() || "[OHS Portal]";
  result.LastScheduledKey = String(result.LastScheduledKey || "");
  result.LastRunAt = normalizeDateTimeCell_(result.LastRunAt);
  result.LastRunStatus = String(result.LastRunStatus || "Belum pernah dijalankan.");
  result.LastEmailCount = Number(result.LastEmailCount || 0);
  result.UpdatedAt = normalizeDateTimeCell_(result.UpdatedAt);
  result.UpdatedBy = String(result.UpdatedBy || "");
  result.OverdueReminderLastKey = String(result.OverdueReminderLastKey || "");
  result.OverdueReminderLastRunAt = normalizeDateTimeCell_(result.OverdueReminderLastRunAt);
  result.OverdueReminderLastCount = Number(result.OverdueReminderLastCount || 0);
  result.HseSyncLastKey = String(result.HseSyncLastKey || "");
  result.HseSyncLastRunAt = normalizeDateTimeCell_(result.HseSyncLastRunAt);
  result.HseSyncLastCount = Number(result.HseSyncLastCount || 0);

  return result;
}

function writeEmailSchedulerSettings_(settings) {
  const sheet = getOrCreateSheet_(SHEET_EMAIL_SCHEDULER, EMAIL_SCHEDULER_HEADERS);
  ensureHeaders_(sheet, EMAIL_SCHEDULER_HEADERS);

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  const row = headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(settings, header)
      ? settings[header]
      : "";
  });

  sheet.getRange(2, 1, 1, row.length).setValues([row]);
}

function getDefaultEmailSchedulerSettings_() {
  return {
    Enabled: false,
    Frequency: "SELECTED_DAYS",
    ScheduleDays: "MON,TUE,WED,THU,FRI",
    SendHour: 7,
    SendMinute: 0,
    Recipients: "",
    Cc: "",
    Bcc: "",
    PortalUrl: "",
    OverviewTeam: "All Teams",
    OverviewSite: "All Sites",
    IncludeLeaveSummary: true,
    IncludeTrackerSummary: true,
    IncludeLeaderboard: true,
    SubjectPrefix: "[OHS Portal]",
    EventReminderDays: "0,1,3,7",
    IncludePreviousDays: 7,
    LastScheduledKey: "",
    LastRunAt: "",
    LastRunStatus: "Belum pernah dijalankan.",
    LastEmailCount: 0,
    UpdatedAt: "",
    UpdatedBy: "",
    OverdueReminderLastKey: "",
    OverdueReminderLastRunAt: "",
    OverdueReminderLastCount: 0,
    HseSyncLastKey: "",
    HseSyncLastRunAt: "",
    HseSyncLastCount: 0
  };
}

/**
 * Jalankan fungsi ini SATU KALI dari Apps Script Editor sebagai pemilik script.
 * Fungsi ini meminta scope script.scriptapp dan membuat trigger pemeriksa jadwal
 * setiap 15 menit. Pengaturan hari dan jam tetap dilakukan dari halaman Admin.
 */
function installPortalSchedulerTrigger() {
  const handlerName = "runScheduledPortalEmail";

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === handlerName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handlerName)
    .timeBased()
    .everyMinutes(15)
    .create();

  PropertiesService.getScriptProperties().setProperties({
    PORTAL_SCHEDULER_TRIGGER_INSTALLED: "TRUE",
    PORTAL_SCHEDULER_TRIGGER_INSTALLED_AT: new Date().toISOString()
  });

  return {
    installed: true,
    message:
      "Trigger scheduler berhasil dipasang. Sistem akan memeriksa jadwal setiap 15 menit."
  };
}

/**
 * Jalankan dari Apps Script Editor jika trigger scheduler ingin dihapus.
 */
function removePortalSchedulerTrigger() {
  const handlerName = "runScheduledPortalEmail";
  let deleted = 0;

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === handlerName) {
      ScriptApp.deleteTrigger(trigger);
      deleted++;
    }
  });

  PropertiesService.getScriptProperties().deleteProperty(
    "PORTAL_SCHEDULER_TRIGGER_INSTALLED"
  );
  PropertiesService.getScriptProperties().deleteProperty(
    "PORTAL_SCHEDULER_TRIGGER_INSTALLED_AT"
  );

  return {
    installed: false,
    deleted: deleted,
    message: "Trigger scheduler telah dihapus."
  };
}

function describePortalEmailTrigger_(settings, triggerInstalled) {
  const daysLabel = scheduleDaysLabel_(settings.ScheduleDays);
  const timeLabel =
    String(settings.SendHour).padStart(2, "0") +
    ":" +
    String(settings.SendMinute).padStart(2, "0");

  if (!settings.Enabled) {
    return "Disabled - tidak ada email otomatis.";
  }

  if (!triggerInstalled) {
    return (
      "Pengaturan tersimpan untuk " +
      daysLabel +
      " pukul " +
      timeLabel +
      ", tetapi trigger belum dipasang. Jalankan installPortalSchedulerTrigger dari Apps Script Editor."
    );
  }

  return (
    daysLabel +
    " pukul " +
    timeLabel +
    " (" +
    Session.getScriptTimeZone() +
    "). Trigger memeriksa jadwal setiap 15 menit."
  );
}

function getPortalSchedulerDecision_(settings, now) {
  const current = now || new Date();
  const dayCodes = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const selectedDays = normalizeScheduleDays_(settings.ScheduleDays);
  const currentDayCode = dayCodes[current.getDay()];
  const sendHour = clampInteger_(settings.SendHour, 0, 23, 7);
  const sendMinute = normalizeSchedulerMinute_(settings.SendMinute);
  const currentMinutes = current.getHours() * 60 + current.getMinutes();
  const targetMinutes = sendHour * 60 + sendMinute;
  const scheduleKey =
    formatISO_(current) +
    " " +
    String(sendHour).padStart(2, "0") +
    ":" +
    String(sendMinute).padStart(2, "0");

  if (selectedDays.indexOf(currentDayCode) < 0) {
    return {
      shouldSend: false,
      scheduleKey: scheduleKey,
      message: "Hari ini tidak termasuk hari pengiriman."
    };
  }

  // Window 75 menit mengantisipasi trigger Apps Script yang dapat berjalan terlambat.
  if (currentMinutes < targetMinutes || currentMinutes >= targetMinutes + 75) {
    return {
      shouldSend: false,
      scheduleKey: scheduleKey,
      message: "Belum memasuki window pengiriman."
    };
  }

  if (String(settings.LastScheduledKey || "") === scheduleKey) {
    return {
      shouldSend: false,
      scheduleKey: scheduleKey,
      message: "Email pada jadwal ini sudah dikirim."
    };
  }

  return {
    shouldSend: true,
    scheduleKey: scheduleKey,
    message: "Jadwal pengiriman terpenuhi."
  };
}

function normalizeScheduleDays_(value) {
  const allowed = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const source = Array.isArray(value)
    ? value
    : String(value || "MON,TUE,WED,THU,FRI").split(/[;,\s]+/);

  const result = [];

  source.forEach(function (item) {
    const code = String(item || "").trim().toUpperCase();

    if (allowed.indexOf(code) >= 0 && result.indexOf(code) < 0) {
      result.push(code);
    }
  });

  return result;
}

function scheduleDaysLabel_(value) {
  const labels = {
    MON: "Senin",
    TUE: "Selasa",
    WED: "Rabu",
    THU: "Kamis",
    FRI: "Jumat",
    SAT: "Sabtu",
    SUN: "Minggu"
  };

  const days = normalizeScheduleDays_(value);

  if (days.length === 7) {
    return "Setiap hari";
  }

  if (days.join(",") === "MON,TUE,WED,THU,FRI") {
    return "Senin-Jumat";
  }

  return days.map(function (day) {
    return labels[day] || day;
  }).join(", ");
}

function normalizeSchedulerMinute_(value) {
  const number = clampInteger_(value, 0, 59, 0);
  const allowed = [0, 15, 30, 45];

  return allowed.reduce(function (closest, item) {
    return Math.abs(item - number) < Math.abs(closest - number) ? item : closest;
  }, 0);
}

function normalizeSchedulerFrequency_(value) {
  return "SELECTED_DAYS";
}

function normalizeEmailList_(value, label) {
  const items = String(value || "")
    .split(/[;,\n]+/)
    .map(function (item) {
      return item.trim();
    })
    .filter(Boolean);

  const unique = [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  items.forEach(function (email) {
    if (!emailPattern.test(email)) {
      throw new Error((label || "Email") + " tidak valid: " + email);
    }

    if (unique.indexOf(email) < 0) {
      unique.push(email);
    }
  });

  return unique.join(",");
}

function parseReminderDays_(value) {
  const parsed = String(value === null || value === undefined ? "0,1,3,7" : value)
    .split(/[;,\s]+/)
    .map(function (item) {
      return Number(item);
    })
    .filter(function (item) {
      return Number.isFinite(item) && item >= 0 && item <= 365;
    })
    .map(function (item) {
      return Math.floor(item);
    });

  const unique = Array.from(new Set(parsed));
  unique.sort(function (a, b) {
    return a - b;
  });

  return unique.length ? unique : [0, 1, 3, 7];
}

function clampInteger_(value, minimum, maximum, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.floor(number)));
}

function toBoolean_(value) {
  if (value === true || value === 1) {
    return true;
  }

  const text = String(value || "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "on" || text === "enabled";
}

function formatEmailDate_(isoDate) {
  const date = parseISO_(isoDate);

  if (!date) {
    return String(isoDate || "-");
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd MMM yyyy");
}

function htmlEscapeEmail_(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseISO_(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  date.setHours(0, 0, 0, 0);
  return date;
}

function formatISO_(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function startOfDay_(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfWeekMonday_(date) {
  const result = startOfDay_(date);
  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);
  return result;
}

function addDays_(date, numberOfDays) {
  const result = startOfDay_(date);
  result.setDate(result.getDate() + Number(numberOfDays || 0));
  return result;
}

function getISOWeekNumber_(date) {
  const current = startOfDay_(date);
  current.setDate(current.getDate() + 3 - ((current.getDay() + 6) % 7));

  const weekOne = new Date(current.getFullYear(), 0, 4);

  return 1 + Math.round(
    (
      (
        current.getTime() - weekOne.getTime()
      ) /
      86400000 -
      3 +
      ((weekOne.getDay() + 6) % 7)
    ) /
    7
  );
}

function isISODateInRange_(dateISO, startISO, endISO) {
  const value = String(dateISO || "");

  return (
    value &&
    value >= String(startISO || "") &&
    value <= String(endISO || "")
  );
}

function isDateRangeOverlap_(
  firstStartISO,
  firstEndISO,
  secondStartISO,
  secondEndISO
) {
  const firstStart = parseISO_(firstStartISO);
  const firstEnd = parseISO_(firstEndISO);
  const secondStart = parseISO_(secondStartISO);
  const secondEnd = parseISO_(secondEndISO);

  if (!firstStart || !firstEnd || !secondStart || !secondEnd) {
    return false;
  }

  return !(
    firstEnd.getTime() < secondStart.getTime() ||
    firstStart.getTime() > secondEnd.getTime()
  );
}

/**
 * Menghitung hari kerja:
 * - Sabtu tidak dihitung.
 * - Minggu tidak dihitung.
 * - Hari libur pada sheet Holidays tidak dihitung.
 */
function countWorkingDaysInclusive_(startDate, endDate, holidaysMap) {
  const holidays = holidaysMap || {};
  let current = startOfDay_(startDate);
  const end = startOfDay_(endDate);
  let count = 0;

  while (current.getTime() <= end.getTime()) {
    const day = current.getDay();
    const isWeekend = day === 0 || day === 6;
    const isHoliday = Boolean(holidays[formatISO_(current)]);

    if (!isWeekend && !isHoliday) {
      count++;
    }

    current = addDays_(current, 1);
  }

  return count;
}
