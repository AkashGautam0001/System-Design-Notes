"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Divider,
} from "@heroui/react";
import type { QuizSession } from "@/types";

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: QuizSession;
}

interface ExplanationItem {
  questionIndex: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export default function ExplanationModal({
  isOpen,
  onClose,
  session,
}: ExplanationModalProps) {
  const [explanations, setExplanations] = useState<ExplanationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const wrongAnswers = session.questions
    .map((q, i) => ({ question: q, index: i, userAnswer: session.answers[i] }))
    .filter((item) => item.userAnswer !== item.question.correctAnswer);

  const fetchExplanations = async () => {
    setLoading(true);
    const results: ExplanationItem[] = [];

    for (const item of wrongAnswers) {
      try {
        const response = await fetch("/api/quiz/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: item.question.question,
            userAnswer:
              item.userAnswer !== null
                ? item.question.options[item.userAnswer]
                : "No answer",
            correctAnswer:
              item.question.options[item.question.correctAnswer],
          }),
        });

        const reader = response.body?.getReader();
        if (!reader) continue;

        const decoder = new TextDecoder();
        let text = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }

        results.push({
          questionIndex: item.index,
          question: item.question.question,
          userAnswer:
            item.userAnswer !== null
              ? item.question.options[item.userAnswer]
              : "No answer",
          correctAnswer:
            item.question.options[item.question.correctAnswer],
          explanation: text,
        });
      } catch {
        results.push({
          questionIndex: item.index,
          question: item.question.question,
          userAnswer:
            item.userAnswer !== null
              ? item.question.options[item.userAnswer]
              : "No answer",
          correctAnswer:
            item.question.options[item.question.correctAnswer],
          explanation: "Failed to load explanation.",
        });
      }
    }

    setExplanations(results);
    setLoading(false);
    setLoaded(true);
  };

  const handleOpen = () => {
    if (!loaded && !loading) {
      fetchExplanations();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onOpenChange={(open) => {
        if (open) handleOpen();
      }}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader>Wrong Answer Explanations</ModalHeader>
        <ModalBody>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <Spinner size="sm" />
              <p>Getting AI explanations...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {explanations.map((item, i) => (
                <div key={item.questionIndex}>
                  <p className="font-semibold text-sm">
                    Q{item.questionIndex + 1}: {item.question}
                  </p>
                  <p className="text-danger text-sm mt-1">
                    Your answer: {item.userAnswer}
                  </p>
                  <p className="text-success text-sm">
                    Correct answer: {item.correctAnswer}
                  </p>
                  <p className="text-default-500 text-sm mt-2">
                    {item.explanation}
                  </p>
                  {i < explanations.length - 1 && <Divider className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onPress={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
