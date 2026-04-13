import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankEntriesTable = pgTable("bank_entries", {
  id: serial("id").primaryKey(),
  shipId: text("ship_id").notNull(),
  year: integer("year").notNull(),
  amountGco2eq: real("amount_gco2eq").notNull(),
  entryType: text("entry_type").notNull().$type<"banked" | "applied">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBankEntrySchema = createInsertSchema(bankEntriesTable).omit({ id: true, createdAt: true });
export type InsertBankEntry = z.infer<typeof insertBankEntrySchema>;
export type BankEntry = typeof bankEntriesTable.$inferSelect;
