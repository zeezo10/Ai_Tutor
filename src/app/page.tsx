'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { useEffect } from 'react';

export default function HomePage() {
  const { state } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (state.isAuthenticated) {
      router.push('/pages/dashboard');
    }
  }, [state.isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-3xl">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
          Welcome to Verba
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Your AI-powered English tutor. Learn at your own pace with personalized lessons.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/pages/signup"
            className="px-8 py-4 cursor-pointer bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Get Started Free
          </Link>
          <Link
            href="/pages/login"
            className="px-8 py-4 cursor-pointer bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-gray-50 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 border-2 border-indigo-600"
          >
            Login
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Personalized</h3>
            <p className="text-gray-600">Lessons tailored to your goals and level</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">AI-Powered</h3>
            <p className="text-gray-600">Chat with an intelligent tutor anytime</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="text-4xl mb-3">📈</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Track Progress</h3>
            <p className="text-gray-600">Monitor your learning journey</p>
          </div>
        </div>
      </div>
    </div>
  );
}