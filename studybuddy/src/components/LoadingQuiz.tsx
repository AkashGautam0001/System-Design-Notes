"use client";

import { Card, CardBody, Spinner } from "@heroui/react";

interface LoadingQuizProps {
  streamedText: string;
}

export default function LoadingQuiz({ streamedText }: LoadingQuizProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Spinner size="sm" />
        <h2 className="text-xl font-semibold">Generating your quiz...</h2>
      </div>
      <Card>
        <CardBody>
          <pre className="text-sm text-default-500 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
            {streamedText || "Waiting for AI response..."}
          </pre>
        </CardBody>
      </Card>
      <p className="text-sm text-default-400 text-center">
        AI is crafting questions just for you
      </p>
    </div>
  );
}
