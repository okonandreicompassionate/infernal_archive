import React, { useState } from "react";
import { Send, Bot, User, Globe } from "lucide-react";

export const AILorekeeperChat: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Ask about characters, relationships, events, and established story facts in your archive.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/lorekeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || data.error || "No response.",
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error communicating with Lorekeeper AI backend.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lorekeeper-page max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="border-b border-white/5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight font-sans flex items-center space-x-2">
            <Bot className="w-6 h-6 text-yellow-400" />
            <span>AI Lorekeeper Assistant</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Search established story facts and continuity notes.
          </p>
        </div>
      </div>

      {/* Chat Box */}
      <div className="lorekeeper-chat bg-zinc-900/70 backdrop-blur-xl border border-white/5 rounded-2xl p-4 min-h-[420px] max-h-[560px] flex flex-col justify-between shadow-2xl">
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center flex-shrink-0 text-yellow-400 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-xl p-3 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-yellow-400 text-zinc-950 rounded-br-none"
                    : "bg-zinc-900 border border-white/5 text-zinc-200 rounded-bl-none shadow-sm"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-zinc-300 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl text-xs text-zinc-400">
                Reviewing archive records...
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className="mt-4 flex gap-2 pt-3 border-t border-white/5"
        >
          <input
            type="text"
            placeholder="Ask Lorekeeper (e.g. 'Who is Archer?', 'What happened during the Eclipse Incident?')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-semibold px-4 py-2.5 rounded-2xl transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
