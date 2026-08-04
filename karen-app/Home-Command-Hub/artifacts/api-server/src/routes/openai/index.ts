import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, conversationsTable, messagesTable } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
  SendOpenaiVoiceMessageBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiVoiceMessageParams,
} from "@workspace/api-zod";
import { processKarenCommand, transcribeAudio, generateKarenVoice } from "../../lib/karen";
import { executeDeviceCommandByName } from "../../lib/device-dispatcher";
import { openai } from "../../lib/openai";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

// GET /openai/conversations
router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const conversations = await db
    .select()
    .from(conversationsTable)
    .orderBy(desc(conversationsTable.createdAt));
  res.json(conversations);
});

// POST /openai/conversations
router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ title: parsed.data.title })
    .returning();

  res.status(201).json(conversation);
});

// GET /openai/conversations/:id
router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(asc(messagesTable.createdAt));

  res.json({ ...conversation, messages });
});

// DELETE /openai/conversations/:id
router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  const [deleted] = await db
    .delete(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

// GET /openai/conversations/:id/messages
router.get(
  "/openai/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const params = ListOpenaiMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid conversation ID" });
      return;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, params.data.id))
      .orderBy(asc(messagesTable.createdAt));

    res.json(messages);
  },
);

// POST /openai/conversations/:id/messages — Text chat with Karen (SSE streaming)
router.post(
  "/openai/conversations/:id/messages",
  async (req, res): Promise<void> => {
    const params = SendOpenaiMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid conversation ID" });
      return;
    }

    const parsed = SendOpenaiMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const conversationId = params.data.id;

    // Get conversation history
    const history = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.createdAt))
      .limit(20);

    const userContent = parsed.data.content;

    // Process with Karen (function calling)
    const karenResult = await processKarenCommand(
      userContent,
      history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    );

    // Execute device actions
    const actionResults = await Promise.all(
      karenResult.deviceActions.map((action) =>
        executeDeviceCommandByName(action.deviceName, action.command, action.appId),
      ),
    );

    // Stream Karen's text response
    res.write(
      `data: ${JSON.stringify({ type: "karen_response", text: karenResult.karensResponse })}\n\n`,
    );

    // Stream device action results
    for (let i = 0; i < karenResult.deviceActions.length; i++) {
      const action = karenResult.deviceActions[i];
      const result = actionResults[i];
      res.write(
        `data: ${JSON.stringify({
          type: "device_action",
          deviceName: action.deviceName,
          command: action.command,
          success: result.success,
          message: result.message,
        })}\n\n`,
      );
    }

    // Save messages to DB
    await db.insert(messagesTable).values([
      { conversationId, role: "user", content: userContent },
      { conversationId, role: "assistant", content: karenResult.karensResponse },
    ]);

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  },
);

// POST /openai/conversations/:id/voice-messages — Voice chat with Karen (SSE streaming)
router.post(
  "/openai/conversations/:id/voice-messages",
  async (req, res): Promise<void> => {
    const params = SendOpenaiVoiceMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid conversation ID" });
      return;
    }

    const parsed = SendOpenaiVoiceMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const conversationId = params.data.id;

    try {
      // Decode base64 audio
      const audioBuffer = Buffer.from(parsed.data.audio, "base64");

      // Step 1: Transcribe audio → user text
      let userText: string;
      try {
        userText = await transcribeAudio(audioBuffer);
      } catch (err) {
        req.log.error({ err }, "Transcription failed");
        res.write(
          `data: ${JSON.stringify({ type: "error", message: "No pude entenderte. Por favor intenta de nuevo." })}\n\n`,
        );
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
        return;
      }

      // Send user transcript immediately
      res.write(
        `data: ${JSON.stringify({ type: "user_transcript", text: userText })}\n\n`,
      );

      // Step 2: Get conversation history
      const history = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
        .orderBy(asc(messagesTable.createdAt))
        .limit(20);

      // Step 3: Process with Karen AI (function calling)
      const karenResult = await processKarenCommand(
        userText,
        history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );

      // Send Karen's text response
      res.write(
        `data: ${JSON.stringify({ type: "karen_response", text: karenResult.karensResponse })}\n\n`,
      );

      // Step 4: Execute device commands + generate TTS in parallel
      const [actionResults, audioBuffer2] = await Promise.all([
        Promise.all(
          karenResult.deviceActions.map((action) =>
            executeDeviceCommandByName(
              action.deviceName,
              action.command,
              action.appId,
            ),
          ),
        ),
        generateKarenVoice(karenResult.karensResponse),
      ]);

      // Send device action results
      for (let i = 0; i < karenResult.deviceActions.length; i++) {
        const action = karenResult.deviceActions[i];
        const result = actionResults[i];
        res.write(
          `data: ${JSON.stringify({
            type: "device_action",
            deviceName: action.deviceName,
            command: action.command,
            success: result.success,
            message: result.message,
          })}\n\n`,
        );
      }

      // Send audio (base64 MP3)
      res.write(
        `data: ${JSON.stringify({ type: "audio", data: audioBuffer2.toString("base64") })}\n\n`,
      );

      // Save messages to DB
      await db.insert(messagesTable).values([
        { conversationId, role: "user", content: userText },
        { conversationId, role: "assistant", content: karenResult.karensResponse },
      ]);
    } catch (err) {
      req.log.error({ err }, "Voice message processing failed");
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Algo salio mal. Por favor intenta de nuevo." })}\n\n`,
      );
    } finally {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    }
  },
);

export default router;
