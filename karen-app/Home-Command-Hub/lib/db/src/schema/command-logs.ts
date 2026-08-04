import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { devicesTable } from "./devices";

export const commandLogsTable = pgTable("command_logs", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").references(() => devicesTable.id),
  command: text("command").notNull(),
  status: text("status").notNull().default("pending"), // 'success' | 'failed' | 'pending'
  response: text("response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommandLogSchema = createInsertSchema(commandLogsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertCommandLog = z.infer<typeof insertCommandLogSchema>;
export type CommandLog = typeof commandLogsTable.$inferSelect;
