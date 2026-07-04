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

  try {
    const result = await portal.runScheduledPortalEmail();
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Cron failed" });
  }
}
