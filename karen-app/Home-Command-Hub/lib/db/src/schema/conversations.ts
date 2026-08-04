import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;
