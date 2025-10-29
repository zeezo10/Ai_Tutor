import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ GET /api/conversation?userId=123
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId query parameter" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: { userId: Number(userId) },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "No conversation found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: conversation.id,
      createdAt: conversation.createdAt,
      userId: conversation.userId,
      messages: conversation.messages,
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
