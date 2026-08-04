import { createSocket } from "dgram";
import { createConnection } from "net";

// PS5 Wake-on-LAN via UDP broadcast magic packet
export async function wakePS5(macAddress: string): Promise<void> {
  const mac = macAddress.replace(/[:\-. ]/g, "").toLowerCase();
  if (mac.length !== 12)
    throw new Error(`Invalid MAC address format: "${macAddress}"`);

  // Magic packet: 6 bytes of 0xFF followed by the MAC repeated 16 times
  const magicPacket = Buffer.alloc(102);
  for (let i = 0; i < 6; i++) magicPacket[i] = 0xff;
  for (let rep = 0; rep < 16; rep++) {
    for (let i = 0; i < 6; i++) {
      magicPacket[6 + rep * 6 + i] = parseInt(mac.slice(i * 2, i * 2 + 2), 16);
    }
  }

  return new Promise((resolve, reject) => {
    const socket = createSocket("udp4");
    socket.once("error", (err) => {
      socket.close();
      reject(err);
    });
    socket.bind(0, () => {
      socket.setBroadcast(true);
      // Send to both port 9 (standard WoL) and port 7
      socket.send(magicPacket, 0, magicPacket.length, 9, "255.255.255.255", (err) => {
        socket.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Try to TCP-ping a PS5 (it listens on port 987 for PS Remote Play)
export async function isPS5Reachable(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: ip, port: 987, timeout: 3000 });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}
