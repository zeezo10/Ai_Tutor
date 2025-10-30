'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// ✅ Export Types
export interface LessonData {
  title: string;
  greeting: string;
  lesson: string;
  practice: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  lessonData?: LessonData; 
}

export interface User {
  id: number;
  name: string;
  email: string;
  goal?: string;
  level?: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  messages: Message[];
  isAuthenticated: boolean;
  onboardingComplete: boolean;
}

type Action =
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'LOGOUT' }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_ONBOARDING_COMPLETE' }
  | { type: 'CLEAR_MESSAGES' };

const initialState: AppState = {
  user: null,
  token: null,
  messages: [],
  isAuthenticated: false,
  onboardingComplete: false,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    
    case 'LOGOUT':
      return initialState;
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
      };
    
    case 'SET_ONBOARDING_COMPLETE':
      return {
        ...state,
        onboardingComplete: true,
      };
    
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, () => {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem('appState');
        if (savedState) {
          return JSON.parse(savedState);
        }
      } catch (error) {
        console.error('Failed to load state:', error);
        localStorage.removeItem('appState');
      }
    }
    return initialState;
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('appState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// ✅ Type Guard
export function isLessonMessage(msg: Message): msg is Message & { lessonData: LessonData } {
  return msg.lessonData !== undefined;
}

// ✅ Helper Functions
export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('appState');
  }
};

// ✅ Custom Hook
export function useMessages() {
  const { state, dispatch } = useApp();
  
  const addMessage = (message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  };
  
  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };
  
  return {
    messages: state.messages,
    addMessage,
    clearMessages,
  };
}