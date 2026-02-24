import { insforgeServer } from "@/lib/insforge-server";

export async function POST(request: Request) {
  const body = await request.json();
  const { user_id, user_name, topic, score, total } = body;

  if (!user_id || !topic || score === undefined) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { data, error } = await insforgeServer.database
      .from("quiz_scores")
      .insert({
        user_id,
        user_name,
        topic,
        score,
        total: total || 10,
      });

    if (error) {
      console.error("Save score error:", JSON.stringify(error, null, 2));
      return Response.json(
        { error: error.message || "Failed to save score" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, data });
  } catch (err) {
    console.error("Save score exception:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
