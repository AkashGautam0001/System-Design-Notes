"use client";

import { useState } from "react";
import { Card, CardBody, Button, Snippet, Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { QUIZ_CONFIG } from "@/lib/constants";
import TopicSelector from "./TopicSelector";
import { v4 as uuidv4 } from "uuid";

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < QUIZ_CONFIG.roomCodeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function RoomCreator() {
  const { user } = useAuth();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const handleTopicSelect = async (topic: string) => {
    if (!user) return;
    setCreating(true);

    try {
      const code = generateRoomCode();

      // Create room via API
      const createRes = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: uuidv4(),
          room_code: code,
          host_id: user.id,
          host_name: user.name || user.email,
          topic,
          status: "waiting",
        }),
      });

      if (!createRes.ok) throw new Error("Failed to create room");

      setRoomCode(code);
      setCreating(false);
      setGeneratingQuiz(true);

      // Generate quiz questions
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid quiz format");
      const parsed = JSON.parse(jsonMatch[0]);

      // Store questions in room via API
      await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_code: code,
          questions: parsed.questions,
          status: "ready",
        }),
      });

      setGeneratingQuiz(false);
    } catch (error) {
      console.error("Failed to create room:", error);
      setCreating(false);
      setGeneratingQuiz(false);
    }
  };

  if (creating) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center p-8 gap-3">
          <Spinner size="sm" />
          <p>Creating room...</p>
        </CardBody>
      </Card>
    );
  }

  if (roomCode) {
    return (
      <Card>
        <CardBody className="text-center p-8 space-y-4">
          <h3 className="text-xl font-semibold">Room Created!</h3>
          <p className="text-default-500">Share this code with your opponent:</p>
          <Snippet symbol="" size="lg" className="text-2xl font-mono">
            {roomCode}
          </Snippet>
          {generatingQuiz ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner size="sm" />
              <p className="text-default-500">Generating quiz questions...</p>
            </div>
          ) : (
            <Button
              color="primary"
              size="lg"
              onPress={() => router.push(`/multiplayer/${roomCode}`)}
            >
              Enter Room
            </Button>
          )}
        </CardBody>
      </Card>
    );
  }

  return <TopicSelector onSelect={handleTopicSelect} />;
}
