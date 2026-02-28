"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithAgent } from "@/lib/api";
import type { MapFeatureCollection } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  mapContext: MapFeatureCollection | null;
}

export default function Raccoon({ mapContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey, I'm Raccoon 🦝 — I eat trash (data). Load a map and ask me anything about the plastic hotspots, weight estimates, or cleanup priorities.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatWithAgent(text, mapContext) as { reply: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I ran into an error. Make sure the backend is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <span className="text-xl">🦝</span>
        <div>
          <p className="text-sm font-semibold">Raccoon</p>
          <p className="text-xs text-gray-500">
            {mapContext
              ? `${mapContext.features.length} hotspots loaded`
              : "No map loaded yet"}
          </p>
        </div>
        {mapContext && (
          <span className="ml-auto inline-block h-2 w-2 rounded-full bg-green-500" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts — shown only when map is loaded and no user messages yet */}
      {mapContext && messages.filter((m) => m.role === "user").length === 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {[
            "Where are the biggest hotspots?",
            "Total weight estimate?",
            "Where should we start?",
            "How many person-hours?",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setInput(prompt);
              }}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 px-3 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mapContext ? "Ask about this site..." : "Load a map first..."
            }
            disabled={!mapContext || loading}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={!mapContext || !input.trim() || loading}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
