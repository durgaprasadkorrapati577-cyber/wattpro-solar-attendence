import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { attendance, sites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const now = new Date();
    const date = now.toISOString().slice(0, 10);

    if (action === "in") {
      const [existing] = await db
        .select({ id: attendance.id })
        .from(attendance)
        .where(and(eq(attendance.employeeId, user.id), eq(attendance.date, date)))
        .limit(1);
      if (existing) return Response.json({ error: "You already have a shift recorded for today." }, { status: 409 });

      const activeSites = await db.select({ id: sites.id }).from(sites).where(eq(sites.status, "active"));
      const requestedSiteId = Number(body.siteId);
      const siteId = activeSites.find((site) => site.id === requestedSiteId)?.id ?? activeSites[0]?.id ?? null;
      await db.insert(attendance).values({
        employeeId: user.id,
        siteId,
        date,
        clockIn: now,
        status: now.getUTCHours() >= 9 ? "late" : "present",
        source: "clock",
      });
      return Response.json({ ok: true, message: "You’re clocked in. Have a great shift!" });
    }

    if (action === "out") {
      const [active] = await db
        .select({ id: attendance.id })
        .from(attendance)
        .where(and(eq(attendance.employeeId, user.id), eq(attendance.date, date), isNull(attendance.clockOut)))
        .limit(1);
      if (!active) return Response.json({ error: "You don’t have an active shift today." }, { status: 409 });
      await db.update(attendance).set({ clockOut: now }).where(eq(attendance.id, active.id));
      return Response.json({ ok: true, message: "Shift complete. See you next time!" });
    }

    return Response.json({ error: "Unknown clock action." }, { status: 400 });
  } catch (error) {
    console.error("Clock action failed", error);
    return Response.json({ error: "Could not update your shift. Please try again." }, { status: 500 });
  }
}
