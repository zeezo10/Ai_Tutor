'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface User {
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
  | { type: 'LOGOUT' }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_boardingComplete' }
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
    case 'SET_boardingComplete':
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
      const savedState = localStorage.getItem('appState');
      return savedState ? JSON.parse(savedState) : initialState;
    }
    return initialState;
  });

  React.useEffect(() => {
    localStorage.setItem('appState', JSON.stringify(state));
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