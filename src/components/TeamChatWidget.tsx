import React, { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  X,
  Send,
  Users,
  Hash,
  ArrowLeft,
  Search,
} from "lucide-react";
import { authorizedFetch } from "../utils/supabase";
import type { ChatContact, ChatMessage } from "../types";

interface TeamChatWidgetProps {
  userId: string;
  displayName: string;
  email?: string;
}

const PUBLIC_POLL_MS = 6000;
const THREAD_POLL_MS = 4000;

const lastSeenKey = (userId: string) => `archive_chat_last_seen_${userId}`;

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

export const TeamChatWidget: React.FC<TeamChatWidgetProps> = ({
  userId,
  displayName,
  email,
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"public" | "dm">("public");
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [contactQuery, setContactQuery] = useState("");
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [publicUnread, setPublicUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const senderName = displayName || email || "Teammate";

  const getLastSeen = () => {
    try {
      return Number(localStorage.getItem(lastSeenKey(userId)) || 0);
    } catch {
      return 0;
    }
  };
  const markSeenNow = () => {
    try {
      localStorage.setItem(lastSeenKey(userId), String(Date.now()));
    } catch {
      /* ignore storage failures (private browsing, etc.) */
    }
    setPublicUnread(0);
  };

  // Background badge check for the public channel, independent of whether the panel is open.
  useEffect(() => {
    let cancelled = false;
    const checkUnread = () => {
      authorizedFetch("/api/chat/messages?channel=public")
        .then((res) => res.json())
        .then((data: ChatMessage[]) => {
          if (cancelled || !Array.isArray(data)) return;
          if (open && tab === "public") {
            setMessages(data);
            markSeenNow();
            return;
          }
          const lastSeen = getLastSeen();
          const unread = data.filter(
            (m) =>
              m.senderId !== userId &&
              new Date(m.createdAt).getTime() > lastSeen,
          ).length;
          setPublicUnread(unread);
        })
        .catch(() => {});
    };
    checkUnread();
    const interval = setInterval(checkUnread, PUBLIC_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  // Load the contact directory once the Direct tab is visited.
  useEffect(() => {
    if (!open || tab !== "dm") return;
    authorizedFetch("/api/chat/contacts")
      .then((res) => res.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [open, tab]);

  // Poll whichever thread is currently in view.
  useEffect(() => {
    if (!open) return;
    if (tab === "public") return; // handled by the unread-check effect above
    if (!activeContact) return;

    let cancelled = false;
    const loadThread = () => {
      authorizedFetch(
        `/api/chat/messages?channel=dm&with=${encodeURIComponent(activeContact.id)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) setMessages(data);
        })
        .catch(() => {});
    };
    loadThread();
    const interval = setInterval(loadThread, THREAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, tab, activeContact]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> =
        tab === "public"
          ? { channel: "public", text }
          : {
              channel: "dm",
              recipientId: activeContact?.id,
              recipientName: activeContact?.displayName,
              text,
            };
      const res = await authorizedFetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages((current) => [...current, saved]);
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    (c.displayName || c.email || "")
      .toLowerCase()
      .includes(contactQuery.toLowerCase()),
  );

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-120 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-zinc-900/70">
            <div className="flex items-center bg-zinc-900 rounded-2xl p-1 border border-white/5">
              <button
                onClick={() => {
                  setTab("public");
                  setActiveContact(null);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                  tab === "public"
                    ? "bg-yellow-400 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Public</span>
              </button>
              <button
                onClick={() => setTab("dm")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                  tab === "dm"
                    ? "bg-yellow-400 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Direct</span>
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-white/10 rounded-2xl border border-white/5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {tab === "dm" && !activeContact ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={contactQuery}
                    onChange={(e) => setContactQuery(e.target.value)}
                    placeholder="Search teammates..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-8 pr-3 py-1.5 text-xs text-zinc-200"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">
                    No teammates found.
                  </p>
                ) : (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setActiveContact(contact);
                        setMessages([]);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left"
                    >
                      <span className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-300 flex items-center justify-center text-[10px] font-bold border border-yellow-400/30 shrink-0">
                        {initials(contact.displayName || contact.email)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-zinc-100 truncate">
                          {contact.displayName || contact.email}
                        </span>
                        <span className="block text-[10px] text-zinc-500 uppercase font-mono">
                          {contact.role}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {tab === "dm" && activeContact && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-zinc-900/40">
                  <button
                    onClick={() => setActiveContact(null)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-zinc-200">
                    {activeContact.displayName || activeContact.email}
                  </span>
                </div>
              )}

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
              >
                {messages.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">
                    {tab === "public"
                      ? "No messages yet. Say hello to the team."
                      : "No messages yet. Start the conversation."}
                  </p>
                ) : (
                  messages.map((message) => {
                    const mine = message.senderId === userId;
                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                      >
                        <span className="text-[10px] text-zinc-500 font-mono mb-0.5">
                          {mine ? "You" : message.senderName} ·{" "}
                          {formatTime(message.createdAt)}
                        </span>
                        <span
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                            mine
                              ? "bg-yellow-400 text-zinc-950"
                              : "bg-zinc-900 border border-white/10 text-zinc-200"
                          }`}
                        >
                          {message.text}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-white/5 p-3 flex items-end gap-2">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    tab === "public"
                      ? "Message the whole team..."
                      : `Message ${activeContact?.displayName || "teammate"}...`
                  }
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200 resize-none max-h-24"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className="p-2.5 bg-yellow-400 text-zinc-950 rounded-2xl hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) markSeenNow();
        }}
        className="relative p-4 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 rounded-full shadow-2xl transition-all cursor-pointer"
        title={`Chatting as ${senderName}`}
      >
        <MessageSquare className="w-5 h-5" />
        {!open && publicUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-zinc-950">
            {publicUnread > 9 ? "9+" : publicUnread}
          </span>
        )}
      </button>
    </div>
  );
};
