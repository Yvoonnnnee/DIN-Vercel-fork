import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

if (!env.DATABASE_URL) {
  console.warn("DATABASE_URL is not configured. Database calls will fail until it is set.");
}

let database:
  | ReturnType<typeof drizzle<typeof schema>>
  | null = null;

export function getDb() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!database) {
    let sql;
    try {
      sql = neon(env.DATABASE_URL);
    } catch (error) {
      throw new Error(
        "DATABASE_URL is invalid after sanitization. Check for a malformed Vercel environment variable.",
        { cause: error },
      );
    }
    database = drizzle(sql, { schema });
  }

  return database;
}
