import { getCurrentUser } from "@/lib/auth";
import { getAppData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const data = await getAppData(user);
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
