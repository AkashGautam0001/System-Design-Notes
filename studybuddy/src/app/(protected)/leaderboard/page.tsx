"use client";

import { useEffect, useState } from "react";
import { Chip, Spinner } from "@heroui/react";
import { TOPICS } from "@/lib/constants";
import LeaderboardTable from "@/components/LeaderboardTable";
import type { QuizScore } from "@/types";

export default function LeaderboardPage() {
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState("all");

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({ limit: "50" });
        if (selectedTopic !== "all") {
          params.set("topic", selectedTopic);
        }

        const res = await fetch(`/api/scores?${params}`);
        const { data } = await res.json();

        if (data) {
          setScores(data as QuizScore[]);
        }
      } catch (err) {
        console.error("Failed to fetch scores:", err);
      }
      setLoading(false);
    };

    fetchScores();
  }, [selectedTopic]);

  const topicFilters = [
    { key: "all", label: "All Topics", icon: "🏆" },
    ...TOPICS.map((t) => ({ key: t.value, label: t.label, icon: t.icon })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-default-500 mt-1">Top performers across all quizzes</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {topicFilters.map((topic) => (
          <Chip
            key={topic.key}
            variant={selectedTopic === topic.key ? "solid" : "bordered"}
            color={selectedTopic === topic.key ? "primary" : "default"}
            className="cursor-pointer"
            startContent={<span>{topic.icon}</span>}
            onClick={() => setSelectedTopic(topic.key)}
          >
            {topic.label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" label="Loading scores..." />
        </div>
      ) : (
        <LeaderboardTable scores={scores} />
      )}
    </div>
  );
}
