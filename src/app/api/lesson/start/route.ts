/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { verifyToken } from "../../../../lib/auth";
import { Content, GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_MODEL = "gemini-2.5-flash";

const mapConversationHistory = (history: any[]): Content[] => {
  return history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
};

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

   const systemPrompt = `
                        You are Verba, a friendly English tutor.

                        Create a short first lesson for ${user.name}.

                        Student info:
                        - Goal: ${user.goal}
                        - Level: ${user.level}

                        Output format (strict, use new lines):
                        Lesson Title: [short title]
                        Greeting: [1 sentence greeting with name]
                        Lesson: [3-4 sentences with 1 example]
                        Practice: [1 short exercise]

                        **Important:** Use a line break after each section. Do NOT put everything in one line.
                        `;

    const contents: Content[] = [
      ...mapConversationHistory(conversationHistory),
      { role: "user", parts: [{ text: message }] },
    ];

    const model = gemini.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.65, // تحكم في الإبداع: 0.6–0.7 أفضل للدروس الصغيرة
        topP: 0.9, // تنويع طفيف في النتائج
        topK: 40, // يمنع التكرار الزائد
        maxOutputTokens: 700, // كافٍ جدًا لدرس قصير (ويمنع قطع الرد)
        candidateCount: 1, // تجنب الردود المتعددة غير الضرورية
        responseMimeType: "text/plain",
      },
    });

    // Generate the lesson content
    const result = await model.generateContent({ contents });

    // Extract the lesson text
    let lesson =
      result?.response?.text() ||
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      null;

    if (!lesson && result?.response?.promptFeedback?.blockReason) {
      console.error(
        "Gemini content was blocked. Reason:",
        result.response.promptFeedback.blockReason
      );
      lesson =
        "I apologize, but the content requested could not be generated due to safety guidelines.";
    }

    if (!lesson) {
      console.error(
        "Gemini returned empty text:",
        JSON.stringify(result, null, 2)
      );
      lesson =
        "Sorry, I could not generate a lesson at this time due to an unknown API error.";
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!existingConversation) {
      const newConversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          messages: [
            { role: "user", content: message },
            { role: "assistant", content: lesson },
          ],
        },
      });
    } else {
      const oldMessages = (existingConversation.messages as any[]) || [];

      const updatedMessages = [
        ...oldMessages,
        { role: "user", content: message },
        { role: "assistant", content: lesson },
      ];

      await prisma.conversation.update({
        where: { id: existingConversation.id },
        data: {
          messages: updatedMessages,
        },
      });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("Lesson error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
