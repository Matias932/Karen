import { db, devicesTable, commandLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendRokuKeypress, launchRokuApp, isRokuReachable } from "./roku";
import {
  sendAndroidTvKeypress,
  launchAndroidTvApp,
  isAndroidTvReachable,
} from "./android-tv";
import { wakePS5, isPS5Reachable } from "./ps5";
import { logger } from "./logger";

export interface CommandResult {
  success: boolean;
  message: string;
  deviceName: string;
}

export async function executeDeviceCommand(
  deviceId: number,
  command: string,
  appId?: string | null,
): Promise<CommandResult> {
  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, deviceId));

  if (!device) {
    return { success: false, message: "Device not found", deviceName: "Unknown" };
  }

  if (!device.isActive) {
    return {
      success: false,
      message: `Device "${device.name}" is disabled`,
      deviceName: device.name,
    };
  }

  let success = false;
  let message = "";

  try {
    const port = device.port ?? undefined;

    if (device.type === "roku") {
      if (command === "launch_app" && appId) {
        await launchRokuApp(device.ipAddress, appId, port);
        message = `Launched app on ${device.name}`;
      } else {
        await sendRokuKeypress(device.ipAddress, command, port);
        message = `Sent "${command}" to ${device.name}`;
      }
      success = true;
    } else if (device.type === "android_tv") {
      if (command === "launch_app" && appId) {
        await launchAndroidTvApp(device.ipAddress, appId, port);
        message = `Launched app on ${device.name}`;
      } else {
        await sendAndroidTvKeypress(device.ipAddress, command, port);
        message = `Sent "${command}" to ${device.name}`;
      }
      success = true;
    } else if (device.type === "ps5") {
      if (command === "power_on" || command === "wake") {
        if (!device.macAddress) {
          message = `PS5 Wake-on-LAN requires a MAC address. Please configure it in device settings.`;
          success = false;
        } else {
          await wakePS5(device.macAddress);
          message = `Wake-on-LAN sent to ${device.name}`;
          success = true;
        }
      } else {
        message = `Command "${command}" is not supported for PS5 via network control. Only power on (Wake-on-LAN) is supported.`;
        success = false;
      }
    } else {
      message = `Unknown device type: ${device.type}`;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    message = `Failed to send command to ${device.name}: ${errMsg}`;
    success = false;
    logger.error({ deviceId, command, err }, "Device command failed");
  }

  // Log the command
  await db.insert(commandLogsTable).values({
    deviceId,
    command,
    status: success ? "success" : "failed",
    response: message,
  });

  return { success, message, deviceName: device.name };
}

export async function executeDeviceCommandByName(
  deviceName: string,
  command: string,
  appId?: string,
): Promise<CommandResult> {
  const devices = await db.select().from(devicesTable);

  // Fuzzy name match (case-insensitive, partial)
  const search = deviceName.toLowerCase();
  const device = devices.find(
    (d) =>
      d.name.toLowerCase() === search ||
      d.name.toLowerCase().includes(search) ||
      search.includes(d.name.toLowerCase()),
  );

  if (!device) {
    return {
      success: false,
      message: `Device "${deviceName}" not found. Available: ${devices.map((d) => d.name).join(", ")}`,
      deviceName,
    };
  }

  return executeDeviceCommand(device.id, command, appId);
}

export async function checkDeviceStatus(ip: string, type: string): Promise<boolean> {
  if (type === "roku") return isRokuReachable(ip);
  if (type === "android_tv") return isAndroidTvReachable(ip);
  if (type === "ps5") return isPS5Reachable(ip);
  return false;
}
