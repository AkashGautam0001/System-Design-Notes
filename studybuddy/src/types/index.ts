export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface QuizSession {
  id: string;
  topic: string;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: (number | null)[];
  score: number;
  status: "loading" | "playing" | "finished";
}

export interface QuizScore {
  id: string;
  user_id: string;
  user_name: string;
  topic: string;
  score: number;
  total: number;
  created_at: string;
}

export interface QuizRoom {
  id: string;
  room_code: string;
  host_id: string;
  host_name: string;
  guest_id: string | null;
  guest_name: string | null;
  topic: string;
  status: string;
  questions: QuizQuestion[] | null;
  created_at: string;
}

export interface PlayerScore {
  userId: string;
  userName: string;
  score: number;
  currentIndex: number;
  finished: boolean;
}
