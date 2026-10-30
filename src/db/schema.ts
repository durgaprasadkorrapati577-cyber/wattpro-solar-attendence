import {
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("employee"),
  jobTitle: text("job_title").notNull().default("Team member"),
  department: text("department").notNull().default("Operations"),
  phone: text("phone").notNull().default(""),
  status: text("status").notNull().default("active"),
  startDate: date("start_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  city: text("city").notNull(),
  address: text("address").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    siteId: integer("site_id").references(() => sites.id, { onDelete: "set null" }),
    date: date("work_date").notNull(),
    clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),
    clockOut: timestamp("clock_out", { withTimezone: true }),
    status: text("status").notNull().default("present"),
    note: text("note").notNull().default(""),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_employee_date_unique").on(table.employeeId, table.date),
    index("attendance_date_idx").on(table.date),
  ],
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("Vacation"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    days: integer("days").notNull(),
    reason: text("reason").notNull().default(""),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("leave_employee_idx").on(table.employeeId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_employee_idx").on(table.employeeId)],
);
