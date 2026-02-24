import { insforgeServer } from "@/lib/insforge-server";
import { NextRequest } from "next/server";

// GET /api/rooms?code=ABC123 — fetch room by code
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return Response.json({ error: "Room code is required" }, { status: 400 });
  }

  const { data, error } = await insforgeServer.database
    .from("quiz_rooms")
    .select("*")
    .eq("room_code", code);

  if (error) {
    return Response.json({ error: "Failed to fetch room" }, { status: 500 });
  }

  return Response.json({ data });
}

// POST /api/rooms — create a new room
export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await insforgeServer.database
    .from("quiz_rooms")
    .insert(body);

  if (error) {
    console.error("Create room error:", error);
    return Response.json({ error: "Failed to create room" }, { status: 500 });
  }

  return Response.json({ data });
}

// PATCH /api/rooms — update a room
export async function PATCH(request: Request) {
  const { room_code, ...updates } = await request.json();

  if (!room_code) {
    return Response.json({ error: "Room code is required" }, { status: 400 });
  }

  const { data, error } = await insforgeServer.database
    .from("quiz_rooms")
    .update(updates)
    .eq("room_code", room_code);

  if (error) {
    console.error("Update room error:", error);
    return Response.json({ error: "Failed to update room" }, { status: 500 });
  }

  return Response.json({ data });
}
