"use client";

import { useRef, useEffect, useState, type FormEvent } from "react";
import { buildChatContext } from "@/lib/api/ai-chat";
import type { Grant, FQHCProfile } from "@/lib/types";

interface ChatInterfaceProps {
  grant: Grant;
  profile: FQHCProfile;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * Get storage key for chat history
 */
function getChatStorageKey(grantId: string, profileId: string): string {
  return `chat:${grantId}:${profileId}`;
}

/**
 * Load chat history from localStorage
 */
function loadChatHistory(grantId: string, profileId: string): Message[] | null {
  if (typeof window === "undefined") return null;

  try {
    const key = getChatStorageKey(grantId, profileId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as Message[];
    }
  } catch (error) {
    console.error("Failed to load chat history:", error);
  }
  return null;
}

/**
 * Save chat history to localStorage
 */
function saveChatHistory(grantId: string, profileId: string, messages: Message[]): void {
  if (typeof window === "undefined") return;

  try {
    const key = getChatStorageKey(grantId, profileId);
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error("Failed to save chat history:", error);
  }
}

/**
 * Chat message bubble
 */
function ChatMessage({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Typing indicator
 */
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex-shrink-0 mr-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-5 py-4">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Suggested questions
 */
const SUGGESTED_QUESTIONS = [
  "Is my organization eligible for this grant?",
  "What are the key requirements?",
  "What documents do I need to apply?",
  "How competitive is this grant?",
];

/**
 * Chat Interface with streaming and persistence
 */
export function ChatInterface({ grant, profile }: ChatInterfaceProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const context = buildChatContext(profile, grant);

  function getDaysUntilDeadline(deadline: Date): number {
    const d = deadline instanceof Date ? deadline : new Date(deadline);
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  const initialMessage: Message = {
    id: "initial-message",
    role: "assistant",
    content: `Hi! I'm your grant assistant. I've analyzed "${grant.title}" from ${grant.agency} for ${profile.name}.

Based on my analysis, here's what you should know:

**Quick Assessment:** This appears to be a ${grant.fundingAmount.max >= 500000 ? 'significant' : 'moderate'} funding opportunity with ${getDaysUntilDeadline(grant.deadline)} days until the deadline.

I can help you understand:
• Whether your organization is eligible
• What the key requirements are
• How to strengthen your application
• Any potential concerns or conflicts

What would you like to know?`,
  };

  // Initialize messages from localStorage or use initial message
  useEffect(() => {
    if (!initialized) {
      const savedHistory = loadChatHistory(grant.id, profile.id);
      if (savedHistory && savedHistory.length > 0) {
        setMessages(savedHistory);
      } else {
        setMessages([initialMessage]);
      }
      setInitialized(true);
    }
  }, [grant.id, profile.id, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (initialized && messages.length > 0) {
      saveChatHistory(grant.id, profile.id, messages);
    }
  }, [messages, grant.id, profile.id, initialized]);

  // Auto-scroll to bottom - scroll the container, not the page
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isLoading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Build API messages (exclude initial greeting for cleaner context)
      const apiMessages = updatedMessages
        .filter((m) => m.id !== "initial-message")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, context }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      const assistantMessageId = `assistant-${Date.now()}`;

      // Add empty assistant message that we'll stream into
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        // Update the assistant message with streamed content
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: fullContent } : m
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuggestedQuestion(question: string) {
    setInputValue(question);
  }

  function clearHistory() {
    const key = getChatStorageKey(grant.id, profile.id);
    localStorage.removeItem(key);
    setMessages([initialMessage]);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Grant Assistant
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ask me anything about this grant
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {messages.length > 1 && (
              <button
                onClick={clearHistory}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Clear chat history"
              >
                Clear
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-emerald-500'} animate-pulse`}></span>
              <span className={`text-xs font-medium ${isLoading ? 'text-yellow-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {isLoading ? 'Thinking...' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages - contained scrolling */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-950 min-h-0"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} role={message.role} content={message.content} />
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <TypingIndicator />
        )}

        {error && (
          <div className="flex justify-center mb-4">
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions (only show if few messages) */}
      {messages.length <= 2 && (
        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedQuestion(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about eligibility, requirements, deadlines..."
            disabled={isLoading}
            className="flex-1 rounded-xl border-0 bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex-shrink-0 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
