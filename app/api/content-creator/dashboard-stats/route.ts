import { NextRequest, NextResponse } from "next/server";
import { getContentCreatorDashboardData } from "@/lib/contentCreatorStats";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 });
    }

    const data = await getContentCreatorDashboardData(userId, userEmail);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("Failed to load content creator dashboard stats:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
