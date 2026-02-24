export const TOPICS = [
  { label: "JavaScript", icon: "🟨", value: "javascript" },
  { label: "TypeScript", icon: "🔷", value: "typescript" },
  { label: "React", icon: "⚛️", value: "react" },
  { label: "Next.js", icon: "▲", value: "nextjs" },
  { label: "Node.js", icon: "🟢", value: "nodejs" },
  { label: "Python", icon: "🐍", value: "python" },
  { label: "CSS", icon: "🎨", value: "css" },
  { label: "HTML", icon: "🌐", value: "html" },
  { label: "SQL", icon: "🗃️", value: "sql" },
  { label: "Git", icon: "🔀", value: "git" },
  { label: "Data Structures", icon: "🏗️", value: "data-structures" },
  { label: "System Design", icon: "🏛️", value: "system-design" },
] as const;

export const AI_MODEL = "openai/gpt-4o-mini";

export const QUIZ_CONFIG = {
  questionsPerQuiz: 10,
  roomCodeLength: 6,
} as const;
