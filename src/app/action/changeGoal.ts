/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../lib/prisma";

export async function changeGoal(userId: number, goal: string) {
  try {
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const GEMINI_MODEL = "gemini-2.5-flash";

    const goalCorrectionPrompt = `
      You are a helpful text cleaner.
      1. Correct all typos and grammar in the following user message.
      2. Filter out any profanity or inappropriate language. If the message contains bad language, replace the entire goal with a safe, neutral phrase like: "My learning goal."
      3. Return ONLY the single, corrected, and safe sentence. Do not add any extra text, explanations, or quotes.

      Original Goal Message: "${goal}"
    `;


    
    const correctedGoalResponse = await gemini
      .getGenerativeModel({ model: GEMINI_MODEL })
      .generateContent(goalCorrectionPrompt);

    const cleanedGoal = correctedGoalResponse.response
      ?.text()
      ?.trim() || "My learning goal";

      await prisma.conversation.deleteMany({
      where: { userId },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { goal: cleanedGoal },
    });

    return {
      success: true,
      message: "Goal updated successfully.",
      user: updatedUser,
    };
  } catch (error: any) {
    console.error("Error in changeGoal:", error);

    
    return {
      success: false,
      message:
        error?.response?.data?.error?.message ||
        error?.message ||
        "An unexpected error occurred while updating the goal.",
    };
  }
}
