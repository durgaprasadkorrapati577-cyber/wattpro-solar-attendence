import { sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";

/** Creates the very first administrator for a fresh workspace and signs them in. */
export async function POST(request: Request) {
  try {
    const [existing] = await db.select({ count: sql<number>`count(*)::int` }).from(employees);
    if (Number(existing?.count ?? 0) > 0) {
      return Response.json({ error: "This workspace is already set up. Please sign in instead." }, { status: 409 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!name) return Response.json({ error: "Please enter your full name." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Please choose a password of at least 8 characters." }, { status: 400 });

    const [created] = await db
      .insert(employees)
      .values({
        name,
        email,
        passwordHash: hashPassword(password),
        role: "admin",
        jobTitle: "Administrator",
        department: "Administration",
        status: "active",
        startDate: new Date().toISOString().slice(0, 10),
      })
      .returning({ id: employees.id });

    await createSession(created.id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Workspace setup failed", error);
    const code = (error as { code?: string }).code;
    if (code === "23505") return Response.json({ error: "That email address is already in use." }, { status: 409 });
    return Response.json({ error: "Could not complete setup. Please try again." }, { status: 500 });
  }
}
