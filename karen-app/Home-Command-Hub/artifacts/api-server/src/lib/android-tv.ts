import { execFile } from "child_process";
import { promisify } from "util";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);
const DEFAULT_ADB_PORT = 5555;

const HOST_RE = /^[a-zA-Z0-9.-]+$/;

function assertSafeHost(ip: string): void {
  if (!HOST_RE.test(ip)) {
    throw new Error(`Invalid Android TV host/IP: "${ip}"`);
  }
}

const PACKAGE_RE = /^[a-zA-Z0-9_.]+$/;

function assertSafePackageName(packageName: string): void {
  if (!PACKAGE_RE.test(packageName)) {
    throw new Error(`Invalid Android package name: "${packageName}"`);
  }
}

const ADB_KEYCODES: Record<string, number> = {
  power_on: 224,
  power_off: 223,
  power_toggle: 26,
  volume_up: 24,
  volume_down: 25,
  mute: 164,
  unmute: 164,
  home: 3,
  back: 4,
  play: 85,
  pause: 85,
  forward: 90,
  rewind: 89,
  select: 66,
  up: 19,
  down: 20,
  left: 21,
  right: 22,
};

async function adbConnect(ip: string, port = DEFAULT_ADB_PORT): Promise<void> {
  assertSafeHost(ip);
  try {
    await execFileAsync("adb", ["connect", `${ip}:${port}`], { timeout: 10000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ADB connect failed (${ip}:${port}): ${msg}. Make sure ADB is installed and Android TV has Network Debugging enabled in Developer Options.`,
    );
  }
}

export async function sendAndroidTvKeypress(
  ip: string,
  command: string,
  port = DEFAULT_ADB_PORT,
): Promise<void> {
  const keycode = ADB_KEYCODES[command];
  if (keycode === undefined)
    throw new Error(`Unknown Android TV command: ${command}`);

  await adbConnect(ip, port);
  await execFileAsync(
    "adb",
    ["-s", `${ip}:${port}`, "shell", "input", "keyevent", String(keycode)],
    { timeout: 10000 },
  );
  logger.debug({ ip, port, command, keycode }, "Android TV keypress sent");
}

export async function launchAndroidTvApp(
  ip: string,
  packageName: string,
  port = DEFAULT_ADB_PORT,
): Promise<void> {
  assertSafePackageName(packageName);
  await adbConnect(ip, port);
  await execFileAsync(
    "adb",
    [
      "-s",
      `${ip}:${port}`,
      "shell",
      "monkey",
      "-p",
      packageName,
      "-c",
      "android.intent.category.LAUNCHER",
      "1",
    ],
    { timeout: 15000 },
  );
}

export async function isAndroidTvReachable(
  ip: string,
  port = DEFAULT_ADB_PORT,
): Promise<boolean> {
  try {
    assertSafeHost(ip);
    await execFileAsync("adb", ["connect", `${ip}:${port}`], { timeout: 5000 });
    const { stdout } = await execFileAsync(
      "adb",
      ["-s", `${ip}:${port}`, "shell", "echo", "ok"],
      { timeout: 5000 },
    );
    return stdout.trim() === "ok";
  } catch {
    return false;
  }
}
