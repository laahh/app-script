function env(key, fallback) {
  const value = process.env[key];
  return value !== undefined && value !== "" ? value : fallback;
}

export const SPREADSHEET_ID = env(
  "SPREADSHEET_ID",
  "13VLFWZBftawE2cO20t-AIzM_cC3hGDuJc5qGifXMj7o"
);

export const SHEET_EMPLOYEES = env("SHEET_EMPLOYEES", "Employees");
export const SHEET_LEAVE_TYPES = env("SHEET_LEAVE_TYPES", "LeaveTypes");
export const SHEET_LEAVE_REQUESTS = env("SHEET_LEAVE_REQUESTS", "LeaveRequests");
export const SHEET_HOLIDAYS = env("SHEET_HOLIDAYS", "Holidays");
export const SHEET_EVENTS = env("SHEET_EVENTS", "Events");
export const SHEET_TRACKERS = env("SHEET_TRACKERS", "ProjectIssueTracker");
export const SHEET_TRACKER_UPDATES = env(
  "SHEET_TRACKER_UPDATES",
  "ProjectIssueUpdateLog"
);
export const SHEET_TRACKER_TASKS = env("SHEET_TRACKER_TASKS", "ProjectIssueSubTasks");
export const SHEET_TRACKER_TASK_UPDATES = env(
  "SHEET_TRACKER_TASK_UPDATES",
  "ProjectIssueSubTaskUpdateLog"
);
export const SHEET_EMAIL_SCHEDULER = env(
  "SHEET_EMAIL_SCHEDULER",
  "EmailSchedulerSettings"
);

export const LEAVE_HEADERS = [
  "Timestamp", "RequestId", "EmpId", "EmpName", "Team", "Position",
  "LeaveType", "StartDate", "EndDate", "StartTime", "EndTime", "Note",
  "BackupEmpId", "BackupEmpName", "BackupTeam", "BackupPosition",
  "SiteDedicated", "BackupSiteDedicated",
];

export const EVENT_HEADERS = [
  "Timestamp", "EventId", "EventName", "Description", "Where",
  "ReadinessUpdate", "ReadinessUpdatedAt", "PICEmpId", "PICName",
  "PICTeam", "PICPosition", "PICSiteDedicated", "EventDate",
];

export const TRACKER_HEADERS = [
  "Timestamp", "TrackerId", "TrackerType", "ProjectIssueName", "Department",
  "ProjectLeaderEmpId", "ProjectLeaderName", "ProjectLeaderTeam",
  "ProjectLeaderPosition", "ProjectLeaderSiteDedicated", "Site",
  "DescriptionProject", "BackgroundProject", "ImpactProject",
  "StartDate", "DueDate", "SuccessIndicator", "CurrentPercentComplete",
  "CurrentProgressReportWeekly", "CurrentRemarks", "Status", "LastUpdated",
];

export const TRACKER_UPDATE_HEADERS = [
  "Timestamp", "UpdateId", "TrackerId", "PercentComplete",
  "ProgressReportWeekly", "Remarks", "Status", "UpdatedByEmpId",
  "UpdatedByName", "UpdatedByTeam", "UpdatedByPosition", "UpdatedBySiteDedicated",
];

export const TRACKER_TASK_HEADERS = [
  "Timestamp", "SubTaskId", "TrackerId", "SubTaskName", "Department",
  "PICEmpId", "PICName", "PICTeam", "PICPosition", "PICSiteDedicated", "Site",
  "DescriptionSubTask", "StartDate", "DueDate", "SuccessIndicator",
  "CurrentPercentComplete", "CurrentProgressReportWeekly", "CurrentRemarks",
  "Status", "LastUpdated",
];

export const TRACKER_TASK_UPDATE_HEADERS = [
  "Timestamp", "UpdateId", "TrackerId", "SubTaskId", "PercentComplete",
  "ProgressReportWeekly", "Remarks", "Status", "UpdatedByEmpId",
  "UpdatedByName", "UpdatedByTeam", "UpdatedByPosition", "UpdatedBySiteDedicated",
];

export const TRACKER_LEGACY_HEADERS = [
  "Title", "Description", "PICEmpId", "PICName", "PICTeam", "PICPosition",
  "PICSiteDedicated", "ProgressUpdate", "OwnerEmpId", "OwnerName", "OwnerTeam",
  "OwnerPosition", "OwnerSiteDedicated",
];

export const EMAIL_SCHEDULER_HEADERS = [
  "Enabled", "Frequency", "ScheduleDays", "SendHour", "SendMinute",
  "Recipients", "Cc", "Bcc", "PortalUrl", "OverviewTeam", "OverviewSite",
  "IncludeLeaveSummary", "IncludeTrackerSummary", "IncludeLeaderboard",
  "SubjectPrefix", "LastScheduledKey", "LastRunAt", "LastRunStatus",
  "LastEmailCount", "UpdatedAt", "UpdatedBy", "EventReminderDays", "IncludePreviousDays",
];
