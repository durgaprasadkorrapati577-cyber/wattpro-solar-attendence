import { sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";

/** True when the workspace has no employee records yet, which means first-run setup is required. */
export async function isWorkspaceEmpty() {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(employees);
  return Number(row?.count ?? 0) === 0;
}
