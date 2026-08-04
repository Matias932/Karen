import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'roku' | 'android_tv' | 'ps5'
  ipAddress: text("ip_address").notNull(),
  macAddress: text("mac_address"),
  port: integer("port"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
