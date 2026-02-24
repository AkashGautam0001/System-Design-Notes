"use client";

import { Tabs, Tab } from "@heroui/react";
import RoomCreator from "@/components/RoomCreator";
import RoomJoiner from "@/components/RoomJoiner";

export default function MultiplayerLobbyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Multiplayer Battle</h1>
        <p className="text-default-500 mt-1">
          Create a room or join an existing one
        </p>
      </div>

      <Tabs aria-label="Multiplayer options" color="primary" size="lg">
        <Tab key="create" title="Create Room">
          <div className="mt-4">
            <RoomCreator />
          </div>
        </Tab>
        <Tab key="join" title="Join Room">
          <div className="mt-4 max-w-md">
            <RoomJoiner />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
