"use client";

import { useState } from "react";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RoomJoiner() {
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!user || !code.trim()) return;
    setError("");
    setJoining(true);

    try {
      // Find room via API
      const res = await fetch(`/api/rooms?code=${code.toUpperCase()}`);
      const { data: rooms } = await res.json();

      if (!rooms || rooms.length === 0) {
        setError("Room not found. Check the code and try again.");
        setJoining(false);
        return;
      }

      const room = rooms[0];

      if (room.guest_id) {
        setError("Room is already full.");
        setJoining(false);
        return;
      }

      // Join room via API
      const updateRes = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_code: code.toUpperCase(),
          guest_id: user.id,
          guest_name: user.name || user.email,
        }),
      });

      if (!updateRes.ok) throw new Error("Failed to join room");

      router.push(`/multiplayer/${code.toUpperCase()}`);
    } catch (err) {
      console.error("Failed to join room:", err);
      setError("Failed to join room. Please try again.");
      setJoining(false);
    }
  };

  return (
    <Card>
      <CardBody className="p-6 space-y-4">
        <h3 className="text-xl font-semibold">Join a Room</h3>
        <p className="text-default-500 text-sm">
          Enter the room code shared by your opponent
        </p>
        <Input
          label="Room Code"
          placeholder="e.g., ABC123"
          value={code}
          onValueChange={(val) => setCode(val.toUpperCase())}
          maxLength={6}
          className="font-mono"
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <Button
          color="primary"
          className="w-full"
          onPress={handleJoin}
          isLoading={joining}
          isDisabled={code.length < 6}
        >
          Join Room
        </Button>
      </CardBody>
    </Card>
  );
}
