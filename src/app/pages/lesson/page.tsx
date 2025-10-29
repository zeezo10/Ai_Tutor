/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useState,
  useEffect,
  useRef,
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
} from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../../context/AppContext";
import Link from "next/link";

export default function OnboardingPage() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  //   const [onboardingComplete, setOnboardingComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const hasGreetedRef = useRef(false);

  useEffect(() => {
    if (!state.isAuthenticated) {
      router.push("/pages/login");
      return;
    }

    if (!hasGreetedRef.current && state.messages.length === 0) {
      hasGreetedRef.current = true;
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          role: "assistant",
          content: `Hi ${state.user?.name}! Welcome to your first lesson type Start to begin your English learning journey with Verba.`,
        },
      });
    }
  }, [
    state.isAuthenticated,
    router,
    state.messages.length,
    state.user?.name,
    dispatch,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  //===========================================================

  const handleStartLesson = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    setLoading(true);

    dispatch({
      type: "ADD_MESSAGE",
      payload: { role: "user", content: userMessage },
    });

    try {
      const response = await fetch("/api/lesson/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: state.messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      dispatch({
        type: "ADD_MESSAGE",
        payload: { role: "assistant", content: data.lesson },
      });
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

  //===========================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Verba Lesson</h1>
        <Link 
        href={"/pages/dashboard"}
        className="text-gray-500 hover:text-blue-600 transition"
        >
          Back To Dashboard
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        {state.messages.map(
          (
            msg: {
              role: string;
              content:
                | string
                | number
                | bigint
                | boolean
                | ReactElement<unknown, string | JSXElementConstructor<any>>
                | Iterable<ReactNode>
                | ReactPortal
                | Promise<
                    | string
                    | number
                    | bigint
                    | boolean
                    | ReactPortal
                    | ReactElement<unknown, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | null
                    | undefined
                  >
                | null
                | undefined;
            },
            index: Key | null | undefined
          ) => (
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
          )
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2 rounded-2xl shadow text-gray-500">
              Typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white fixed  border-t p-4 bottom-0 left-0 right-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStartLesson()}
            placeholder="Type your message..."
            className="flex-1 px-4 text-black py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            onClick={handleStartLesson}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
