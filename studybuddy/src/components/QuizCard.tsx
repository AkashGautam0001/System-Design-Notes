"use client";

import { useState } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import type { QuizQuestion } from "@/types";

interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (answerIndex: number) => void;
  onNext: () => void;
  isLast: boolean;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M11.5 3.5L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function QuizCard({
  question,
  onAnswer,
  onNext,
  isLast,
}: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    onAnswer(selected);
    setAnswered(true);
  };

  const handleNext = () => {
    setSelected(null);
    setAnswered(false);
    onNext();
  };

  const getColor = (index: number) => {
    if (!answered) return selected === index ? "primary" : "default";
    if (index === question.correctAnswer) return "success";
    if (index === selected) return "danger";
    return "default";
  };

  const getVariant = (index: number) => {
    if (!answered && selected !== index) return "bordered";
    if (answered && index !== question.correctAnswer && index !== selected) return "bordered";
    return "flat";
  };

  const getBoxStyles = (index: number) => {
    if (!answered) {
      if (selected === index) return "border-primary bg-primary text-white";
      return "border-default-400";
    }
    if (index === question.correctAnswer) return "border-success bg-success text-white";
    if (index === selected) return "border-danger bg-danger text-white";
    return "border-default-400";
  };

  return (
    <Card className="max-w-2xl mx-auto bg-default-100 border border-default-200">
      <CardBody className="space-y-6 p-6">
        <h3 className="text-lg font-semibold">{question.question}</h3>

        <div className="flex flex-col gap-3">
          {question.options.map((option, index) => (
            <Button
              key={index}
              variant={getVariant(index) as "bordered" | "flat"}
              color={getColor(index) as "primary" | "success" | "danger" | "default"}
              onPress={() => handleSelect(index)}
              isDisabled={answered}
              className="h-auto py-3 px-4 justify-start text-left"
              fullWidth
            >
              <span className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${getBoxStyles(index)}`}>
                {(selected === index) && <CheckIcon />}
              </span>
              <span className="text-sm">{option}</span>
            </Button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          {!answered ? (
            <Button
              color="primary"
              onPress={handleSubmit}
              isDisabled={selected === null}
              className="px-8"
            >
              Submit Answer
            </Button>
          ) : (
            <Button color="primary" onPress={handleNext} className="px-8">
              {isLast ? "See Results" : "Next Question"}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
