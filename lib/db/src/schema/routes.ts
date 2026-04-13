import { pgTable, text, serial, timestamp, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const routesTable = pgTable("routes", {
  id: serial("id").primaryKey(),
  routeId: text("route_id").notNull().unique(),
  vesselType: text("vessel_type").notNull(),
  fuelType: text("fuel_type").notNull(),
  year: integer("year").notNull(),
  ghgIntensity: real("ghg_intensity").notNull(),
  fuelConsumption: real("fuel_consumption").notNull(),
  distance: real("distance").notNull(),
  totalEmissions: real("total_emissions").notNull(),
  isBaseline: boolean("is_baseline").notNull().default(false),
  shipId: text("ship_id").notNull(),
  energyInScope: real("energy_in_scope").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRouteSchema = createInsertSchema(routesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routesTable.$inferSelect;
