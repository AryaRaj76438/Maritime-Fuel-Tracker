import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";


dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env");
}

export default defineConfig({
  schema: "./src/schema",   // 🔥 KEY FIX
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});