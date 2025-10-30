/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useState,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../../context/AppContext";
import Link from "next/link";


interface LessonData {
  title: string;
  greeting: string;
  lesson: string;
  practice: string;
}


const LessonCard = ({ title, greeting, lesson, practice }: LessonData) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4 max-w-2xl">
      {/* Title */}
      <div className="border-b-2 border-indigo-100 pb-3">
        <h3 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
          📚 {title}
        </h3>
      </div>
      
      {/* Greeting */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-gray-700 font-medium">{greeting}</p>
      </div>
      
      {/* Lesson Content */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          📖 Lesson:
        </h4>
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
          {lesson}
        </p>
      </div>
      
      {/* Practice */}
      <div className="bg-green-50 p-4 rounded-lg space-y-2">
        <h4 className="font-semibold text-green-800 flex items-center gap-2">
          ✏️ Practice:
        </h4>
        <p className="text-gray-700">{practice}</p>
      </div>
    </div>
  );
};

export default function OnboardingPage() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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
          content: `Hi ${state.user?.name}! Welcome to your first lesson. Click Start to begin your English learning journey with Verba.`,
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

  // scroll

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const handleStartLesson = async (message? : string) => {
 
    const inputValue = message || input.trim();  

    if (!inputValue.trim() || loading) return;

    setInput("");
    setLoading(true);

    dispatch({
      type: "ADD_MESSAGE",
      payload: { role: "user", content: inputValue },
    });

    try {
      const response = await fetch("/api/lesson/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", 
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          message: inputValue ,
          conversationHistory: state.messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

     
      if (data.lesson && typeof data.lesson === 'object') {
        dispatch({
          type: "ADD_MESSAGE",
          payload: { 
            role: "assistant", 
            content: "", 
            lessonData: data.lesson as LessonData
          },
        });
      } else {
       
        dispatch({
          type: "ADD_MESSAGE",
          payload: { 
            role: "assistant", 
            content: typeof data.lesson === 'string' ? data.lesson : "Received lesson data"
          },
        });
      }
    } catch (error: any) {
      console.error("Lesson error:", error);
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

  
 const renderMessage = (msg: any) => {
  if (msg.lessonData) {
    let lessonData = msg.lessonData;
    
    
    if (typeof lessonData === 'string') {
      try {
        lessonData = JSON.parse(lessonData);
      } catch {
        console.error('Invalid lesson format');
        return <div className="text-red-500">Invalid lesson format</div>;
      }
    }
    
    if (lessonData.title && lessonData.greeting && lessonData.lesson && lessonData.practice) {
      return <LessonCard {...lessonData} />;
    }
  }
  
  return (
    <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
      msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white text-gray-800 shadow"
    }`}>
      {msg.content}
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white fixed w-full shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">Verba Lesson</h1>
        <Link 
          href="/pages/dashboard"
          className="text-gray-500 hover:text-blue-600 transition"
        >
          Back To Dashboard
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        {state.messages.map((msg: any, index: number) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {renderMessage(msg)}
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

      <div className="bg-white fixed border-t p-4 bottom-0 left-0 right-0">
        {state.messages.length === 1 ? (
          <button 
            onClick={() => handleStartLesson("Start Lesson")}
            disabled={loading}
            className="w-full cursor-pointer bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
          >
            {loading ? "Starting..." : "Start Lesson"}
          </button>
        ) : (
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartLesson("")}
              placeholder="Type your message..."
              className="flex-1 px-4 text-black py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
            <button
              onClick={() => handleStartLesson("")}
              disabled={loading || !input.trim()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}