"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
} from "@heroui/react";
import type { QuizScore } from "@/types";

interface LeaderboardTableProps {
  scores: QuizScore[];
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function LeaderboardTable({ scores }: LeaderboardTableProps) {
  return (
    <Table aria-label="Leaderboard" isStriped>
      <TableHeader>
        <TableColumn>Rank</TableColumn>
        <TableColumn>Player</TableColumn>
        <TableColumn>Topic</TableColumn>
        <TableColumn>Score</TableColumn>
        <TableColumn>Date</TableColumn>
      </TableHeader>
      <TableBody emptyContent="No scores yet. Be the first!">
        {scores.map((entry, index) => (
          <TableRow key={entry.id}>
            <TableCell className="font-semibold">
              {getRankDisplay(index + 1)}
            </TableCell>
            <TableCell>{entry.user_name}</TableCell>
            <TableCell>
              <Chip size="sm" variant="flat" color="primary">
                {entry.topic}
              </Chip>
            </TableCell>
            <TableCell className="font-mono">
              {entry.score}/{entry.total}
            </TableCell>
            <TableCell className="text-default-500 text-sm">
              {new Date(entry.created_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
