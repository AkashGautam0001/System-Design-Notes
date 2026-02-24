"use client";

import { Progress } from "@heroui/react";

interface QuizProgressProps {
  current: number;
  total: number;
}

export default function QuizProgress({ current, total }: QuizProgressProps) {
  const percentage = ((current + 1) / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-default-500">
        <span>Question {current + 1} of {total}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <Progress
        value={percentage}
        color="primary"
        size="sm"
        aria-label="Quiz progress"
      />
    </div>
  );
}
