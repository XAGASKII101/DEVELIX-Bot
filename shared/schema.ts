import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull().unique(),
  sessionData: json("session_data"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull(),
  name: text("name"),
  projectType: text("project_type"),
  budget: text("budget"),
  timeline: text("timeline"),
  description: text("description"),
  status: text("status").default("new"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const botMessages = pgTable("bot_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull(),
  messageType: text("message_type").notNull(), // "sent" | "received"
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  isBot: integer("is_bot").default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWhatsappSessionSchema = createInsertSchema(whatsappSessions).pick({
  phoneNumber: true,
  sessionData: true,
  isActive: true,
});

export const insertLeadSchema = createInsertSchema(leads).pick({
  phoneNumber: true,
  name: true,
  projectType: true,
  budget: true,
  timeline: true,
  description: true,
  status: true,
});

export const insertBotMessageSchema = createInsertSchema(botMessages).pick({
  phoneNumber: true,
  messageType: true,
  content: true,
  isBot: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWhatsappSession = z.infer<typeof insertWhatsappSessionSchema>;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export type InsertBotMessage = z.infer<typeof insertBotMessageSchema>;
export type BotMessage = typeof botMessages.$inferSelect;
