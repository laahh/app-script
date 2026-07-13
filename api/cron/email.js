import * as portal from "../../lib/portal/index.js";
import { sendJson, setCors } from "../../lib/api-router.js";

export default async function handler(req, res) {
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

  const result = {};
  let hasError = false;

  try {
    result.digest = await portal.runScheduledPortalEmail();
  } catch (err) {
    hasError = true;
    result.digest = { sent: false, error: err.message || "Digest cron failed" };
  }

  try {
    result.overdueReminder = await portal.runOverdueReminderCheck();
  } catch (err) {
    hasError = true;
    result.overdueReminder = { sent: false, error: err.message || "Overdue reminder cron failed" };
  }

  sendJson(res, hasError ? 500 : 200, result);
}
