import { redirect } from "next/navigation";
import DashboardApp from "@/components/dashboard-app";
import { getCurrentUser } from "@/lib/auth";
import { getAppData } from "@/lib/data";
import type { View } from "@/lib/types";

export const dynamic = "force-dynamic";

const allowedViews: View[] = ["overview", "attendance", "team", "time-off", "sites", "settings"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const initialView = allowedViews.includes(params.view as View) ? (params.view as View) : "overview";
  const data = await getAppData(user);

  return <DashboardApp initialData={data} user={user} initialView={initialView} />;
}
