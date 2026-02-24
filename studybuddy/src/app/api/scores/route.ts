import { insforgeServer } from "@/lib/insforge-server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get("topic");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

  try {
    let query = insforgeServer.database
      .from("quiz_scores")
      .select("*")
      .order("score", { ascending: false })
      .limit(limit);

    if (topic && topic !== "all") {
      query = query.eq("topic", topic);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fetch scores error:", JSON.stringify(error, null, 2));
      console.error("Error message:", error.message);
      return Response.json(
        { error: error.message || "Failed to fetch scores" },
        { status: 500 }
      );
    }

    return Response.json({ data: data || [] });
  } catch (err) {
    console.error("Scores exception:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
