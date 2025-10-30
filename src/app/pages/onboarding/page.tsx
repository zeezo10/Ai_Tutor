/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../../context/AppContext";

export default function OnboardingPage() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.isAuthenticated) {
      router.push("/pages/login");
      return;
    }

    setIsInitialized(true);
  }, [state.isAuthenticated, router, dispatch]);

  useEffect(() => {
    if (!isInitialized || !state.isAuthenticated) return;

    if (!state.onboardingComplete) {
      if (state.messages.length === 0) {
        const greeting = `Hi ${state.user?.name}! Welcome to Verba. I'm excited to help you learn English. What's your English learning goal?`;

        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            role: "assistant",
            content: greeting,
          },
        });
      }
    }
  }, [
    isInitialized,
    state.isAuthenticated,
    state.user?.name,
    dispatch,
    state.messages.length,
  ]);

  useEffect(() => {
    if (isInitialized && state.messages.length > 0) {
      localStorage.setItem(
        "onboardingMessages",
        JSON.stringify(state.messages)
      );
    }
  }, [state.messages, isInitialized]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const handleStartLesson = () => {
    localStorage.removeItem("onboardingMessages");

    dispatch({
      type: "CLEAR_MESSAGES",
    });

    router.push("/pages/dashboard");
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    dispatch({
      type: "ADD_MESSAGE",
      payload: { role: "user", content: userMessage },
    });

    try {
      const response = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: state.messages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      dispatch({
        type: "ADD_MESSAGE",
        payload: { role: "assistant", content: data.message },
      });

      if (data.onboardingComplete) {
        dispatch({
          type: "SET_USER",
          payload: { user: data.user, token: state.token! },
        });

        dispatch({
          type: "SET_ONBOARDING_COMPLETE",
        });

      }
    } catch (error: any) {
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          role: "assistant",
          content: "Sorry, I had trouble responding. Please try again.",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-indigo-600">Verba Onboarding</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.messages.map((msg: any, index: number) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-800 shadow"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2 rounded-2xl shadow text-gray-500 animate-pulse">
              <span className="inline-flex gap-1">
                Typing
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t p-4">
        {state.onboardingComplete ? (
          <button
            onClick={handleStartLesson}
            disabled={loading}
            className="w-full bg-green-60 cursor-pointer text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            Go To Dashboard{" "}
          </button>
        ) : (
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 text-black py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 cursor-pointer text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
