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
 * Chat message bubble component with modern styling
 */
function ChatMessage({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {/* Avatar for assistant */}
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
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md"
            : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-700"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>

      {/* Avatar for user */}
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
 * Typing indicator with smooth animation
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "1s" }} />
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "1s" }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Chat Interface Component
 *
 * AI chat assistant for discussing grant details and eligibility.
 * Custom implementation using fetch with streaming support.
 */
export function ChatInterface({ grant, profile }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build context string from profile and grant
  const context = buildChatContext(profile, grant);

  // Initial message content
  const initialMessage = `I've analyzed this grant opportunity for your organization. This grant is "${grant.title}" from ${grant.agency}. Based on your profile, I can help you understand:

- Why this grant may be a good fit
- Eligibility requirements
- Application process
- Required documentation

What would you like to know?`;

  // Set initial message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "initial-message",
          role: "assistant",
          content: initialMessage,
        },
      ]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Handle form submission
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);

    // Add user message to chat (only show the actual question, not context)
    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Build messages array for API (include context in first user message only)
      const apiMessages = messages
        .filter((m) => m.id !== "initial-message") // Skip initial AI message
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // Add the new user message with context
      apiMessages.push({
        role: "user" as const,
        content: userMessage,
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          context, // Pass context separately
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
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

        // Update assistant message with streamed content
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-xl">
      {/* Chat header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Grant Assistant
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Powered by Gemini AI
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-1">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))}

        {/* Show typing indicator when loading */}
        {isLoading && <TypingIndicator />}

        {/* Error message */}
        {error && (
          <div className="flex justify-center mb-4">
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2 shadow-sm border border-red-100 dark:border-red-800">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-b-xl">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about eligibility, deadlines, requirements..."
              disabled={isLoading}
              className="w-full rounded-xl border-0 bg-gray-100 dark:bg-gray-700 px-4 py-3 pr-12 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="flex-shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 text-sm font-medium text-white shadow-md hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-indigo-500 transition-all duration-200"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-center text-gray-400 dark:text-gray-500">
          AI responses are for informational purposes. Always verify grant requirements.
        </p>
      </form>
    </div>
  );
}
