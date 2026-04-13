import { pgTable, serial, timestamp, integer, real, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const poolsTable = pgTable("pools", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const poolMembersTable = pgTable("pool_members", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").notNull(),
  shipId: text("ship_id").notNull(),
  cbBefore: real("cb_before").notNull(),
  cbAfter: real("cb_after").notNull(),
});

export const insertPoolSchema = createInsertSchema(poolsTable).omit({ id: true, createdAt: true });
export const insertPoolMemberSchema = createInsertSchema(poolMembersTable).omit({ id: true });
export type InsertPool = z.infer<typeof insertPoolSchema>;
export type InsertPoolMember = z.infer<typeof insertPoolMemberSchema>;
export type Pool = typeof poolsTable.$inferSelect;
export type PoolMember = typeof poolMembersTable.$inferSelect;
