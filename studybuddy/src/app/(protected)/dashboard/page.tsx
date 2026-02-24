"use client";

import { Tabs, Tab, Card, CardBody, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import TopicSelector from "@/components/TopicSelector";
import { v4 as uuidv4 } from "uuid";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleTopicSelect = (topic: string) => {
    const sessionId = uuidv4();
    router.push(`/quiz/${sessionId}?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome, {user?.name}!
        </h1>
        <p className="text-default-500 mt-1">
          Choose a mode and start learning
        </p>
      </div>

      <Tabs
        aria-label="Game modes"
        color="primary"
        variant="bordered"
        size="lg"
      >
        <Tab key="solo" title="Solo Quiz">
          <div className="mt-6">
            <TopicSelector onSelect={handleTopicSelect} />
          </div>
        </Tab>
        <Tab key="multiplayer" title="Multiplayer Battle">
          <div className="mt-6">
            <Card className="bg-default-100 border border-default-200">
              <CardBody className="text-center p-10 space-y-4">
                <span className="text-5xl">⚔️</span>
                <h3 className="text-xl font-semibold">Battle a Friend</h3>
                <p className="text-default-500">
                  Create a room or join an existing one for a real-time quiz battle!
                </p>
                <Button
                  color="primary"
                  size="lg"
                  variant="shadow"
                  onPress={() => router.push("/multiplayer")}
                >
                  Go to Multiplayer Lobby
                </Button>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
