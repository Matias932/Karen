import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "./logger";

const execAsync = promisify(exec);
const DEFAULT_ADB_PORT = 5555;

const ADB_KEYCODES: Record<string, number> = {
  power_on: 224, // KEYCODE_WAKEUP
  power_off: 223, // KEYCODE_SLEEP
  power_toggle: 26, // KEYCODE_POWER
  volume_up: 24,
  volume_down: 25,
  mute: 164, // KEYCODE_VOLUME_MUTE
  unmute: 164,
  home: 3,
  back: 4,
  play: 85, // KEYCODE_MEDIA_PLAY_PAUSE
  pause: 85,
  forward: 90, // KEYCODE_MEDIA_FAST_FORWARD
  rewind: 89, // KEYCODE_MEDIA_REWIND
  select: 66, // KEYCODE_ENTER
  up: 19,
  down: 20,
  left: 21,
  right: 22,
};

async function adbConnect(ip: string, port = DEFAULT_ADB_PORT): Promise<void> {
  try {
    await execAsync(`adb connect ${ip}:${port}`, { timeout: 10000 });
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
  await execAsync(
    `adb -s ${ip}:${port} shell input keyevent ${keycode}`,
    { timeout: 10000 },
  );
  logger.debug({ ip, port, command, keycode }, "Android TV keypress sent");
}

export async function launchAndroidTvApp(
  ip: string,
  packageName: string,
  port = DEFAULT_ADB_PORT,
): Promise<void> {
  await adbConnect(ip, port);
  await execAsync(
    `adb -s ${ip}:${port} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`,
    { timeout: 15000 },
  );
}

export async function isAndroidTvReachable(
  ip: string,
  port = DEFAULT_ADB_PORT,
): Promise<boolean> {
  try {
    await execAsync(`adb connect ${ip}:${port}`, { timeout: 5000 });
    const { stdout } = await execAsync(
      `adb -s ${ip}:${port} shell echo ok`,
      { timeout: 5000 },
    );
    return stdout.trim() === "ok";
  } catch {
    return false;
  }
}
