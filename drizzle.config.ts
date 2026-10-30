import { defineConfig } from "drizzle-kit";

// drizzle-kit loads `.env` automatically, so the connection string stays out of version control.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file before running drizzle-kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
