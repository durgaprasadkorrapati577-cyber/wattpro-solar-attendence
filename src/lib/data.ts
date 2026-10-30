import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, employees, leaveRequests, sites } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import type { AppData } from "@/lib/types";

export async function getAppData(user: AuthUser): Promise<AppData> {
  const [employeeRows, attendanceRows, leaveRows, siteRows] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        role: employees.role,
        jobTitle: employees.jobTitle,
        department: employees.department,
        phone: employees.phone,
        status: employees.status,
        startDate: employees.startDate,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .orderBy(asc(employees.name)),
    db
      .select()
      .from(attendance)
      .where(user.role === "admin" ? undefined : eq(attendance.employeeId, user.id))
      .orderBy(desc(attendance.date), desc(attendance.clockIn)),
    db
      .select()
      .from(leaveRequests)
      .where(user.role === "admin" ? undefined : eq(leaveRequests.employeeId, user.id))
      .orderBy(desc(leaveRequests.createdAt)),
    db.select().from(sites).orderBy(asc(sites.name)),
  ]);

  return {
    employees: employeeRows.map((employee) => ({
      ...employee,
      createdAt: employee.createdAt.toISOString(),
    })),
    attendance: attendanceRows.map((record) => ({
      ...record,
      clockIn: record.clockIn.toISOString(),
      clockOut: record.clockOut?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    })),
    leaves: leaveRows.map((leave) => ({
      ...leave,
      createdAt: leave.createdAt.toISOString(),
    })),
    sites: siteRows.map((site) => ({
      ...site,
      createdAt: site.createdAt.toISOString(),
    })),
  };
}
