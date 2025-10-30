/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { verifyToken } from "../../../../lib/auth";
import { GoogleGenerativeAI, Content } from "@google/generative-ai";

// Initialize Gemini ==========================================
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_MODEL = "gemini-2.5-flash";
// Initialize Gemini ==========================================

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

      
      const isRetryable =
        error?.status === 503 ||
        error?.status === 429 ||
        error?.message?.includes("overloaded") ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("network") ||
        error?.message?.includes("MAX_TOKENS");

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }


      const delay = baseDelay * Math.pow(2, attempt);
      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}


const mapConversationHistory = (history: any[]): Content[] => {
  return history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
};

export async function POST(request: NextRequest) {
  try {
  
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer")) {
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

   
    const systemPrompt = `You are Verba, a friendly and supportive AI English tutor.
                         You are currently onboarding ${user.name} to the Verba learning experience.

                         You have already said:
                         "Hi ${user.name}! Welcome to Verba. I’m excited to help you learn English. What’s your English learning goal?"

                         Now the user will respond.

                         Your objectives:
                         1. Ask about the user’s English learning goal (if not already provided).
                         2. Assess their current English level — Beginner, Intermediate, or Advanced.
                         3. Respond in a warm, encouraging, and conversational tone — short, positive, and natural, like a friendly human tutor.

                         Important Rules:
                         - If the user's message expresses their learning goal, reply only with:
                           "goal has been set + ask for level"
                         - If the user's message expresses their English level, reply only with:
                           "level has been set + suggest starting lesson"
                         - If both goal and level are expressed in the same message, reply only with:
                           "goal and level have been set"
                         - Otherwise, continue the conversation naturally and helpfully.
                         - if you got the goal and level, say "type lets go to start the first lesson"
                         Once you clearly understand the user’s goal and level, suggest starting their first personalized lesson.`;

    const contents: Content[] = [
      ...mapConversationHistory(conversationHistory),
      { role: "user", parts: [{ text: message }] },
    ];

    const mainModel = gemini.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    });

    const result = await retryWithBackoff(
      async () => await mainModel.generateContent({ contents })
    );
    const aiResponse =
      result.response.text() || "I apologize, I had trouble responding.";

    if (!user.goal || !user.level) {
      
      const classificationPrompt = `
        Analyze the following user message and tell me if it contains:
        - a learning goal (like what the user wants to achieve)
        - or an English level **(e.g., beginner, intermediate, advanced, fluent, conversational, "just starting", "pretty good")**
        Respond with one of: "goal", "level", "goal and level", or "none".
        Message: "${message}"
      `;

      const classifyModel = gemini.getGenerativeModel({ model: GEMINI_MODEL });
      const classify = await retryWithBackoff(
        async () => await classifyModel.generateContent(classificationPrompt)
      );

      const classification = classify.response.text().toLowerCase();
     

      if (classification.includes("goal")) {

        const goalCorrectionPrompt = `
            You are a helpful text cleaner.
            1. **Correct all typos and grammar** in the following user message.
            2. **Filter out any profanity or inappropriate language.** If the message contains bad language, replace the entire goal with a safe, neutral phrase like: "My learning goal."
            3. **Return ONLY the single, corrected, and safe sentence.** Do not add any extra text, explanations, or quotes.

            Original Goal Message: "${message}"
        `;

        const correctionModel = gemini.getGenerativeModel({ model: GEMINI_MODEL });
        const correctedGoalResponse = await retryWithBackoff(
          async () => await correctionModel.generateContent(goalCorrectionPrompt)
        );

        const cleanedGoal = correctedGoalResponse.response.text().trim();
        

        await prisma.user.update({
          where: { id: user.id },
          data: { goal: cleanedGoal },
        });
      }

      if (classification.includes("level")) {
    
        const levelClassificationPrompt = `
            Analyze the following user message and classify the implied English level as one of these three categories:
            - **Beginner** (e.g., just starting, low confidence, basic grammar/vocabulary)
            - **Intermediate** (e.g., conversational, can handle most situations, needs practice with complex grammar/nuance)
            - **Advanced** (e.g., fluent, near-native, confident in professional/academic settings)

            Your response MUST be ONLY one of the following words: "Beginner", "Intermediate", or "Advanced".
            
            User Message: "${message}"
        `;

        const levelModel = gemini.getGenerativeModel({ model: GEMINI_MODEL });
        const classifiedLevelResponse = await retryWithBackoff(
          async () => await levelModel.generateContent(levelClassificationPrompt)
        );

        const level = classifiedLevelResponse.response.text().trim();
  
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { level },
        });


        if (!!(updatedUser && updatedUser.goal && updatedUser.level)) {
          return NextResponse.json({
            message:
              "Great! Your goal and level have been set. Click 'Go To Dashboard' to start your first lesson!",
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              goal: updatedUser.goal,
              level: updatedUser.level,
            },
            onboardingComplete: true,
          });
        }
      }
    }

    return NextResponse.json({
      message: aiResponse,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        goal: user.goal,
        level: user.level,
      },
      onboardingComplete: !!(user.goal && user.level),
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    
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