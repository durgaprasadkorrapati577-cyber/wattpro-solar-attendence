import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { employees, sessions } from "@/db/schema";

const COOKIE_NAME = "wattpro_session";
const SESSION_DAYS = 30;

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  department: string;
  status: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      role: employees.role,
      jobTitle: employees.jobTitle,
      department: employees.department,
      status: employees.status,
    })
    .from(sessions)
    .innerJoin(employees, eq(sessions.employeeId, employees.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.status === "active" ? rows[0] : null;
}

export async function createSession(employeeId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ employeeId, tokenHash: hashToken(token), expiresAt });

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  cookieStore.delete(COOKIE_NAME);
}
