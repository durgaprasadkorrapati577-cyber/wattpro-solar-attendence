import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) {
      return Response.json({ error: "Enter your email and password." }, { status: 400 });
    }

    const [employee] = await db.select().from(employees).where(eq(employees.email, email)).limit(1);
    if (!employee || employee.status !== "active" || !verifyPassword(password, employee.passwordHash)) {
      return Response.json({ error: "Incorrect email or password. Please try again." }, { status: 401 });
    }

    await createSession(employee.id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Sign in failed", error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
