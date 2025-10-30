// ✅ 1. عرّف LessonData أولاً
export interface LessonData {
  title: string;
  greeting: string;
  lesson: string;
  practice: string;
}

// ✅ 2. ثم استخدمه في Message
export interface Message {
  role: "user" | "assistant";
  content: string;
  lessonData?: LessonData; // الآن LessonData معرّف
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

// ✅ 3. حدّث LessonResponse ليرجع object بدلاً من string
export interface LessonResponse {
  lesson: LessonData; // ✅ بدلاً من string
}