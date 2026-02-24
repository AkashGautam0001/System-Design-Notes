"use client";

import { Card, CardBody, Progress } from "@heroui/react";
import type { PlayerScore } from "@/types";

interface MultiplayerScoreboardProps {
  players: PlayerScore[];
  totalQuestions: number;
}

export default function MultiplayerScoreboard({
  players,
  totalQuestions,
}: MultiplayerScoreboardProps) {
  return (
    <Card>
      <CardBody className="p-4 space-y-4">
        <h3 className="font-semibold text-center">Live Scores</h3>
        {players.map((player) => (
          <div key={player.userId} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{player.userName}</span>
              <span>
                {player.score}/{totalQuestions}
                {player.finished && " ✓"}
              </span>
            </div>
            <Progress
              value={(player.currentIndex / totalQuestions) * 100}
              color={player.finished ? "success" : "primary"}
              size="sm"
              aria-label={`${player.userName}'s progress`}
            />
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
