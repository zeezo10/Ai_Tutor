/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { verifyToken } from "../../../../lib/auth";
import { Content, GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Maps the conversation history array from your application's state/database
 * into the required Content[] format for the Gemini API.
 * FIX: This now reconstructs the full assistant message (greeting + lesson + practice)
 * from either 'lessonData' (recent state) or 'content' (DB-stored JSON string)
 * to ensure the AI remembers what it asked.
 */
const mapConversationHistory = (history: any[]): Content[] => {
  return history.map((msg) => {
    // 1. Handle user messages (straightforward)
    if (msg.role === "user") {
      return {
        role: "user",
        parts: [{ text: msg.content }],
      };
    }

    // 2. Handle assistant messages
    if (msg.role === "assistant") {
      let lesson;

      // Check if it's the recent, parsed object structure
      if (msg.lessonData) {
        lesson = msg.lessonData;
      }
      // Check if it's the database-stored JSON string
      else if (msg.content) {
        try {
          // Attempt to parse the JSON string saved in 'content'
          lesson = JSON.parse(msg.content);
        } catch (e) {
          // If parsing fails, just send the raw content, which might be an empty string
          return { role: "model", parts: [{ text: msg.content }] };
        }
      }

      // If we successfully retrieved the lesson data, reconstruct the full message
      if (lesson && lesson.greeting && lesson.lesson && lesson.practice) {
        // Combine the relevant output fields into a single text block
        const modelContent = `${lesson.greeting} ${lesson.lesson} ${lesson.practice}`;
        return {
          role: "model",
          parts: [{ text: modelContent }],
        };
      }
    }

    // Fallback for any unrecognizable message
    return { role: "model", parts: [{ text: "" }] };
  });
};

// Retry function with exponential backoff (unchanged)
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a retryable error (503, 429, or network errors)
      const isRetryable =
        error?.status === 503 ||
        error?.status === 429 ||
        error?.message?.includes("overloaded") ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("network");

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { message, conversationHistory } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.goal || !user.level) {
      return NextResponse.json(
        { error: "Complete onboarding first" },
        { status: 400 }
      );
    }

    // --- REFINED SYSTEM PROMPT for better conversational flow ---
    const systemPrompt = `
You are Verba, a friendly English tutor.

Task: Create or continue a short English lesson for ${user.name} (Goal: ${user.goal}, Level: ${user.level}).

Rules:
1. **Check the user's latest message against your last question in the history.**
   - If it's an answer and it's CORRECT: Start the "greeting" with "Correct!" or "Great job!"
   - If it's an answer and it's INCORRECT: Start the "greeting" with "Not quite. The correct answer was: [correct answer]."
   - If the user is NOT answering a question (e.g., "hi", "new topic"): Just use a simple "Hello!" or "Let's get started!"
2. After the greeting, continue with the lesson.
3. Keep everything short, simple, and focus on one concept.

Return only valid JSON, no extra text.
{
  "title": "short title (max 5 words)",
  "greeting": "feedback or short greeting (based on Rule 1)",
  "lesson": "1-2 short sentences with example or next step",
  "practice": "1 short question"
}
`;
    // --- END REFINED SYSTEM PROMPT ---

    // Increase history depth to provide better context for conversational continuity
    const limitedHistory = conversationHistory.slice(-20);


    const model = gemini.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.65,
        topP: 0.9,
        topK: 40,
        // Increased token limit for safety
        maxOutputTokens: 1024,
      },
    });

    const contents: Content[] = [
      ...mapConversationHistory(limitedHistory),
      { role: "user", parts: [{ text: message }] },
    ];

    // Use retry mechanism for API call
    const result = await retryWithBackoff(
      async () => await model.generateContent({ contents }),
      3, // max retries
      1000 // initial delay in ms
    );

    let lessonText =
      result?.response?.text() ||
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      null;

    if (!lessonText && result?.response?.promptFeedback?.blockReason) {
      console.error(
        "Gemini content was blocked. Reason:",
        result.response.promptFeedback.blockReason
      );
      return NextResponse.json(
        { error: "Content blocked by safety guidelines" },
        { status: 400 }
      );
    }

    if (!lessonText) {
      console.error(
        "Gemini returned empty text:",
        JSON.stringify(result, null, 2)
      );
      return NextResponse.json(
        { error: "Could not generate lesson" },
        { status: 500 }
      );
    }

    lessonText = lessonText.trim();

    // Clean up markdown wrapping if present
    if (lessonText.startsWith("```json")) {
      lessonText = lessonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    let lesson;
    try {
      lesson = JSON.parse(lessonText);
    } catch (parseError) {
      console.error("Failed to parse JSON:", lessonText);
      return NextResponse.json(
        { error: "Invalid lesson format" },
        { status: 500 }
      );
    }

    // Strict check for the required structure
    if (
      !lesson.title ||
      typeof lesson.greeting === "undefined" || // Allow empty string ""
      !lesson.lesson ||
      !lesson.practice
    ) {
      console.error("Incomplete lesson structure:", lesson);
      return NextResponse.json(
        { error: "Incomplete lesson data" },
        { status: 500 }
      );
    }

    // --- Database Logging ---
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        userId: user.id,
      },
    });

    // Stringify the lesson object for storage in the database
    const lessonContent = JSON.stringify(lesson);

    if (!existingConversation) {
      await prisma.conversation.create({
        data: {
          userId: user.id,
          messages: [
            { role: "user", content: message },
            // Store the JSON string for the assistant's turn
            { role: "assistant", content: lessonContent },
          ],
        },
      });
    } else {
      const oldMessages = (existingConversation.messages as any[]) || [];

      const updatedMessages = [
        ...oldMessages,
        { role: "user", content: message },
        { role: "assistant", content: lessonContent },
      ];

      await prisma.conversation.update({
        where: { id: existingConversation.id },
        data: {
          messages: updatedMessages,
        },
      });
    }

    // Return the parsed lesson object
    return NextResponse.json({ lesson });
  } catch (error: any) {
    console.error("Lesson error:", error);

    // Specific error handling for service issues
    if (error?.status === 503 || error?.message?.includes("overloaded")) {
      return NextResponse.json(
        {
          error:
            "Service temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}