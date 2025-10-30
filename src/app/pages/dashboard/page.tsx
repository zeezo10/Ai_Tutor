/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Key, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../../context/AppContext";
import { changeGoal } from "../../action/changeGoal";

export default function DashboardPage() {
  const { state, dispatch } = useApp();
  const [showEditField, setShowEditField] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingGoal, setIsChangingGoal] = useState("noAction");
  const [isSureLogout, setIsSureLogout] = useState(false);
  const [input, setInput] = useState("");

  const router = useRouter();

  useEffect(() => {
  if (!state.isAuthenticated) {
    router.push("/pages/login");
    return;
  }

  if (!state.user?.id) return;

  const userId = state.user.id;

  const fetchConversation = async () => {
    try {
      const res = await fetch(
        `/api/conversation?userId=${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${state.token}`, 
          },
        }
      );

      if (!res.ok) {
        console.error("Failed to fetch conversation:", res.status);
        return;
      }

      const data = await res.json();

      if (data?.messages) {
       
        const processedMessages = data.messages.map((msg: any) => {
        
          if (msg.role === "assistant" && msg.content) {
            try {
         
              const parsed = JSON.parse(msg.content);
  
              if (parsed.title && parsed.greeting && parsed.lesson && parsed.practice) {
                return {
                  ...msg,
                  content: parsed.greeting,
                  lessonData: parsed,
                };
              }
            } catch {

            }
          }
          
          return msg;
        });

        dispatch({ type: "SET_MESSAGES", payload: processedMessages });
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  fetchConversation();
}, [state.isAuthenticated, state.user?.id, state.token, router, dispatch]);


  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    document.cookie = "token=; path=/; max-age=0;";
    router.push("/");
  };

  if (!state.user) return null;

  async function handleChangeGoal() {
    setIsChangingGoal("processing");
    if (!state.user) return;

    try {
      setIsLoading(true);

      const response = await changeGoal(state.user.id, input);

      const { user } = response;

      if (response.success === false) {
        throw new Error(response.message);
      } else if (response.success === true && user) {
        dispatch({ type: "CLEAR_MESSAGES" });

        const updatedUser = {
          ...user,
          goal: user.goal ?? undefined,
          level: user.level ?? undefined,
        };

        dispatch({
          type: "SET_USER",
          payload: {
            user: updatedUser,
            token: state.token!,
          },
        });
      }

      setIsChangingGoal("successful");

      setTimeout(() => {
        setShowModal(false);
        setShowEditField(false);
        setIsChangingGoal("noAction");
      }, 2500);
    } catch (error: any) {
      setIsChangingGoal("error");
      console.error("error update goal! ", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {showModal && (
       <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
  {isChangingGoal === "noAction" ? (
    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300">
      <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
        Change Goal
      </h2>
      <p className="text-gray-600 text-center mb-2">
        Are you sure you want to change your goal to
      </p>
      <p className="text-indigo-600 text-center text-xl font-bold mb-4">
        {input}
      </p>
      <p className="text-gray-500 text-center">
        This will reset your current progress.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={handleChangeGoal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-sm transition-all duration-200"
        >
          {!isLoading ? "Save Change" : "Saving..."}
        </button>
        <button
          onClick={() => setShowModal(false)}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : isChangingGoal === "processing" ? (
    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-700 text-lg text-center">
        Changing your goal, please wait...
      </p>
    </div>
  ) : isChangingGoal === "successful" ? (
    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center justify-center gap-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-14 h-14 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
      <p className="text-gray-800 text-center text-lg font-medium">
        Your goal has been successfully changed!
      </p>
    </div>
  ) : (
    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center justify-center gap-4">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-14 h-14 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      <p className="text-gray-800 text-center text-lg font-medium">
        An error occurred while changing your goal.
      </p>
      <p className="text-gray-500 text-center">Please try again.</p>
    </div>
  )}
</div>

      )}

      {isSureLogout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 p-5">
  <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center justify-center gap-6 transform transition-all duration-300">
    <h2 className="text-2xl font-semibold text-gray-900 text-center">
      Log Out
    </h2>

    <p className="text-gray-600 text-center text-lg">
      Are you sure you want to log out?
    </p>

    <div className="w-full flex justify-center gap-4 mt-4">
      <button
        onClick={handleLogout}
        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-sm transition-all duration-200"
      >
        Yes, Log Out
      </button>
      <button
        onClick={() => setIsSureLogout(false)}
        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
      >
        Cancel
      </button>
    </div>
  </div>
</div>

      )}

      <header className="bg-white fixed w-full shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">My Dashboard</h1>
        <button
          onClick={() => setIsSureLogout(true)}
          className={`px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition`}
        >
          Logout
        </button>

      </header>

      <div className="container mx-auto p-6 pt-24 md:pt-40 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Welcome {state.user.name}! 👋
          </h2>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-indigo-50 transition-all duration-300 p-4 rounded-lg">
              <div className="flex justify-between">
                <p className="text-sm text-gray-600 mb-1 flex-1">Your Goal</p>
                <button
                  onClick={() => setShowEditField(!showEditField)}
                  className={`text-sm text-white mb-1 bg-[#6B7280] ${
                    showEditField ? "w-20" : "w-14"
                  } transition-all duration-300 cursor-pointer hover:scale-105 px-2 py-1 rounded-lg hover:bg-orange-300`}
                >
                  {showEditField ? "Close" : "Edit"}
                </button>
              </div>
              {showEditField ? (
                <div className="flex space-x-2">
                  <input
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && input.trim() !== "") {
                        setShowModal(true);
                      }
                    }}
                    onChange={(e) => setInput(e.target.value)}
                    required
                    className="flex-1 px-4 text-black py-2 border border-gray-300 rounded-lg focus:ring-2 w-full focus:ring-indigo-500"
                    type="text"
                    placeholder="what is your new goal?"
                  />

                  <button
                    onClick={() => setShowModal(true)}
                    disabled={input.trim() === ""}
                    className="bg-indigo-600 text-white w-20 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="text-lg font-semibold text-indigo-700">
                  {state.user.goal || "Not set"}
                </p>
              )}
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Your Level</p>
              <p className="text-lg font-semibold text-green-700">
                {state.user.level || "Not set"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Recent Lesson
          </h3>
          <div className="space-y-3">
            {state.messages.slice(-3).map(
              (
                msg: {
                  role: string;
                  content: string;
                },
                index: Key
              ) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    msg.role === "assistant"
                      ? "bg-blue-50 border-l-4 border-indigo-500"
                      : "bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-600 mb-1">
                    {msg.role === "assistant" ? "Verba" : "You"}
                  </p>
                  <p className="text-gray-800">{msg.content}</p>
                </div>
              )
            )}
          </div>
          <button
            onClick={() => router.push("/pages/lesson")}
            className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            {state.messages.length === 0 ? "Start lesson" : "Continue Learning"}
          </button>
        </div>
      </div>
      
    </div>
  );
}
