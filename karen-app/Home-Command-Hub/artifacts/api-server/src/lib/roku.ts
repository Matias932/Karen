// Roku External Control Protocol (ECP)
// HTTP API running on port 8060 of the Roku device

import { fetch, ProxyAgent } from "undici";

const DEFAULT_ROKU_PORT = 8060;

const TAILSCALE_PROXY_URL = process.env.TAILSCALE_PROXY_URL;
const proxyDispatcher = TAILSCALE_PROXY_URL
  ? new ProxyAgent(TAILSCALE_PROXY_URL)
  : undefined;

function fetchOptions(extra: RequestInit = {}): RequestInit {
  return {
    ...extra,
    ...(proxyDispatcher ? ({ dispatcher: proxyDispatcher } as any) : {}),
  };
}

const ROKU_KEYCODES: Record<string, string> = {
  power_on: "PowerOn",
  power_off: "PowerOff",
  power_toggle: "Power",
  volume_up: "VolumeUp",
  volume_down: "VolumeDown",
  mute: "VolumeMute",
  unmute: "VolumeMute",
  home: "Home",
  back: "Back",
  play: "Play",
  pause: "Play", // Roku Play toggles play/pause
  forward: "Fwd",
  rewind: "Rev",
  select: "Select",
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
};

export async function sendRokuKeypress(
  ip: string,
  command: string,
  port = DEFAULT_ROKU_PORT,
): Promise<void> {
  const keycode = ROKU_KEYCODES[command];
  if (!keycode) throw new Error(`Unknown Roku command: ${command}`);

  const url = `http://${ip}:${port}/keypress/${keycode}`;
  const response = await fetch(
    url,
    fetchOptions({ method: "POST", signal: AbortSignal.timeout(5000) }),
  );
  if (!response.ok)
    throw new Error(`Roku keypress failed: ${response.status}`);
}

export async function launchRokuApp(
  ip: string,
  appId: string,
  port = DEFAULT_ROKU_PORT,
): Promise<void> {
  const url = `http://${ip}:${port}/launch/${encodeURIComponent(appId)}`;
  const response = await fetch(
    url,
    fetchOptions({ method: "POST", signal: AbortSignal.timeout(5000) }),
  );
  if (!response.ok)
    throw new Error(`Roku app launch failed: ${response.status}`);
}

export async function listRokuApps(
  ip: string,
  port = DEFAULT_ROKU_PORT,
): Promise<Array<{ id: string; name: string; type: string; version: string | null }>> {
  const url = `http://${ip}:${port}/query/apps`;
  const response = await fetch(url, fetchOptions({ signal: AbortSignal.timeout(5000) }));
  if (!response.ok)
    throw new Error(`Roku apps query failed: ${response.status}`);

  const xml = await response.text();
  const apps: Array<{ id: string; name: string; type: string; version: string | null }> = [];

  const regex =
    /<app\s+id="([^"]+)"(?:[^>]*?type="([^"]*)")?(?:[^>]*?version="([^"]*)")?[^>]*>([^<]+)<\/app>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    apps.push({
      id: match[1],
      type: match[2] ?? "app",
      version: match[3] ?? null,
      name: match[4].trim(),
    });
  }

  return apps;
}

export async function isRokuReachable(
  ip: string,
  port = DEFAULT_ROKU_PORT,
): Promise<boolean> {
  try {
    const response = await fetch(
      `http://${ip}:${port}/query/device-info`,
      fetchOptions({ signal: AbortSignal.timeout(10000) }),
    );
    return response.ok;
  } catch {
    return false;
  }
}
