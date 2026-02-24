"use client";

import { useState } from "react";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { TOPICS } from "@/lib/constants";

interface TopicSelectorProps {
  onSelect: (topic: string) => void;
}

export default function TopicSelector({ onSelect }: TopicSelectorProps) {
  const [customTopic, setCustomTopic] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTopic.trim()) {
      onSelect(customTopic.trim());
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Pick a Topic</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {TOPICS.map((topic) => (
          <Card
            key={topic.value}
            isPressable
            onPress={() => onSelect(topic.value)}
            className="bg-default-100 border border-default-200 hover:border-primary hover:bg-default-200 transition-all"
          >
            <CardBody className="text-center p-5 gap-2">
              <span className="text-3xl">{topic.icon}</span>
              <p className="font-medium text-sm">{topic.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="bg-default-50 border border-default-200">
        <CardBody className="p-4">
          <p className="text-sm text-default-500 mb-3">Or enter a custom topic:</p>
          <form onSubmit={handleCustomSubmit} className="flex gap-3">
            <Input
              placeholder="e.g., Machine Learning, Docker..."
              value={customTopic}
              onValueChange={setCustomTopic}
              variant="bordered"
            />
            <Button
              type="submit"
              color="primary"
              variant="shadow"
              isDisabled={!customTopic.trim()}
            >
              Start Quiz
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
