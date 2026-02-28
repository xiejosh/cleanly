"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { chatWithAgent } from "@/lib/api";
import type { DashboardSummary, MapFeatureCollection } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  mapContext?: MapFeatureCollection | null;
  dashboardData?: DashboardSummary | null;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hey, I'm **Raccoon** — your plastic data analyst. I have access to all the survey data, zone breakdowns, weight estimates, and team info. Ask me anything about the mission!",
};

const PROMPTS_WITH_DATA = [
  "Summarize the survey findings",
  "Which zones have the most plastic?",
  "How much plastic is buried?",
  "Estimate person-hours for cleanup",
  "What team do we need?",
  "Compare top 3 hotspots",
];

const PROMPTS_NO_DATA = [
  "What data do we have?",
  "How does the analysis work?",
  "Who is on the team?",
  "What steps should I take first?",
];

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="mt-2 mb-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {processInline(line.slice(4))}
        </p>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="mt-2 mb-1 font-bold">
          {processInline(line.slice(3))}
        </p>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <p key={i} className="mt-2 mb-1 text-base font-bold">
          {processInline(line.slice(2))}
        </p>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-1.5 pl-1">
          <span className="mt-0.5 text-gray-400">&#x2022;</span>
          <span>{processInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-1.5 pl-1">
            <span className="min-w-[1.2em] text-gray-400">{match[1]}.</span>
            <span>{processInline(match[2])}</span>
          </div>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(<p key={i}>{processInline(line)}</p>);
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function processInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[4]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-navy-mid/30 px-1 py-0.5 text-[0.85em] dark:bg-navy-mid/50"
        >
          {match[4]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default function Raccoon({ mapContext, dashboardData }: Props) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasData = !!dashboardData && dashboardData.image_count > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildHistory = useCallback(
    (msgs: Message[]): { role: string; content: string }[] => {
      return msgs
        .filter((m) => m !== INITIAL_MESSAGE)
        .map((m) => ({ role: m.role, content: m.content }));
    },
    []
  );

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMessage: Message = { role: "user", content: msg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const history = buildHistory(updatedMessages);
      const response = (await chatWithAgent(
        msg,
        mapContext ?? null,
        history.length > 1 ? history.slice(0, -1) : undefined
      )) as { reply: string };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't process that. Make sure the backend is running and the OpenAI key is configured.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const prompts = hasData ? PROMPTS_WITH_DATA : PROMPTS_NO_DATA;

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white dark:border-navy-mid/60 dark:bg-navy-light">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-navy-mid/40">
        <span className="text-xl">🦝</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Raccoon</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {hasData
              ? `${dashboardData.annotation_count} annotations across ${dashboardData.image_count} images`
              : mapContext && mapContext.features.length > 0
                ? `${mapContext.features.length} features loaded`
                : "No data loaded yet"}
          </p>
        </div>
        <span
          className={`ml-auto inline-block h-2 w-2 rounded-full ${
            hasData ? "bg-emerald-500" : "bg-gray-300 dark:bg-navy-mid"
          }`}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-ocean text-white rounded-br-sm"
                  : "bg-gray-100 text-navy dark:bg-navy dark:text-gray-100 rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3 dark:bg-navy">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-ocean/50 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ocean/50 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ocean/50 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {userMessageCount === 0 && (
        <div className="border-t border-gray-100 px-4 py-2 dark:border-navy-mid/30">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Suggested
          </p>
          <div className="flex flex-wrap gap-1.5">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-ocean hover:bg-ocean/10 hover:text-ocean dark:border-navy-mid dark:text-gray-400 dark:hover:border-ocean dark:hover:bg-ocean/10 dark:hover:text-ocean-light"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 px-3 py-3 dark:border-navy-mid/40">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the data..."
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-ocean focus:ring-1 focus:ring-ocean disabled:opacity-50 dark:border-navy-mid dark:bg-navy-light dark:text-gray-100"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="rounded-lg bg-ocean px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ocean-dark disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
