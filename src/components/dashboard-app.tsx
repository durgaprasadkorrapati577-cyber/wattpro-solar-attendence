"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Timer,
  Trash2,
  UsersRound,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import type { AppData, AttendanceData, EmployeeData, LeaveData, Resource, SiteData, View } from "@/lib/types";

type RecordItem = EmployeeData | AttendanceData | LeaveData | SiteData;
type ModalState = { resource: Resource; mode: "create" | "edit" | "delete"; item?: RecordItem };
type ToastState = { message: string; type: "success" | "error" };

const palettes = [
  { background: "#e9e7d9", color: "#73684a" },
  { background: "#dcebe2", color: "#386a52" },
  { background: "#e9e2f0", color: "#745c8c" },
  { background: "#f5e7db", color: "#9a694f" },
  { background: "#dfe9ed", color: "#4b7181" },
  { background: "#eee9d9", color: "#887b42" },
];

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dateWithOffset(offset: number, base = new Date()) {
  const day = new Date(base);
  day.setUTCHours(12, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + offset);
  return dateKey(day);
}

function formatDate(value: string, year = false) {
  if (!value) return "—";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" } : {}),
  });
}

function formatFullDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function timeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function minutesWorked(record: AttendanceData, now: Date) {
  const end = record.clockOut ? new Date(record.clockOut) : record.date === dateKey(now) ? now : null;
  if (!end) return 0;
  return Math.max(0, Math.round((end.getTime() - new Date(record.clockIn).getTime()) / 60000));
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${String(Math.floor(minutes % 60)).padStart(2, "0")}m`;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function Avatar({ name, id, size = "md" }: { name: string; id: number; size?: "sm" | "md" | "lg" }) {
  const palette = palettes[Math.abs(id) % palettes.length];
  return <span className={`avatar avatar-${size}`} style={{ background: palette.background, color: palette.color }}>{initials(name)}</span>;
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`status-badge status-${status.toLowerCase().replace(/\s+/g, "-")}`}><span className="status-dot" />{label || status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function KpiCard({ icon: Icon, label, value, suffix, note, tone }: { icon: LucideIcon; label: string; value: string; suffix?: string; note: string; tone: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top"><span className={`kpi-icon kpi-${tone}`}><Icon size={19} strokeWidth={2} /></span><ArrowUpRight size={17} className="kpi-arrow" /></div>
      <div className="kpi-bottom"><span className="kpi-label">{label}</span><div className="kpi-value">{value}{suffix && <small>{suffix}</small>}</div><span className="kpi-note">{note}</span></div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action, onAction }: { icon: LucideIcon; title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={24} /></span><h3>{title}</h3><p>{description}</p>{action && onAction && <button className="button button-outline button-small" onClick={onAction}><Plus size={15} /> {action}</button>}</div>;
}

function FormField({ label, children, wide, hint }: { label: string; children: ReactNode; wide?: boolean; hint?: string }) {
  return <div className={`modal-field ${wide ? "field-wide" : ""}`}><label>{label}</label>{children}{hint && <span className="field-hint">{hint}</span>}</div>;
}

const navTop: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "overview", label: "Overview", icon: LayoutDashboard },
  { view: "attendance", label: "Attendance", icon: Clock3 },
  { view: "team", label: "Team members", icon: UsersRound },
];
const navBottom: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "time-off", label: "Time off", icon: CalendarDays },
  { view: "sites", label: "Work sites", icon: MapPin },
];
const viewLabels: Record<View, string> = { overview: "Overview", attendance: "Attendance", team: "Team members", "time-off": "Time off", sites: "Work sites", settings: "Settings" };
const resourceLabels: Record<Resource, string> = { employees: "team member", attendance: "attendance record", leaves: "time-off request", sites: "work site" };

export default function DashboardApp({ initialData, user, initialView }: { initialData: AppData; user: AuthUser; initialView: View }) {
  const [data, setData] = useState<AppData>(initialData);
  const [view, setView] = useState<View>(initialView);
  const [now, setNow] = useState(new Date());
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [clockBusy, setClockBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [search, setSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("All records");
  const [attendanceStatus, setAttendanceStatus] = useState("All statuses");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendancePage, setAttendancePage] = useState(1);
  const [teamFilter, setTeamFilter] = useState("All departments");
  const [leaveFilter, setLeaveFilter] = useState("All requests");
  const [selectedSite, setSelectedSite] = useState(String(initialData.sites.find((site) => site.status === "active")?.id ?? ""));
  const admin = user.role === "admin";
  const today = dateKey(now);
  const myProfile = data.employees.find((person) => person.id === user.id);
  const myName = myProfile?.name ?? user.name;
  const firstName = myName.split(" ")[0];
  const weekStartDate = (() => { const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); return dateKey(date); })();
  const weekDays = Array.from({ length: 7 }, (_, index) => { const date = new Date(`${weekStartDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + index); return dateKey(date); });
  const todayRecords = data.attendance.filter((record) => record.date === today);
  const activeRecords = todayRecords.filter((record) => !record.clockOut);
  const myShift = todayRecords.find((record) => record.employeeId === user.id);
  const pendingLeaves = data.leaves.filter((leave) => leave.status === "pending");
  const weekRecords = data.attendance.filter((record) => record.date >= weekStartDate && record.date <= today);
  const weekMinutes = weekRecords.reduce((sum, record) => sum + minutesWorked(record, now), 0);
  const dailyMinutes = weekDays.map((day) => weekRecords.filter((record) => record.date === day).reduce((sum, record) => sum + minutesWorked(record, now), 0));
  const maxDailyMinutes = Math.max(...dailyMinutes, 480);
  const activeSiteCount = data.sites.filter((site) => site.status === "active").length;
  const activeEmployeeCount = data.employees.filter((person) => person.status === "active").length;
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const allDepartments = [...new Set(data.employees.map((person) => person.department))].sort();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    const onPopState = () => {
      const param = new URLSearchParams(window.location.search).get("view") as View;
      setView(param && param in viewLabels ? param : "overview");
    };
    window.addEventListener("popstate", onPopState);
    return () => { window.clearInterval(interval); window.removeEventListener("popstate", onPopState); };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4300);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setModal(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, busy]);

  function navigate(next: View) {
    setView(next);
    setSearch("");
    setMobileMenu(false);
    setNotificationsOpen(false);
    window.history.pushState({}, "", next === "overview" ? "/" : `/?view=${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function notify(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  async function refreshData() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      if (response.status === 401) { window.location.assign("/login"); throw new Error("Session expired."); }
      if (!response.ok) throw new Error("Could not refresh data.");
      setData((await response.json()) as AppData);
    } finally {
      setRefreshing(false);
    }
  }

  async function requestMutation(resource: Resource, action: "create" | "update" | "delete", id?: number, payload?: Record<string, unknown>) {
    const response = await fetch("/api/mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, action, id, data: payload }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save changes.");
  }

  function openModal(resource: Resource, mode: ModalState["mode"], item?: RecordItem) {
    setModal({ resource, mode, item });
    if (resource === "employees") {
      const record = item as EmployeeData | undefined;
      setForm({ name: record?.name ?? "", email: record?.email ?? "", password: "", role: record?.role ?? "employee", jobTitle: record?.jobTitle ?? "", department: record?.department ?? "Field Operations", phone: record?.phone ?? "", startDate: record?.startDate ?? today, status: record?.status ?? "active" });
    } else if (resource === "attendance") {
      const record = item as AttendanceData | undefined;
      setForm({ employeeId: String(record?.employeeId ?? user.id), siteId: String(record?.siteId ?? data.sites[0]?.id ?? ""), date: record?.date ?? today, clockIn: timeInput(record?.clockIn ?? null) || "08:00", clockOut: timeInput(record?.clockOut ?? null), status: record?.status ?? "present", note: record?.note ?? "" });
    } else if (resource === "leaves") {
      const record = item as LeaveData | undefined;
      setForm({ employeeId: String(record?.employeeId ?? user.id), type: record?.type ?? "Vacation", startDate: record?.startDate ?? today, endDate: record?.endDate ?? dateWithOffset(1, now), reason: record?.reason ?? "", status: record?.status ?? "pending" });
    } else {
      const record = item as SiteData | undefined;
      setForm({ name: record?.name ?? "", code: record?.code ?? "", city: record?.city ?? "", address: record?.address ?? "", status: record?.status ?? "active" });
    }
  }

  function field(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function optimisticEdit(resource: Resource, id: number, payload: Record<string, unknown>) {
    setData((current) => {
      if (resource === "employees") return { ...current, employees: current.employees.map((person) => person.id === id ? { ...person, name: String(payload.name), phone: String(payload.phone ?? ""), ...(admin ? { email: String(payload.email), role: String(payload.role), jobTitle: String(payload.jobTitle), department: String(payload.department), status: String(payload.status), startDate: String(payload.startDate) } : {}) } : person) };
      if (resource === "sites") return { ...current, sites: current.sites.map((site) => site.id === id ? { ...site, name: String(payload.name), code: String(payload.code), city: String(payload.city), address: String(payload.address), status: String(payload.status) } : site) };
      if (resource === "leaves") return { ...current, leaves: current.leaves.map((leave) => leave.id === id ? { ...leave, employeeId: Number(payload.employeeId), type: String(payload.type), startDate: String(payload.startDate), endDate: String(payload.endDate), reason: String(payload.reason), status: String(payload.status) } : leave) };
      return { ...current, attendance: current.attendance.map((record) => record.id === id ? { ...record, employeeId: Number(payload.employeeId), siteId: Number(payload.siteId) || null, date: String(payload.date), clockIn: String(payload.clockIn), clockOut: payload.clockOut ? String(payload.clockOut) : null, status: String(payload.status), note: String(payload.note) } : record) };
    });
  }

  async function saveModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.mode === "delete") return;
    let payload: Record<string, unknown> = { ...form };
    if (modal.resource === "attendance") {
      const inDate = new Date(`${form.date}T${form.clockIn}:00`);
      const outDate = form.clockOut ? new Date(`${form.date}T${form.clockOut}:00`) : null;
      if (Number.isNaN(inDate.getTime()) || (outDate && Number.isNaN(outDate.getTime()))) { notify("Enter valid shift times.", "error"); return; }
      payload = { ...form, clockIn: inDate.toISOString(), clockOut: outDate?.toISOString() ?? "" };
    }
    const snapshot = data;
    const editing = modal.mode === "edit";
    if (editing && modal.item) optimisticEdit(modal.resource, modal.item.id, payload);
    setBusy(true);
    try {
      await requestMutation(modal.resource, editing ? "update" : "create", modal.item?.id, payload);
      await refreshData();
      setModal(null);
      notify(editing ? "Changes saved successfully." : `${resourceLabels[modal.resource].charAt(0).toUpperCase() + resourceLabels[modal.resource].slice(1)} added successfully.`);
    } catch (cause) {
      setData(snapshot);
      notify(cause instanceof Error ? cause.message : "Could not save changes.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecord() {
    if (!modal?.item) return;
    const { resource, item } = modal;
    const snapshot = data;
    setBusy(true);
    setData((current) => {
      if (resource === "employees") return { ...current, employees: current.employees.filter((row) => row.id !== item.id) };
      if (resource === "attendance") return { ...current, attendance: current.attendance.filter((row) => row.id !== item.id) };
      if (resource === "leaves") return { ...current, leaves: current.leaves.filter((row) => row.id !== item.id) };
      return { ...current, sites: current.sites.filter((row) => row.id !== item.id) };
    });
    try {
      await requestMutation(resource, "delete", item.id);
      await refreshData();
      setModal(null);
      notify("Record removed successfully.");
    } catch (cause) {
      setData(snapshot);
      notify(cause instanceof Error ? cause.message : "Could not remove record.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function reviewLeave(leave: LeaveData, status: "approved" | "rejected") {
    const snapshot = data;
    setData((current) => ({ ...current, leaves: current.leaves.map((row) => row.id === leave.id ? { ...row, status } : row) }));
    try {
      await requestMutation("leaves", "update", leave.id, { status });
      await refreshData();
      notify(status === "approved" ? "Time-off request approved." : "Time-off request declined.");
    } catch (cause) {
      setData(snapshot);
      notify(cause instanceof Error ? cause.message : "Could not review request.", "error");
    }
  }

  async function handleClock() {
    if (clockBusy || (myShift && myShift.clockOut)) return;
    const action = myShift ? "out" : "in";
    const snapshot = data;
    const timestamp = new Date().toISOString();
    setClockBusy(true);
    if (action === "in") {
      setData((current) => ({ ...current, attendance: [{ id: -Date.now(), employeeId: user.id, siteId: Number(selectedSite) || null, date: today, clockIn: timestamp, clockOut: null, status: "present", note: "", source: "clock", createdAt: timestamp }, ...current.attendance] }));
    } else {
      setData((current) => ({ ...current, attendance: current.attendance.map((record) => record.id === myShift?.id ? { ...record, clockOut: timestamp } : record) }));
    }
    try {
      const response = await fetch("/api/clock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, siteId: Number(selectedSite) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update shift.");
      await refreshData();
      notify(result.message || "Shift updated.");
    } catch (cause) {
      setData(snapshot);
      notify(cause instanceof Error ? cause.message : "Could not update shift.", "error");
    } finally {
      setClockBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  function exportCsv() {
    const header = ["Employee", "Date", "Clock in", "Clock out", "Hours", "Work site", "Status"];
    const rows = data.attendance.map((record) => {
      const person = data.employees.find((employee) => employee.id === record.employeeId);
      const site = data.sites.find((item) => item.id === record.siteId);
      return [person?.name ?? "Unknown", record.date, formatTime(record.clockIn), formatTime(record.clockOut), (minutesWorked(record, now) / 60).toFixed(2), site?.name ?? "—", record.status];
    });
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `wattpro-attendance-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Attendance report downloaded.");
  }

  const filteredAttendance = data.attendance.filter((record) => {
    const employee = data.employees.find((person) => person.id === record.employeeId);
    const site = data.sites.find((item) => item.id === record.siteId);
    const matchesSearch = !search || `${employee?.name ?? ""} ${site?.name ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesTab = attendanceFilter === "All records" || (attendanceFilter === "Today" && record.date === today) || (attendanceFilter === "This week" && record.date >= weekStartDate && record.date <= today);
    const matchesStatus = attendanceStatus === "All statuses" || (attendanceStatus === "Clocked in" && !record.clockOut && record.date === today) || (attendanceStatus === "Completed" && !!record.clockOut) || (attendanceStatus === "Late" && record.status === "late");
    return matchesSearch && matchesTab && matchesStatus && (!attendanceDate || record.date === attendanceDate);
  });
  const totalAttendancePages = Math.max(1, Math.ceil(filteredAttendance.length / 10));
  const currentAttendancePage = Math.min(attendancePage, totalAttendancePages);
  const visibleAttendance = filteredAttendance.slice((currentAttendancePage - 1) * 10, currentAttendancePage * 10);
  const filteredTeam = data.employees.filter((person) => `${person.name} ${person.email} ${person.jobTitle} ${person.department}`.toLowerCase().includes(search.toLowerCase()) && (teamFilter === "All departments" || person.department === teamFilter));
  const filteredLeaves = data.leaves.filter((leave) => {
    const employee = data.employees.find((person) => person.id === leave.employeeId);
    return `${employee?.name ?? ""} ${leave.type} ${leave.reason}`.toLowerCase().includes(search.toLowerCase()) && (leaveFilter === "All requests" || leave.status === leaveFilter.toLowerCase());
  });
  const filteredSites = data.sites.filter((site) => `${site.name} ${site.city} ${site.code}`.toLowerCase().includes(search.toLowerCase()));

  function renderOverview() {
    return <>
      <div className="page-heading overview-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> {formatFullDate(today)}</div><h1>{greeting}, {firstName}<span className="greeting-sun">✳</span></h1><p>Here&apos;s what&apos;s happening with your team today.</p></div>
        <div className="heading-actions"><button className="button button-outline" onClick={exportCsv}><Download size={17} /> Export report</button>{admin && <button className="button button-primary" onClick={() => openModal("attendance", "create")}><Plus size={18} /> Add record</button>}</div>
      </div>

      <div className="kpi-grid">
        <KpiCard icon={UsersRound} label="Present today" value={String(todayRecords.length).padStart(2, "0")} suffix={` / ${String(activeEmployeeCount).padStart(2, "0")}`} note="Team members checked in" tone="mint" />
        <KpiCard icon={Activity} label="Currently on site" value={String(activeRecords.length).padStart(2, "0")} note="Working across your sites" tone="yellow" />
        <KpiCard icon={Timer} label="Hours this week" value={`${Math.round(weekMinutes / 60)}h`} note="Tracked across the team" tone="blue" />
        <KpiCard icon={CalendarCheck2} label="Pending requests" value={String(pendingLeaves.length).padStart(2, "0")} note="Waiting for your review" tone="peach" />
      </div>

      <div className="feature-grid">
        <div className="clock-card">
          <div className="clock-card-glow" /><div className="clock-card-top"><span className="clock-card-kicker"><span className="live-pulse" /> YOUR WORKDAY</span><span className="clock-card-badge"><Sun size={14} /> Make today count</span></div>
          <div className="clock-card-main"><p>{myShift?.clockOut ? "Nice work today, your shift is complete." : myShift ? "You're on the clock. Keep it up!" : "Ready to get started?"}</p><div className="live-time">{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}<span>{now.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).split(" ")[1]}</span></div><div className="clock-date"><Clock3 size={15} /> {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} <span>·</span> Local time</div></div>
          <div className="clock-card-bottom"><div className="clock-controls"><button className="clock-button" onClick={() => void handleClock()} disabled={clockBusy || !!myShift?.clockOut}>{clockBusy ? <LoaderCircle className="spin" size={18} /> : myShift?.clockOut ? <Check size={18} /> : myShift ? <LogOut size={18} /> : <ArrowUpRight size={19} />}{myShift?.clockOut ? "Shift completed" : myShift ? "Clock out now" : "Clock in now"}</button>{!myShift && <select className="clock-site-select" aria-label="Choose work site" value={selectedSite} onChange={(event) => setSelectedSite(event.target.value)}>{data.sites.filter((site) => site.status === "active").map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>}</div><div className="clock-summary">{myShift ? <><span className="clock-summary-label">TODAY&apos;S SHIFT</span><strong>{formatTime(myShift.clockIn)} {myShift.clockOut ? `– ${formatTime(myShift.clockOut)}` : "– In progress"}</strong></> : <><span className="clock-summary-label">A FRESH START</span><strong>Your time starts with one click.</strong></>}</div></div>
        </div>
        <div className="weekly-card">
          <div className="weekly-header"><div><div className="card-kicker">TEAM PERFORMANCE</div><h3>Weekly hours</h3></div><span className="weekly-header-icon"><ArrowUpRight size={18} /></span></div>
          <div className="weekly-total">{Math.floor(weekMinutes / 60)}<span>h</span> <small>{String(weekMinutes % 60).padStart(2, "0")}m</small></div><p className="weekly-subtitle">Total time logged this week <span className="weekly-dot">•</span> {activeEmployeeCount} team members</p>
          <div className="chart-area"><div className="chart-guide chart-guide-top" /><div className="chart-guide chart-guide-middle" /><div className="chart-guide chart-guide-bottom" />{weekDays.map((day, index) => <div className="chart-column" key={day}><div className="chart-bar-track"><div className={`chart-bar ${day === today ? "chart-bar-today" : ""} ${day > today ? "chart-bar-future" : ""}`} style={{ height: `${day > today ? 0 : Math.max(dailyMinutes[index] ? 7 : 0, dailyMinutes[index] / maxDailyMinutes * 100)}%` }} /></div><span className={day === today ? "chart-day-active" : ""}>{["M", "T", "W", "T", "F", "S", "S"][index]}</span></div>)}</div>
          <div className="weekly-footer"><span><span className="legend-dot" /> Hours logged</span><span>This week <ChevronDown size={14} /></span></div>
        </div>
      </div>

      <div className="overview-bottom-grid">
        <section className="panel today-panel"><div className="panel-heading"><div><div className="card-kicker">LIVE ACTIVITY</div><h2>Who&apos;s in today <span className="title-count">{todayRecords.length}</span></h2><p>See how your team&apos;s day is shaping up.</p></div><button className="text-link" onClick={() => navigate("attendance")}>View all <ArrowRight size={16} /></button></div>
          {todayRecords.length ? <div className="today-list">{todayRecords.slice(0, 5).map((record) => { const person = data.employees.find((employee) => employee.id === record.employeeId); const site = data.sites.find((item) => item.id === record.siteId); return <div className="today-row" key={record.id}><div className="person-cell"><Avatar name={person?.name ?? "Unknown"} id={record.employeeId} /><div><strong>{person?.name ?? "Unknown"}</strong><span>{person?.jobTitle ?? "Team member"}</span></div></div><span className="today-location"><MapPin size={14} /> {site?.name ?? "No site"}</span><span className="today-time">{formatTime(record.clockIn)}</span><StatusBadge status={record.clockOut ? "completed" : record.status === "late" ? "late" : "active"} label={record.clockOut ? "Clocked out" : record.status === "late" ? "Late" : "On the clock"} /></div>; })}</div> : <EmptyState icon={Clock3} title="No one has clocked in yet" description="Your team's shifts will appear here as they start." />}
        </section>
        <section className="panel requests-panel"><div className="panel-heading"><div><div className="card-kicker">NEEDS YOUR ATTENTION</div><h2>Time-off requests</h2><p>{pendingLeaves.length} awaiting review</p></div><span className="request-heading-icon"><CalendarDays size={20} /></span></div><div className="request-list">{pendingLeaves.slice(0, 3).map((leave) => { const person = data.employees.find((employee) => employee.id === leave.employeeId); return <div className="request-item" key={leave.id}><Avatar name={person?.name ?? "Unknown"} id={leave.employeeId} size="sm" /><div><strong>{person?.name ?? "Unknown"}</strong><span>{leave.type} <i>·</i> {formatDate(leave.startDate)}–{formatDate(leave.endDate)}</span></div><ArrowUpRight size={16} /></div>; })}{!pendingLeaves.length && <div className="request-empty"><CheckCircle2 size={24} /><strong>All caught up!</strong><span>No requests need your attention.</span></div>}</div><button className="request-footer-link" onClick={() => navigate("time-off")}>Manage requests <ArrowRight size={16} /></button></section>
      </div>
    </>;
  }

  function renderAttendance() {
    return <>
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> TIME & ATTENDANCE</div><h1>Attendance</h1><p>Every hour accounted for, all in one place.</p></div><div className="heading-actions"><button className="button button-outline" onClick={exportCsv}><Download size={17} /> Export CSV</button>{admin && <button className="button button-primary" onClick={() => openModal("attendance", "create")}><Plus size={18} /> Add record</button>}</div></div>
      <div className="summary-grid"><div className="summary-card"><span className="summary-icon summary-green"><UsersRound size={20} /></span><div><span>Present today</span><strong>{todayRecords.length}<small> / {activeEmployeeCount}</small></strong></div></div><div className="summary-card"><span className="summary-icon summary-yellow"><Clock3 size={20} /></span><div><span>On the clock</span><strong>{activeRecords.length}</strong></div></div><div className="summary-card"><span className="summary-icon summary-purple"><Timer size={20} /></span><div><span>Hours this week</span><strong>{Math.floor(weekMinutes / 60)}<small>h {String(weekMinutes % 60).padStart(2, "0")}m</small></strong></div></div></div>
      <section className="panel data-panel"><div className="data-panel-top"><div><h2>Attendance log</h2><p>A complete view of your team&apos;s time records.</p></div><span className="record-count">{filteredAttendance.length} records</span></div><div className="data-toolbar"><div className="tab-list">{["All records", "Today", "This week"].map((tab) => <button key={tab} className={attendanceFilter === tab ? "tab active" : "tab"} onClick={() => { setAttendanceFilter(tab); setAttendancePage(1); }}>{tab}</button>)}</div><div className="toolbar-filters"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setAttendancePage(1); }} placeholder="Search records..." aria-label="Search attendance" /></div><select className="filter-select" value={attendanceStatus} onChange={(event) => { setAttendanceStatus(event.target.value); setAttendancePage(1); }} aria-label="Filter status"><option>All statuses</option><option>Clocked in</option><option>Completed</option><option>Late</option></select><input className="date-filter" type="date" value={attendanceDate} onChange={(event) => { setAttendanceDate(event.target.value); setAttendancePage(1); }} aria-label="Filter by date" /></div></div>
        {filteredAttendance.length ? <><div className="table-scroll"><table className="data-table"><thead><tr><th>TEAM MEMBER</th><th>DATE</th><th>CLOCK IN</th><th>CLOCK OUT</th><th>TOTAL HOURS</th><th>WORK SITE</th><th>STATUS</th>{admin && <th className="actions-th">ACTIONS</th>}</tr></thead><tbody>{visibleAttendance.map((record) => { const person = data.employees.find((employee) => employee.id === record.employeeId); const site = data.sites.find((item) => item.id === record.siteId); return <tr key={record.id}><td><div className="person-cell"><Avatar name={person?.name ?? "Unknown"} id={record.employeeId} size="sm" /><div><strong>{person?.name ?? "Unknown"}</strong><span>{person?.jobTitle ?? "Team member"}</span></div></div></td><td className="table-medium">{formatDate(record.date, true)}</td><td className="table-medium">{formatTime(record.clockIn)}</td><td className="table-medium">{formatTime(record.clockOut)}</td><td className="table-strong">{record.clockOut ? formatDuration(minutesWorked(record, now)) : <span className="table-muted">In progress</span>}</td><td><span className="site-table-cell"><MapPin size={14} />{site?.name ?? "No site"}</span></td><td><StatusBadge status={record.clockOut ? "completed" : record.status === "late" ? "late" : "active"} label={record.clockOut ? "Completed" : record.status === "late" ? "Late" : "Clocked in"} /></td>{admin && <td><div className="row-actions"><button title="Edit record" aria-label="Edit record" onClick={() => openModal("attendance", "edit", record)}><Pencil size={15} /></button><button title="Delete record" aria-label="Delete record" className="danger-icon" onClick={() => openModal("attendance", "delete", record)}><Trash2 size={15} /></button></div></td>}</tr>; })}</tbody></table></div><div className="table-footer"><span>Showing <strong>{(currentAttendancePage - 1) * 10 + 1}–{Math.min(currentAttendancePage * 10, filteredAttendance.length)}</strong> of <strong>{filteredAttendance.length}</strong> records</span><div className="pagination"><button aria-label="Previous page" disabled={currentAttendancePage === 1} onClick={() => setAttendancePage((page) => page - 1)}><ChevronLeft size={17} /></button><span>{currentAttendancePage} / {totalAttendancePages}</span><button aria-label="Next page" disabled={currentAttendancePage >= totalAttendancePages} onClick={() => setAttendancePage((page) => page + 1)}><ChevronRight size={17} /></button></div></div></> : <EmptyState icon={Clock3} title="No attendance records found" description="Try a different search or filter, or add a new record to get started." action={admin ? "Add record" : undefined} onAction={() => openModal("attendance", "create")} />}
      </section>
    </>;
  }

  function renderTeam() {
    return <>
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> OUR PEOPLE</div><h1>Team members</h1><p>Meet the people bringing clean energy to life.</p></div>{admin && <button className="button button-primary" onClick={() => openModal("employees", "create")}><Plus size={18} /> Add member</button>}</div>
      <div className="team-topline"><div className="team-overlap">{data.employees.slice(0, 5).map((person) => <Avatar key={person.id} name={person.name} id={person.id} size="sm" />)}</div><span><strong>{activeEmployeeCount} active members</strong> across {allDepartments.length} departments</span><span className="team-topline-divider" /><span className="team-topline-green"><span className="live-pulse" /> {activeRecords.length} working right now</span></div>
      <div className="section-controls"><div className="section-title"><h2>All team members</h2><span className="record-count">{filteredTeam.length} people</span></div><div className="toolbar-filters"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team..." aria-label="Search team" /></div><select className="filter-select" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} aria-label="Filter department"><option>All departments</option>{allDepartments.map((department) => <option key={department}>{department}</option>)}</select></div></div>
      {filteredTeam.length ? <div className="team-grid">{filteredTeam.map((person) => <div className="member-card" key={person.id}><div className="member-card-top"><Avatar name={person.name} id={person.id} size="lg" /><div className="member-card-actions">{admin && <><button title="Edit team member" aria-label={`Edit ${person.name}`} onClick={() => openModal("employees", "edit", person)}><Pencil size={16} /></button>{person.id !== user.id && <button title="Remove team member" aria-label={`Remove ${person.name}`} onClick={() => openModal("employees", "delete", person)}><MoreHorizontal size={20} /></button>}</>}</div></div><div className="member-status"><StatusBadge status={person.status} />{person.role === "admin" && <span className="admin-tag">ADMIN</span>}</div><h3>{person.name}</h3><p>{person.jobTitle}</p><div className="member-meta"><span><Building2 size={15} />{person.department}</span><span><CalendarDays size={15} />Joined {formatDate(person.startDate, true)}</span></div><div className="member-card-footer"><span className="member-email" title={person.email}>{person.email}</span><button aria-label={`Edit ${person.name}`} onClick={() => openModal("employees", "edit", person)} disabled={!admin && person.id !== user.id}><ArrowUpRight size={17} /></button></div></div>)}</div> : <div className="panel"><EmptyState icon={UsersRound} title="No team members found" description="Try a different search or department filter." action={admin ? "Add member" : undefined} onAction={() => openModal("employees", "create")} /></div>}
    </>;
  }

  function renderTimeOff() {
    const approved = data.leaves.filter((leave) => leave.status === "approved").length;
    const requestTabs = ["All requests", "Pending", "Approved", "Rejected"];
    return <>
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> TIME TO RECHARGE</div><h1>Time off</h1><p>Keep plans clear and your team supported.</p></div><button className="button button-primary" onClick={() => openModal("leaves", "create")}><Plus size={18} /> New request</button></div>
      <div className="summary-grid"><div className="summary-card"><span className="summary-icon summary-yellow"><Clock3 size={20} /></span><div><span>Pending review</span><strong>{pendingLeaves.length}</strong></div></div><div className="summary-card"><span className="summary-icon summary-green"><CheckCircle2 size={20} /></span><div><span>Approved requests</span><strong>{approved}</strong></div></div><div className="summary-card"><span className="summary-icon summary-purple"><CalendarDays size={20} /></span><div><span>Total requests</span><strong>{data.leaves.length}</strong></div></div></div>
      <section className="panel data-panel leave-panel"><div className="data-panel-top"><div><h2>Leave requests</h2><p>Review and manage upcoming time away.</p></div><span className="record-count">{filteredLeaves.length} requests</span></div><div className="data-toolbar"><div className="tab-list">{requestTabs.map((tab) => <button key={tab} className={leaveFilter === tab ? "tab active" : "tab"} onClick={() => setLeaveFilter(tab)}>{tab}{tab === "Pending" && pendingLeaves.length > 0 && <span className="tab-count">{pendingLeaves.length}</span>}</button>)}</div><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests..." aria-label="Search requests" /></div></div>
      {filteredLeaves.length ? <div className="leave-list">{filteredLeaves.map((leave) => { const person = data.employees.find((employee) => employee.id === leave.employeeId); return <div className="leave-row" key={leave.id}><div className="leave-person"><Avatar name={person?.name ?? "Unknown"} id={leave.employeeId} /><div><strong>{person?.name ?? "Unknown"}</strong><span>{person?.department ?? "Team member"}</span></div></div><div className="leave-type"><span className={`leave-type-icon leave-${leave.type.toLowerCase().replace(/\s+/g, "-")}`}><CalendarDays size={18} /></span><div><strong>{leave.type}</strong><span>{leave.reason || "No reason added"}</span></div></div><div className="leave-dates"><strong>{formatDate(leave.startDate)} – {formatDate(leave.endDate, true)}</strong><span>{leave.days} {leave.days === 1 ? "day" : "days"}</span></div><StatusBadge status={leave.status} /><div className="leave-actions">{admin && leave.status === "pending" && <><button className="review-button review-approve" title="Approve" aria-label={`Approve ${person?.name}'s request`} onClick={() => void reviewLeave(leave, "approved")}><Check size={17} /></button><button className="review-button review-reject" title="Decline" aria-label={`Decline ${person?.name}'s request`} onClick={() => void reviewLeave(leave, "rejected")}><X size={17} /></button></>}{(admin || (leave.employeeId === user.id && leave.status === "pending")) && <><button className="review-button review-neutral" title="Edit request" aria-label="Edit request" onClick={() => openModal("leaves", "edit", leave)}><Pencil size={15} /></button><button className="review-button review-neutral" title="Delete request" aria-label="Delete request" onClick={() => openModal("leaves", "delete", leave)}><Trash2 size={15} /></button></>}</div></div>; })}</div> : <EmptyState icon={CalendarDays} title="No requests to show" description="Requests matching your search and filters will appear here." action="New request" onAction={() => openModal("leaves", "create")} />}</section>
    </>;
  }

  function renderSites() {
    return <>
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> WHERE WE WORK</div><h1>Work sites</h1><p>Every project, every location, connected.</p></div>{admin && <button className="button button-primary" onClick={() => openModal("sites", "create")}><Plus size={18} /> Add work site</button>}</div>
      <div className="sites-banner"><div className="sites-banner-icon"><Sun size={27} /></div><div><span>POWERING PROGRESS TOGETHER</span><h2>{activeSiteCount} active work sites. One bright mission.</h2><p>Keep your team connected to every project in the field.</p></div><div className="sites-banner-art"><span /><span /><span /></div></div>
      <div className="section-controls"><div className="section-title"><h2>All locations</h2><span className="record-count">{filteredSites.length} sites</span></div><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search work sites..." aria-label="Search work sites" /></div></div>
      {filteredSites.length ? <div className="sites-grid">{filteredSites.map((site, index) => { const onSite = todayRecords.filter((record) => record.siteId === site.id && !record.clockOut); const people = onSite.map((record) => data.employees.find((person) => person.id === record.employeeId)).filter((person): person is EmployeeData => !!person); return <div className="site-card" key={site.id}><div className={`site-card-banner site-banner-${index % 4}`}><div className="site-banner-sun"><Sun size={27} /></div><span className="site-card-code">{site.code}</span></div><div className="site-card-body"><div className="site-title-row"><div><StatusBadge status={site.status} /><h3>{site.name}</h3></div>{admin && <div className="row-actions"><button title="Edit site" aria-label={`Edit ${site.name}`} onClick={() => openModal("sites", "edit", site)}><Pencil size={16} /></button><button title="Delete site" aria-label={`Delete ${site.name}`} className="danger-icon" onClick={() => openModal("sites", "delete", site)}><Trash2 size={16} /></button></div>}</div><p className="site-address"><MapPin size={16} /> {site.address ? `${site.address}, ` : ""}{site.city}</p><div className="site-card-divider" /><div className="site-card-bottom"><div className="site-avatars">{people.slice(0, 4).map((person) => <Avatar key={person.id} id={person.id} name={person.name} size="sm" />)}{people.length === 0 && <span className="no-site-avatars"><UsersRound size={17} /></span>}</div><div><strong>{onSite.length} on site today</strong><span>Team members clocked in</span></div><ArrowUpRight size={18} className="site-bottom-arrow" /></div></div></div>; })}</div> : <div className="panel"><EmptyState icon={MapPin} title="No work sites found" description="Try a different search, or add your first work site." action={admin ? "Add work site" : undefined} onAction={() => openModal("sites", "create")} /></div>}
    </>;
  }

  function renderSettings() {
    return <>
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR WORKSPACE</div><h1>Settings</h1><p>Manage your account and workspace details.</p></div></div>
      <div className="settings-grid"><section className="panel settings-card"><div className="settings-card-heading"><h2>Your profile</h2><p>The details your team sees in Wattpro.</p></div><div className="settings-profile"><Avatar name={myName} id={user.id} size="lg" /><div><strong>{myName}</strong><span>{myProfile?.jobTitle ?? user.jobTitle}</span></div><StatusBadge status={myProfile?.status ?? "active"} /></div><div className="settings-details"><div><span>WORK EMAIL</span><strong>{myProfile?.email ?? user.email}</strong></div><div><span>DEPARTMENT</span><strong>{myProfile?.department ?? user.department}</strong></div><div><span>PHONE NUMBER</span><strong>{myProfile?.phone || "Not added yet"}</strong></div><div><span>MEMBER SINCE</span><strong>{myProfile ? formatDate(myProfile.startDate, true) : "—"}</strong></div></div><button className="button button-outline" onClick={() => myProfile && openModal("employees", "edit", myProfile)}><Pencil size={16} /> Edit profile</button></section><div className="settings-side"><section className="panel settings-small-card"><span className="settings-feature-icon"><ShieldCheck size={22} /></span><h3>Account security</h3><p>Keep your account safe. You can update your password from your profile settings.</p><button className="text-link" onClick={() => myProfile && openModal("employees", "edit", myProfile)}>Update password <ArrowRight size={16} /></button></section><section className="panel settings-small-card settings-brand-card"><span className="settings-feature-icon"><Sun size={22} /></span><h3>Made for brighter days.</h3><p>Wattpro brings your people, places, and workdays together to power what&apos;s next.</p><span className="settings-brand-caption">WATTPRO SOLAR · WORKFORCE PLATFORM</span></section><button className="button button-logout" onClick={() => void signOut()}><LogOut size={17} /> Sign out of workspace</button></div></div>
    </>;
  }

  function modalItemName() {
    if (!modal?.item) return "this record";
    if (modal.resource === "attendance") { const record = modal.item as AttendanceData; return `${data.employees.find((person) => person.id === record.employeeId)?.name ?? "this member"}'s attendance on ${formatDate(record.date)}`; }
    if (modal.resource === "leaves") return `this ${(modal.item as LeaveData).type.toLowerCase()} request`;
    return (modal.item as EmployeeData | SiteData).name;
  }

  function renderModal() {
    if (!modal) return null;
    const title = modal.mode === "delete" ? `Delete ${resourceLabels[modal.resource]}?` : `${modal.mode === "create" ? "Add" : "Edit"} ${resourceLabels[modal.resource]}`;
    return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setModal(null); }}><div className="modal-dialog" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><div><span className="modal-eyebrow">WATTPRO WORKSPACE</span><h2>{title}</h2><p>{modal.mode === "delete" ? "This action cannot be undone." : modal.mode === "create" ? "Fill in the details below to get started." : "Update the details below and save your changes."}</p></div><button className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog" disabled={busy}><X size={20} /></button></div>
      {modal.mode === "delete" ? <div className="delete-content"><span className="delete-icon"><Trash2 size={24} /></span><p>Are you sure you want to remove <strong>{modalItemName()}</strong>? Related information may also be affected.</p><div className="modal-actions"><button className="button button-outline" onClick={() => setModal(null)} disabled={busy}>Cancel</button><button className="button button-danger" onClick={() => void deleteRecord()} disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <Trash2 size={17} />} Delete record</button></div></div> : <form onSubmit={(event) => void saveModal(event)}><div className="modal-form-grid">
        {modal.resource === "employees" && <><FormField label="Full name"><input className="form-control" value={form.name ?? ""} onChange={(event) => field("name", event.target.value)} placeholder="e.g. Jordan Lee" required /></FormField>{admin && <FormField label="Work email"><input className="form-control" type="email" value={form.email ?? ""} onChange={(event) => field("email", event.target.value)} placeholder="jordan@wattpro.solar" required /></FormField>}{admin && <><FormField label="Job title"><input className="form-control" value={form.jobTitle ?? ""} onChange={(event) => field("jobTitle", event.target.value)} placeholder="e.g. Solar Technician" required /></FormField><FormField label="Department"><select className="form-control" value={form.department ?? ""} onChange={(event) => field("department", event.target.value)}>{["Field Operations", "Operations", "Projects", "Engineering", "Customer Success", "Sales", "Administration"].map((department) => <option key={department}>{department}</option>)}</select></FormField></>}<FormField label="Phone number"><input className="form-control" type="tel" value={form.phone ?? ""} onChange={(event) => field("phone", event.target.value)} placeholder="+1 (602) 555-0100" /></FormField>{admin && <><FormField label="Start date"><input className="form-control" type="date" value={form.startDate ?? ""} onChange={(event) => field("startDate", event.target.value)} required /></FormField><FormField label="Access role"><select className="form-control" value={form.role ?? "employee"} onChange={(event) => field("role", event.target.value)}><option value="employee">Employee</option><option value="admin">Admin</option></select></FormField><FormField label="Status"><select className="form-control" value={form.status ?? "active"} onChange={(event) => field("status", event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></FormField></>}<FormField label={modal.mode === "create" ? "Temporary password" : "New password (optional)"} wide hint={modal.mode === "create" ? "At least 8 characters. Share this securely with the new member." : "Leave blank to keep the current password."}><input className="form-control" type="password" value={form.password ?? ""} onChange={(event) => field("password", event.target.value)} placeholder={modal.mode === "create" ? "Minimum 8 characters" : "Leave blank to keep current"} required={modal.mode === "create"} minLength={modal.mode === "create" ? 8 : undefined} /></FormField></>}
        {modal.resource === "attendance" && <><FormField label="Team member"><select className="form-control" value={form.employeeId ?? ""} onChange={(event) => field("employeeId", event.target.value)}>{data.employees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></FormField><FormField label="Work site"><select className="form-control" value={form.siteId ?? ""} onChange={(event) => field("siteId", event.target.value)}><option value="">No site</option>{data.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></FormField><FormField label="Date"><input className="form-control" type="date" value={form.date ?? ""} onChange={(event) => field("date", event.target.value)} required /></FormField><FormField label="Status"><select className="form-control" value={form.status ?? "present"} onChange={(event) => field("status", event.target.value)}><option value="present">Present</option><option value="late">Late</option></select></FormField><FormField label="Clock in"><input className="form-control" type="time" value={form.clockIn ?? ""} onChange={(event) => field("clockIn", event.target.value)} required /></FormField><FormField label="Clock out"><input className="form-control" type="time" value={form.clockOut ?? ""} onChange={(event) => field("clockOut", event.target.value)} /></FormField><FormField label="Notes (optional)" wide><textarea className="form-control form-textarea" value={form.note ?? ""} onChange={(event) => field("note", event.target.value)} placeholder="Add context for this shift..." rows={3} /></FormField></>}
        {modal.resource === "leaves" && <>{admin && <FormField label="Team member"><select className="form-control" value={form.employeeId ?? ""} onChange={(event) => field("employeeId", event.target.value)}>{data.employees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></FormField>}<FormField label="Leave type"><select className="form-control" value={form.type ?? "Vacation"} onChange={(event) => field("type", event.target.value)}><option>Vacation</option><option>Sick leave</option><option>Personal</option><option>Other</option></select></FormField><FormField label="Start date"><input className="form-control" type="date" value={form.startDate ?? ""} onChange={(event) => field("startDate", event.target.value)} required /></FormField><FormField label="End date"><input className="form-control" type="date" value={form.endDate ?? ""} min={form.startDate} onChange={(event) => field("endDate", event.target.value)} required /></FormField>{admin && <FormField label="Status"><select className="form-control" value={form.status ?? "pending"} onChange={(event) => field("status", event.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></FormField>}<FormField label="Reason (optional)" wide><textarea className="form-control form-textarea" value={form.reason ?? ""} onChange={(event) => field("reason", event.target.value)} placeholder="Tell us a little about your request..." rows={3} /></FormField></>}
        {modal.resource === "sites" && <><FormField label="Site name" wide><input className="form-control" value={form.name ?? ""} onChange={(event) => field("name", event.target.value)} placeholder="e.g. East Valley Solar Farm" required /></FormField><FormField label="Project code"><input className="form-control" value={form.code ?? ""} onChange={(event) => field("code", event.target.value)} placeholder="e.g. WP-6321" required /></FormField><FormField label="City & state"><input className="form-control" value={form.city ?? ""} onChange={(event) => field("city", event.target.value)} placeholder="e.g. Phoenix, AZ" required /></FormField><FormField label="Street address" wide><input className="form-control" value={form.address ?? ""} onChange={(event) => field("address", event.target.value)} placeholder="Street address (optional)" /></FormField><FormField label="Status"><select className="form-control" value={form.status ?? "active"} onChange={(event) => field("status", event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></FormField></>}
      </div><div className="modal-actions"><button className="button button-outline" type="button" onClick={() => setModal(null)} disabled={busy}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}{modal.mode === "create" ? "Create" : "Save changes"}</button></div></form>}
    </div></div>;
  }

  return <div className="app-shell">
    {mobileMenu && <button className="mobile-backdrop" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}><div className="sidebar-inner"><div className="brand"><Image src="/images/wattpro-logo-blue.png" alt="WattPro Solar Energy Pvt. Ltd." className="brand-logo" width={190} height={62} priority /></div><div className="sidebar-nav"><div className="nav-group"><span className="nav-caption">WORKSPACE</span>{navTop.map(({ view: itemView, label, icon: Icon }) => <button key={itemView} className={`nav-item ${view === itemView ? "nav-active" : ""}`} onClick={() => navigate(itemView)}><Icon size={19} strokeWidth={view === itemView ? 2.15 : 1.9} /><span>{label}</span>{view === itemView && <span className="nav-active-dot" />}</button>)}</div><div className="nav-group nav-group-secondary"><span className="nav-caption">MANAGE</span>{navBottom.map(({ view: itemView, label, icon: Icon }) => <button key={itemView} className={`nav-item ${view === itemView ? "nav-active" : ""}`} onClick={() => navigate(itemView)}><Icon size={19} strokeWidth={view === itemView ? 2.15 : 1.9} /><span>{label}</span>{itemView === "time-off" && pendingLeaves.length > 0 && <span className="nav-count">{pendingLeaves.length}</span>}{view === itemView && <span className="nav-active-dot" />}</button>)}</div></div><div className="sidebar-bottom"><div className="sidebar-promo"><span className="promo-sun"><Sun size={20} /></span><div className="promo-rays" /><strong>Brighter days<br />start here.</strong><p>Good energy. Great work. Every single day.</p><button onClick={() => navigate("attendance")}>View attendance <ArrowUpRight size={15} /></button></div><button className={`nav-item settings-nav ${view === "settings" ? "nav-active" : ""}`} onClick={() => navigate("settings")}><Settings2 size={19} /><span>Settings</span></button><div className="sidebar-profile"><Avatar name={myName} id={user.id} size="sm" /><button className="profile-info" onClick={() => navigate("settings")}><strong>{myName}</strong><span>{myProfile?.jobTitle ?? user.jobTitle}</span></button><button className="profile-logout" title="Sign out" aria-label="Sign out" onClick={() => void signOut()}><LogOut size={17} /></button></div></div></div></aside>
    <div className="workspace"><header className="topbar"><div className="topbar-left"><button className="mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={22} /></button><span className="breadcrumb-home">Workspace</span><ChevronRight size={15} className="breadcrumb-chevron" /><strong>{viewLabels[view]}</strong>{refreshing && <LoaderCircle size={15} className="spin refresh-icon" />}</div><div className="topbar-right"><span className="topbar-date"><CalendarDays size={16} />{now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span><div className="notifications-wrap"><button className="topbar-icon-button notification-button" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={20} />{pendingLeaves.length > 0 && <span className="notification-dot" />}</button>{notificationsOpen && <div className="notifications-popover"><div className="notifications-title"><strong>Notifications</strong><span>{pendingLeaves.length} new</span></div>{pendingLeaves.length ? pendingLeaves.slice(0, 3).map((leave) => { const person = data.employees.find((employee) => employee.id === leave.employeeId); return <button className="notification-item" key={leave.id} onClick={() => navigate("time-off")}><span className="notification-symbol"><CalendarDays size={17} /></span><span><strong>{person?.name ?? "A team member"} requested time off</strong><small>{leave.type} · {formatDate(leave.startDate)}</small></span></button>; }) : <div className="notification-empty">You&apos;re all caught up.</div>}<button className="notification-view" onClick={() => navigate("time-off")}>View all requests <ArrowRight size={15} /></button></div>}</div><span className="topbar-separator" /><button className="topbar-avatar" onClick={() => navigate("settings")} aria-label="Open settings"><Avatar name={myName} id={user.id} size="sm" /><ChevronDown size={14} /></button></div></header><main className="main-content">{view === "overview" ? renderOverview() : view === "attendance" ? renderAttendance() : view === "team" ? renderTeam() : view === "time-off" ? renderTimeOff() : view === "sites" ? renderSites() : renderSettings()}<footer className="workspace-footer"><span>© {now.getFullYear()} Wattpro Solar</span><span>Made for brighter days <Sun size={14} /></span></footer></main></div>
    {renderModal()}
    {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.type === "success" ? <CheckCircle2 size={19} /> : <XCircle size={19} />}<span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button></div>}
  </div>;
}
