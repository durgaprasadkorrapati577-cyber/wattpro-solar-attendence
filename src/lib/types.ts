export type EmployeeData = {
  id: number;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  department: string;
  phone: string;
  status: string;
  startDate: string;
  createdAt: string;
};

export type SiteData = {
  id: number;
  name: string;
  code: string;
  city: string;
  address: string;
  status: string;
  createdAt: string;
};

export type AttendanceData = {
  id: number;
  employeeId: number;
  siteId: number | null;
  date: string;
  clockIn: string;
  clockOut: string | null;
  status: string;
  note: string;
  source: string;
  createdAt: string;
};

export type LeaveData = {
  id: number;
  employeeId: number;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  createdAt: string;
};

export type AppData = {
  employees: EmployeeData[];
  attendance: AttendanceData[];
  leaves: LeaveData[];
  sites: SiteData[];
};

export type Resource = "employees" | "attendance" | "leaves" | "sites";
export type View = "overview" | "attendance" | "team" | "time-off" | "sites" | "settings";
