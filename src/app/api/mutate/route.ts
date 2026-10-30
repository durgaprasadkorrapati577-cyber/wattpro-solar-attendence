import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, employees, leaveRequests, sites } from "@/db/schema";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import type { Resource } from "@/lib/types";

function text(data: Record<string, unknown>, key: string) {
  return typeof data[key] === "string" ? (data[key] as string).trim() : "";
}

function integer(data: Record<string, unknown>, key: string) {
  const number = Number(data[key]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function parseTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000) + 1;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return error("Please sign in again.", 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body.");
  }

  const resource = body.resource as Resource;
  const action = body.action;
  const id = Number(body.id);
  const data: Record<string, unknown> =
    body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : {};
  const admin = user.role === "admin";

  if (!["employees", "attendance", "leaves", "sites"].includes(resource) || !["create", "update", "delete"].includes(String(action))) {
    return error("Unknown action.");
  }
  if (action !== "create" && (!Number.isInteger(id) || id <= 0)) return error("Invalid record ID.");

  try {
    if (resource === "employees") {
      if (action === "delete") {
        if (!admin) return error("Only admins can remove team members.", 403);
        if (id === user.id) return error("You cannot remove your own account.");
        const deleted = await db.delete(employees).where(eq(employees.id, id)).returning({ id: employees.id });
        return deleted.length ? Response.json({ ok: true }) : error("Team member not found.", 404);
      }

      const name = text(data, "name");
      const email = text(data, "email").toLowerCase();
      const password = text(data, "password");
      if (action === "create") {
        if (!admin) return error("Only admins can add team members.", 403);
        if (!name || !/^\S+@\S+\.\S+$/.test(email)) return error("Enter a name and valid email address.");
        if (password.length < 8) return error("Password must be at least 8 characters.");
        const startDate = text(data, "startDate");
        if (!validDate(startDate)) return error("Enter a valid start date.");
        await db.insert(employees).values({
          name,
          email,
          passwordHash: hashPassword(password),
          role: text(data, "role") === "admin" ? "admin" : "employee",
          jobTitle: text(data, "jobTitle") || "Team member",
          department: text(data, "department") || "Operations",
          phone: text(data, "phone"),
          status: text(data, "status") === "inactive" ? "inactive" : "active",
          startDate,
        });
        return Response.json({ ok: true });
      }

      if (!admin && id !== user.id) return error("You cannot edit this profile.", 403);
      const [existing] = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, id)).limit(1);
      if (!existing) return error("Team member not found.", 404);
      if (!name) return error("Name is required.");
      const updates: Partial<typeof employees.$inferInsert> = { name, phone: text(data, "phone") };
      if (admin) {
        if (!/^\S+@\S+\.\S+$/.test(email)) return error("Enter a valid email address.");
        const startDate = text(data, "startDate");
        if (!validDate(startDate)) return error("Enter a valid start date.");
        updates.email = email;
        updates.role = text(data, "role") === "admin" ? "admin" : "employee";
        updates.jobTitle = text(data, "jobTitle") || "Team member";
        updates.department = text(data, "department") || "Operations";
        updates.status = text(data, "status") === "inactive" ? "inactive" : "active";
        updates.startDate = startDate;
      }
      if (password) {
        if (password.length < 8) return error("Password must be at least 8 characters.");
        updates.passwordHash = hashPassword(password);
      }
      await db.update(employees).set(updates).where(eq(employees.id, id));
      return Response.json({ ok: true });
    }

    if (resource === "sites") {
      if (!admin) return error("Only admins can manage work sites.", 403);
      if (action === "delete") {
        const deleted = await db.delete(sites).where(eq(sites.id, id)).returning({ id: sites.id });
        return deleted.length ? Response.json({ ok: true }) : error("Work site not found.", 404);
      }
      const name = text(data, "name");
      const code = text(data, "code").toUpperCase();
      const city = text(data, "city");
      if (!name || !code || !city) return error("Site name, code, and location are required.");
      const values = {
        name,
        code,
        city,
        address: text(data, "address"),
        status: text(data, "status") === "inactive" ? "inactive" : "active",
      };
      if (action === "create") await db.insert(sites).values(values);
      else {
        const updated = await db.update(sites).set(values).where(eq(sites.id, id)).returning({ id: sites.id });
        if (!updated.length) return error("Work site not found.", 404);
      }
      return Response.json({ ok: true });
    }

    if (resource === "attendance") {
      if (!admin) return error("Only admins can manage attendance records. Use the clock to track your own shift.", 403);
      if (action === "delete") {
        const deleted = await db.delete(attendance).where(eq(attendance.id, id)).returning({ id: attendance.id });
        return deleted.length ? Response.json({ ok: true }) : error("Attendance record not found.", 404);
      }
      const employeeId = integer(data, "employeeId");
      const siteId = integer(data, "siteId");
      const date = text(data, "date");
      const clockIn = parseTimestamp(text(data, "clockIn"));
      const clockOutText = text(data, "clockOut");
      const clockOut = clockOutText ? parseTimestamp(clockOutText) : null;
      if (!employeeId || !validDate(date) || !clockIn || (clockOutText && !clockOut)) {
        return error("Choose a team member, date, and valid clock-in time.");
      }
      if (clockOut && clockOut <= clockIn) return error("Clock-out must be after clock-in.");
      const values = {
        employeeId,
        siteId,
        date,
        clockIn,
        clockOut,
        status: text(data, "status") === "late" ? "late" : "present",
        note: text(data, "note"),
        source: "manual",
      };
      if (action === "create") await db.insert(attendance).values(values);
      else {
        const updated = await db.update(attendance).set(values).where(eq(attendance.id, id)).returning({ id: attendance.id });
        if (!updated.length) return error("Attendance record not found.", 404);
      }
      return Response.json({ ok: true });
    }

    if (resource === "leaves") {
      if (action === "delete") {
        const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
        if (!existing) return error("Request not found.", 404);
        if (!admin && (existing.employeeId !== user.id || existing.status !== "pending")) return error("You can only remove your own pending requests.", 403);
        await db.delete(leaveRequests).where(eq(leaveRequests.id, id));
        return Response.json({ ok: true });
      }

      if (action === "update") {
        const [existing] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
        if (!existing) return error("Request not found.", 404);
        if (!admin && (existing.employeeId !== user.id || existing.status !== "pending")) return error("You can only edit your own pending requests.", 403);
        if (Object.keys(data).length === 1 && "status" in data) {
          if (!admin) return error("Only admins can review requests.", 403);
          const status = text(data, "status");
          if (!["pending", "approved", "rejected"].includes(status)) return error("Invalid request status.");
          await db.update(leaveRequests).set({ status }).where(eq(leaveRequests.id, id));
          return Response.json({ ok: true });
        }
      }

      const employeeId = admin ? integer(data, "employeeId") : user.id;
      const startDate = text(data, "startDate");
      const endDate = text(data, "endDate");
      const type = text(data, "type");
      if (!employeeId || !validDate(startDate) || !validDate(endDate) || daysBetween(startDate, endDate) < 1) {
        return error("Choose a team member and a valid date range.");
      }
      if (!["Vacation", "Sick leave", "Personal", "Other"].includes(type)) return error("Choose a leave type.");
      const status = text(data, "status");
      const values = {
        employeeId,
        type,
        startDate,
        endDate,
        days: daysBetween(startDate, endDate),
        reason: text(data, "reason"),
        status: admin && ["pending", "approved", "rejected"].includes(status) ? status : "pending",
      };
      if (action === "create") await db.insert(leaveRequests).values(values);
      else {
        const updated = await db.update(leaveRequests).set(values).where(eq(leaveRequests.id, id)).returning({ id: leaveRequests.id });
        if (!updated.length) return error("Request not found.", 404);
      }
      return Response.json({ ok: true });
    }

    return error("Unknown resource.");
  } catch (cause) {
    console.error("Mutation failed", cause);
    const code = (cause as { code?: string; cause?: { code?: string } }).code ?? (cause as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") return error("A record with these details already exists. Check the email, site code, or date.", 409);
    if (code === "23503") return error("A linked team member or site could not be found.");
    return error("Could not save your changes. Please try again.", 500);
  }
}
