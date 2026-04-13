import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shipComplianceTable = pgTable("ship_compliance", {
  id: serial("id").primaryKey(),
  shipId: text("ship_id").notNull(),
  year: integer("year").notNull(),
  cbGco2eq: real("cb_gco2eq").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertShipComplianceSchema = createInsertSchema(shipComplianceTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShipCompliance = z.infer<typeof insertShipComplianceSchema>;
export type ShipCompliance = typeof shipComplianceTable.$inferSelect;
