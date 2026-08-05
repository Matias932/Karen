import OpenAI from "openai";
import { openai } from "./openai";
import { db, devicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export interface KarenDeviceAction {
  deviceName: string;
  command: string;
  appId?: string;
}

export interface KarenResult {
  karensResponse: string;
  deviceActions: KarenDeviceAction[];
}

const CONTROL_DEVICE_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "control_device",
    description: "Control a smart home device (TV, PS5, etc.)",
    parameters: {
      type: "object",
      properties: {
        deviceName: {
          type: "string",
          description:
            "Name of the device to control. Match from the available devices list.",
        },
        command: {
          type: "string",
          enum: [
            "power_on",
            "power_off",
            "volume_up",
            "volume_down",
            "mute",
            "unmute",
            "home",
            "back",
            "play",
            "pause",
            "up",
            "down",
            "left",
            "right",
            "select",
            "launch_app",
            "wake",
          ],
          description: "The command to execute",
        },
        appId: {
          type: "string",
          description:
            "For launch_app: the app channel ID (Roku) or package name (Android TV)",
        },
      },
      required: ["deviceName", "command"],
    },
  },
};

async function buildSystemPrompt(): Promise<string> {
  const devices = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.isActive, true));

  const deviceList =
    devices.length > 0
      ? devices
          .map(
            (d) =>
              `- "${d.name}" (${d.type.replace("_", " ").toUpperCase()}${d.ipAddress ? `, IP: ${d.ipAddress}` : ""})`,
          )
          .join("\n")
      : "No devices configured yet. Tell the user to add devices in the Devices section.";

  return `You are Karen, Peter Parker's AI suit assistant from Spider-Man: Homecoming. You now manage this user's smart home devices.

Your personality: helpful, concise, warm — like a trusted AI partner. Occasionally reference being a Spider-Man suit AI, but keep it brief. You're speaking out loud so keep responses SHORT (1-2 sentences max).

Available devices:
${deviceList}

Known Roku app IDs (use as appId for launch_app): Netflix=12, YouTube=837, Disney Plus=291097, Apple TV=551012, Prime Video=13, Pluto TV=252585, Anime Plus=663555.

When the user asks to control a device, use the control_device tool. Match device names flexibly — "my Roku", "the TV", "PlayStation" all count. You can control multiple devices in one turn.

Supported commands: power_on/off, volume_up/down, mute/unmute, up, down, left, right, select, home, back, play, pause, launch_app, wake (PS5 only).

If a command isn't supported (e.g., complex PS5 control beyond wake), explain briefly and suggest alternatives. Be honest if something can't be done.

IMPORTANT: Keep all spoken responses under 2 sentences. You're talking, not typing.`;
}

export async function processKarenCommand(
  userText: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<KarenResult> {
  const systemPrompt = await buildSystemPrompt();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: "user", content: userText },
  ];

  const response = await openai.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages,
    tools: [CONTROL_DEVICE_TOOL],
    max_tokens: 300,
  });

  const choice = response.choices[0];
  const deviceActions: KarenDeviceAction[] = [];

  if (choice.message.tool_calls) {
    for (const toolCall of choice.message.tool_calls) {
      if (toolCall.function.name === "control_device") {
        try {
          const args = JSON.parse(toolCall.function.arguments) as {
            deviceName: string;
            command: string;
            appId?: string;
          };
          deviceActions.push({
            deviceName: args.deviceName,
            command: args.command,
            appId: args.appId,
          });
        } catch (e) {
          logger.warn({ toolCall }, "Failed to parse control_device arguments");
        }
      }
    }
  }

  const karensResponse = choice.message.content ?? "Entendido.";
  return { karensResponse, deviceActions };
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  // OpenAI supports WebM directly for transcription
  const audioFile = new File([audioBuffer], "audio.webm", {
    type: "audio/webm",
  });

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-large-v3-turbo",
    // No language specified - Whisper auto-detects (supports Spanish and English)
  });

  return transcription.text;
}

export async function generateKarenVoice(text: string): Promise<Buffer> {
  const response = await openai.audio.speech.create({
    model: "canopylabs/orpheus-v1-english",
    voice: "hannah", // Clear female voice
    input: text,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
