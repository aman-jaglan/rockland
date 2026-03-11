"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useChat, buildChatContext } from "@/lib/api/ai-chat";
import { Button } from "@/components/ui/button";
import type { Grant, FQHCProfile } from "@/lib/types";

interface ChatInterfaceProps {
  grant: Grant;
  profile: FQHCProfile;
}

/**
 * Chat message bubble component
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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

/**
 * Loading indicator for streaming response
 */
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
        <div className="flex space-x-1.5">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

interface MessagePart {
  type: string;
  text?: string;
}

interface ChatMessageType {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
}

/**
 * Get text content from message parts
 */
function getMessageContent(message: ChatMessageType): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part): part is MessagePart & { text: string } => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
  }

  return '';
}

/**
 * Chat Interface Component
 *
 * AI chat assistant for discussing grant details and eligibility.
 * Uses Vercel AI SDK's useChat hook with streaming responses.
 *
 * Features:
 * - Sends FQHC profile and grant context with each message
 * - Streaming responses from Gemini 1.5 Flash
 * - Auto-scroll to bottom on new messages
 * - Message history with user/AI distinction
 */
export function ChatInterface({ grant, profile }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  // Build context string from profile and grant
  const context = buildChatContext(profile, grant);

  // Initial message to show before any chat
  const initialMessageText = `I've analyzed this grant opportunity for your organization. This grant is "${grant.title}" from ${grant.agency}. Based on your profile, I can help you understand:

- Why this grant may be a good fit
- Eligibility requirements
- Application process
- Required documentation

What would you like to know?`;

  // Use Vercel AI SDK chat hook - new API v5+
  const { messages, status, sendMessage, error, setMessages } = useChat({
    id: `grant-chat-${grant.id}`,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Set initial message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "initial-message",
          role: "assistant",
          parts: [{ type: "text", text: initialMessageText }],
        },
      ]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  // Handle form submission
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();
    setInputValue("");

    // Send message with context
    await sendMessage({
      text: `Context about the organization and grant:\n${context}\n\nUser question: ${messageText}`,
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Assistant</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Ask questions about this grant opportunity
        </p>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role as "user" | "assistant"}
            content={getMessageContent(message as unknown as ChatMessageType)}
          />
        ))}

        {/* Show typing indicator when loading */}
        {isLoading && <TypingIndicator />}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg px-4 py-2 mb-3 text-sm">
            Error: {error.message || "Failed to get response. Please try again."}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your question..."
            disabled={isLoading}
            className="flex-1 w-full rounded-md border px-3 py-2 text-sm transition-colors duration-150 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()}>
            {isLoading ? "..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
