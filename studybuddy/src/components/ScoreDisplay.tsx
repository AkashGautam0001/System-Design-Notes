"use client";

import { Card, CardBody, Button } from "@heroui/react";
import Link from "next/link";
import type { QuizSession } from "@/types";

interface ScoreDisplayProps {
  session: QuizSession;
  onPlayAgain: () => void;
  onExplain?: () => void;
}

export default function ScoreDisplay({
  session,
  onPlayAgain,
  onExplain,
}: ScoreDisplayProps) {
  const percentage = Math.round((session.score / session.questions.length) * 100);

  const getGrade = () => {
    if (percentage >= 90) return { label: "Excellent!", color: "text-success" };
    if (percentage >= 70) return { label: "Great Job!", color: "text-primary" };
    if (percentage >= 50) return { label: "Good Effort!", color: "text-warning" };
    return { label: "Keep Practicing!", color: "text-danger" };
  };

  const grade = getGrade();

  const wrongAnswers = session.questions.filter(
    (q, i) => session.answers[i] !== q.correctAnswer
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardBody className="text-center p-8 space-y-4">
          <h2 className="text-4xl font-bold">
            {session.score} / {session.questions.length}
          </h2>
          <p className={`text-2xl font-semibold ${grade.color}`}>
            {grade.label}
          </p>
          <p className="text-default-500">{percentage}% correct</p>

          <div className="flex flex-wrap gap-3 justify-center pt-4">
            <Button color="primary" onPress={onPlayAgain}>
              Play Again
            </Button>
            {wrongAnswers.length > 0 && onExplain && (
              <Button variant="bordered" onPress={onExplain}>
                Explain Wrong Answers
              </Button>
            )}
            <Button as={Link} href="/leaderboard" variant="flat">
              View Leaderboard
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
