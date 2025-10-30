export interface LessonData {
  title: string;
  greeting: string;
  lesson: string;
  practice: string;
}


export interface Message {
  role: "user" | "assistant";
  content: string;
  lessonData?: LessonData; 
}

export interface User {
  id: number;
  name: string;
  email: string;
  goal?: string;
  level?: string;
  createdAt: Date;
}

export interface Conversation {
  id: number;
  userId: number;
  messages: Message[];
  createdAt: Date;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ChatResponse {
  message: string;
  onboardingComplete?: boolean;
}

export interface LessonResponse {
  lesson: LessonData; 
}