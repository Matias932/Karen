import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, devicesTable } from "@workspace/db";
import {
  CreateDeviceBody,
  UpdateDeviceBody,
  SendDeviceCommandBody,
  GetDeviceParams,
  UpdateDeviceParams,
  DeleteDeviceParams,
  SendDeviceCommandParams,
  ListRokuAppsParams,
  GetDeviceStatusParams,
} from "@workspace/api-zod";
import { executeDeviceCommand } from "../../lib/device-dispatcher";
import { listRokuApps } from "../../lib/roku";
import { checkDeviceStatus } from "../../lib/device-dispatcher";

const router: IRouter = Router();

// GET /devices
router.get("/devices", async (_req, res): Promise<void> => {
  const devices = await db
    .select()
    .from(devicesTable)
    .orderBy(devicesTable.createdAt);
  res.json(
    devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      ipAddress: d.ipAddress,
      macAddress: d.macAddress ?? null,
      port: d.port ?? null,
      isActive: d.isActive,
      createdAt: d.createdAt,
    })),
  );
});

// POST /devices
router.post("/devices", async (req, res): Promise<void> => {
  const parsed = CreateDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, type, ipAddress, macAddress, port, isActive } = parsed.data;

  const [device] = await db
    .insert(devicesTable)
    .values({
      name,
      type,
      ipAddress,
      macAddress: macAddress ?? null,
      port: port ?? null,
      isActive: isActive ?? true,
    })
    .returning();

  res.status(201).json({
    id: device.id,
    name: device.name,
    type: device.type,
    ipAddress: device.ipAddress,
    macAddress: device.macAddress ?? null,
    port: device.port ?? null,
    isActive: device.isActive,
    createdAt: device.createdAt,
  });
});

// GET /devices/:id
router.get("/devices/:id", async (req, res): Promise<void> => {
  const params = GetDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid device ID" });
    return;
  }

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, params.data.id));

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    id: device.id,
    name: device.name,
    type: device.type,
    ipAddress: device.ipAddress,
    macAddress: device.macAddress ?? null,
    port: device.port ?? null,
    isActive: device.isActive,
    createdAt: device.createdAt,
  });
});

// PUT /devices/:id
router.put("/devices/:id", async (req, res): Promise<void> => {
  const params = UpdateDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid device ID" });
    return;
  }

  const parsed = UpdateDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const { name, type, ipAddress, macAddress, port, isActive } = parsed.data;
  if (name !== undefined) updateData.name = name;
  if (type !== undefined) updateData.type = type;
  if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
  if (macAddress !== undefined) updateData.macAddress = macAddress;
  if (port !== undefined) updateData.port = port;
  if (isActive !== undefined) updateData.isActive = isActive;
  updateData.updatedAt = new Date();

  const [device] = await db
    .update(devicesTable)
    .set(updateData)
    .where(eq(devicesTable.id, params.data.id))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json({
    id: device.id,
    name: device.name,
    type: device.type,
    ipAddress: device.ipAddress,
    macAddress: device.macAddress ?? null,
    port: device.port ?? null,
    isActive: device.isActive,
    createdAt: device.createdAt,
  });
});

// DELETE /devices/:id
router.delete("/devices/:id", async (req, res): Promise<void> => {
  const params = DeleteDeviceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid device ID" });
    return;
  }

  const [deleted] = await db
    .delete(devicesTable)
    .where(eq(devicesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /devices/:id/command
router.post("/devices/:id/command", async (req, res): Promise<void> => {
  const params = SendDeviceCommandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid device ID" });
    return;
  }

  const parsed = SendDeviceCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await executeDeviceCommand(
    params.data.id,
    parsed.data.command,
    parsed.data.appId,
  );

  if (!result.success && result.message.includes("not found")) {
    res.status(404).json({ error: result.message });
    return;
  }

  res.json(result);
});

// GET /devices/:id/roku-apps
router.get("/devices/:id/roku-apps", async (req, res): Promise<void> => {
  const params = ListRokuAppsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid device ID" });
    return;
  }

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, params.data.id));

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  if (device.type !== "roku") {
    res.status(400).json({ error: "This endpoint is only for Roku devices" });
    return;
  }

  const apps = await listRokuApps(device.ipAddress, device.port ?? undefined);
  res.json(apps);
});

// GET /devices/:id/status
router.get("/devices/:id/status", async (req, res): Promise<void> => {
  const params = GetDeviceStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid device ID" });
    return;
  }

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, params.data.id));

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const online = await checkDeviceStatus(device.ipAddress, device.type);
  res.json({ deviceId: device.id, online, lastChecked: new Date() });
});

export default router;
