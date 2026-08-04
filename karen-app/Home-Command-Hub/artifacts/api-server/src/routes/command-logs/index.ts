import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import { db, commandLogsTable, devicesTable } from "@workspace/db";
import { ListCommandLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /command-logs
router.get("/command-logs", async (req, res): Promise<void> => {
  const parsed = ListCommandLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const limit = parsed.data.limit ?? 50;
  const deviceId = parsed.data.deviceId;

  const query = db
    .select({
      id: commandLogsTable.id,
      deviceId: commandLogsTable.deviceId,
      deviceName: devicesTable.name,
      command: commandLogsTable.command,
      status: commandLogsTable.status,
      response: commandLogsTable.response,
      createdAt: commandLogsTable.createdAt,
    })
    .from(commandLogsTable)
    .leftJoin(devicesTable, eq(commandLogsTable.deviceId, devicesTable.id))
    .orderBy(desc(commandLogsTable.createdAt))
    .limit(limit);

  let logs;
  if (deviceId) {
    logs = await query.where(eq(commandLogsTable.deviceId, deviceId));
  } else {
    logs = await query;
  }

  res.json(
    logs.map((l) => ({
      id: l.id,
      deviceId: l.deviceId ?? null,
      deviceName: l.deviceName ?? null,
      command: l.command,
      status: l.status as "success" | "failed" | "pending",
      response: l.response ?? null,
      createdAt: l.createdAt,
    })),
  );
});

// GET /command-logs/stats
router.get("/command-logs/stats", async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({
      total: count(),
      successful: sql<number>`SUM(CASE WHEN ${commandLogsTable.status} = 'success' THEN 1 ELSE 0 END)::int`,
      failed: sql<number>`SUM(CASE WHEN ${commandLogsTable.status} = 'failed' THEN 1 ELSE 0 END)::int`,
    })
    .from(commandLogsTable);

  const byDevice = await db
    .select({
      deviceName: devicesTable.name,
      count: count(),
    })
    .from(commandLogsTable)
    .leftJoin(devicesTable, eq(commandLogsTable.deviceId, devicesTable.id))
    .groupBy(devicesTable.name)
    .orderBy(desc(count()));

  res.json({
    total: totals?.total ?? 0,
    successful: totals?.successful ?? 0,
    failed: totals?.failed ?? 0,
    byDevice: byDevice
      .filter((b) => b.deviceName !== null)
      .map((b) => ({ deviceName: b.deviceName!, count: b.count })),
  });
});

export default router;
