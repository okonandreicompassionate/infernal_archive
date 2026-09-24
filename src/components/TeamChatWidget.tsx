import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Send,
  Hash,
  ArrowLeft,
  Search,
  Paperclip,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import {
  authorizedFetch,
  supabase,
  uploadArchiveImage,
} from "../utils/supabase";
import type { ChatContact, ChatDmSummary, ChatMessage } from "../types";

interface TeamChatWidgetProps {
  userId: string;
  displayName: string;
  email?: string;
}

// Realtime (websocket) delivers new messages instantly; these polls are just a
// safety net in case a connection drops or Supabase isn't configured.
const PUBLIC_POLL_MS = 20000;
const THREAD_POLL_MS = 12000;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024; // 15MB, matches other upload flows in the app

type ActiveThread = { kind: "public" } | { kind: "dm"; contact: ChatContact };

const publicSeenKey = (userId: string) => `archive_chat_seen_public_${userId}`;
const dmSeenKey = (userId: string, contactId: string) =>
  `archive_chat_seen_dm_${userId}_${contactId}`;

const readStoredTime = (key: string) => {
  try {
    return Number(localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
};
const writeStoredTime = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore storage failures (private browsing, etc.) */
  }
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

// Realtime rows come straight from Postgres (snake_case); map them to the
// same camelCase shape the REST API returns.
const mapRealtimeRow = (row: any): ChatMessage => ({
  id: row.id,
  channel: row.channel,
  senderId: row.sender_id,
  senderName: row.sender_name,
  recipientId: row.recipient_id,
  recipientName: row.recipient_name,
  text: row.text,
  attachmentUrl: row.attachment_url,
  attachmentType: row.attachment_type,
  attachmentName: row.attachment_name,
  createdAt: row.created_at,
});

export const TeamChatWidget: React.FC<TeamChatWidgetProps> = ({
  userId,
  displayName,
  email,
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "thread">("list");
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [dmSummaries, setDmSummaries] = useState<ChatDmSummary[]>([]);
  const [listQuery, setListQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [attachError, setAttachError] = useState("");
  const [publicUnread, setPublicUnread] = useState(0);
  const [publicLastMessage, setPublicLastMessage] =
    useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const senderName = displayName || email || "Teammate";

  // Refs so the realtime subscription (set up once) always reads the latest
  // view/thread without needing to resubscribe on every render.
  const openRef = useRef(open);
  const viewRef = useRef(view);
  const activeThreadRef = useRef(activeThread);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  // Instant delivery over Supabase Realtime (websocket), active for the whole
  // session so badges update even while the panel is collapsed. RLS still
  // governs which rows a given connection is allowed to receive.
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`chat-widget-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const message = mapRealtimeRow(payload.new);
          if (message.channel === "public") {
            setPublicLastMessage(message);
            const viewingPublic =
              openRef.current &&
              viewRef.current === "thread" &&
              activeThreadRef.current?.kind === "public";
            if (viewingPublic) {
              setMessages((current) =>
                current.some((m) => m.id === message.id)
                  ? current
                  : [...current, message],
              );
              writeStoredTime(publicSeenKey(userId), Date.now());
              setPublicUnread(0);
            } else if (message.senderId !== userId) {
              setPublicUnread((count) => count + 1);
            }
            return;
          }

          const otherId =
            message.senderId === userId
              ? message.recipientId
              : message.senderId;
          if (!otherId) return;
          setDmSummaries((current) => [
            {
              contactId: otherId,
              contactName:
                message.senderId === userId
                  ? message.recipientName || ""
                  : message.senderName,
              lastMessage: message.text,
              lastMessageAt: message.createdAt,
              lastSenderId: message.senderId,
              hasAttachment: Boolean(message.attachmentUrl),
            },
            ...current.filter((s) => s.contactId !== otherId),
          ]);
          const viewingThisDm =
            openRef.current &&
            viewRef.current === "thread" &&
            activeThreadRef.current?.kind === "dm" &&
            activeThreadRef.current.contact.id === otherId;
          if (viewingThisDm) {
            setMessages((current) =>
              current.some((m) => m.id === message.id)
                ? current
                : [...current, message],
            );
            writeStoredTime(dmSeenKey(userId, otherId), Date.now());
          }
        },
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [userId]);

  // Background badge check for the public channel, independent of whether the panel is open.
  useEffect(() => {
    let cancelled = false;
    const checkPublic = () => {
      authorizedFetch("/api/chat/messages?channel=public")
        .then((res) => res.json())
        .then((data: ChatMessage[]) => {
          if (cancelled || !Array.isArray(data)) return;
          setPublicLastMessage(data[data.length - 1] || null);
          const isViewingPublic =
            open && view === "thread" && activeThread?.kind === "public";
          if (isViewingPublic) {
            setMessages(data);
            writeStoredTime(publicSeenKey(userId), Date.now());
            setPublicUnread(0);
            return;
          }
          const lastSeen = readStoredTime(publicSeenKey(userId));
          setPublicUnread(
            data.filter(
              (m) =>
                m.senderId !== userId &&
                new Date(m.createdAt).getTime() > lastSeen,
            ).length,
          );
        })
        .catch(() => {});
    };
    checkPublic();
    const interval = setInterval(checkPublic, PUBLIC_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view, activeThread]);

  // Background contact + DM preview polling, needed for the chat list and unread badges.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadDirectory = () => {
      Promise.all([
        authorizedFetch("/api/chat/contacts").then((res) => res.json()),
        authorizedFetch("/api/chat/dm-summary").then((res) => res.json()),
      ])
        .then(([contactData, summaryData]) => {
          if (cancelled) return;
          if (Array.isArray(contactData)) setContacts(contactData);
          if (Array.isArray(summaryData)) setDmSummaries(summaryData);
        })
        .catch(() => {});
    };
    loadDirectory();
    const interval = setInterval(loadDirectory, PUBLIC_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open]);

  // Poll whichever thread is currently in view.
  useEffect(() => {
    if (!open || view !== "thread" || !activeThread) return;
    let cancelled = false;
    const loadThread = () => {
      const url =
        activeThread.kind === "public"
          ? "/api/chat/messages?channel=public"
          : `/api/chat/messages?channel=dm&with=${encodeURIComponent(activeThread.contact.id)}`;
      authorizedFetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled || !Array.isArray(data)) return;
          setMessages(data);
          if (activeThread.kind === "public") {
            writeStoredTime(publicSeenKey(userId), Date.now());
            setPublicUnread(0);
          } else {
            writeStoredTime(
              dmSeenKey(userId, activeThread.contact.id),
              Date.now(),
            );
          }
        })
        .catch(() => {});
    };
    loadThread();
    const interval = setInterval(loadThread, THREAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, view, activeThread, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const openThread = (thread: ActiveThread) => {
    setActiveThread(thread);
    setMessages([]);
    setDraft("");
    setPendingFile(null);
    setAttachError("");
    setView("thread");
  };

  const handleFilePick = (file: File | undefined) => {
    setAttachError("");
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachError("That file is larger than 15MB. Pick something smaller.");
      return;
    }
    setPendingFile(file);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if ((!text && !pendingFile) || sending || !activeThread) return;
    setSending(true);
    setAttachError("");
    try {
      let attachmentUrl: string | null = null;
      let attachmentType: "image" | "file" | null = null;
      let attachmentName: string | null = null;

      if (pendingFile) {
        const upload = await uploadArchiveImage(pendingFile, "chat");
        if (upload.error || !upload.url) {
          setAttachError("The attachment could not be uploaded.");
          setSending(false);
          return;
        }
        attachmentUrl = upload.url;
        attachmentType = pendingFile.type.startsWith("image/")
          ? "image"
          : "file";
        attachmentName = pendingFile.name;
      }

      const payload: Record<string, unknown> =
        activeThread.kind === "public"
          ? {
              channel: "public",
              text,
              attachmentUrl,
              attachmentType,
              attachmentName,
            }
          : {
              channel: "dm",
              recipientId: activeThread.contact.id,
              recipientName: activeThread.contact.displayName,
              text,
              attachmentUrl,
              attachmentType,
              attachmentName,
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
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const result = await res.json().catch(() => ({}));
        setAttachError(result.error || "The message could not be sent.");
      }
    } finally {
      setSending(false);
    }
  };

  const isDmUnread = (contactId: string, summary?: ChatDmSummary) => {
    if (!summary || summary.lastSenderId === userId) return false;
    const seen = readStoredTime(dmSeenKey(userId, contactId));
    return new Date(summary.lastMessageAt).getTime() > seen;
  };

  const totalUnread =
    publicUnread +
    dmSummaries.filter((summary) => isDmUnread(summary.contactId, summary))
      .length;

  const listEntries = useMemo(() => {
    const summaryByContact = new Map(dmSummaries.map((s) => [s.contactId, s]));
    const dmEntries = contacts.map((contact) => {
      const summary = summaryByContact.get(contact.id);
      return {
        contact,
        summary,
        unread: isDmUnread(contact.id, summary),
        sortKey: summary ? new Date(summary.lastMessageAt).getTime() : 0,
      };
    });
    dmEntries.sort((a, b) => b.sortKey - a.sortKey);
    const query = listQuery.trim().toLowerCase();
    return query
      ? dmEntries.filter((entry) =>
          (entry.contact.displayName || entry.contact.email)
            .toLowerCase()
            .includes(query),
        )
      : dmEntries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, dmSummaries, listQuery]);

  const previewFor = (message: ChatMessage | null) => {
    if (!message) return "No messages yet.";
    if (message.attachmentUrl)
      return message.text || `📎 ${message.attachmentName || "Attachment"}`;
    return message.text;
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-120 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-600">
            {view === "thread" && (
              <button
                onClick={() => {
                  setView("list");
                  setActiveThread(null);
                }}
                className="p-1 text-white/90 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {view === "thread" && activeThread && (
              <span className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {activeThread.kind === "public" ? (
                  <Hash className="w-4 h-4" />
                ) : (
                  initials(
                    activeThread.contact.displayName ||
                      activeThread.contact.email,
                  )
                )}
              </span>
            )}
            <span className="flex-1 text-sm font-semibold text-white truncate">
              {view === "list"
                ? "Team Chat"
                : activeThread?.kind === "public"
                  ? "Team Chat (Public)"
                  : activeThread?.contact.displayName ||
                    activeThread?.contact.email}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 text-white/90 hover:text-white hover:bg-white/10 rounded-2xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {view === "list" ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
              <div className="p-3 border-b border-white/5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={listQuery}
                    onChange={(e) => setListQuery(e.target.value)}
                    placeholder="Search teammates..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-8 pr-3 py-1.5 text-xs text-zinc-200"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Public team channel, always pinned to the top */}
                <button
                  onClick={() => openThread({ kind: "public" })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left border-b border-white/5"
                >
                  <span className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30 shrink-0">
                    <Hash className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-100">
                        Team Chat
                      </span>
                      {publicLastMessage && (
                        <span className="text-[10px] text-zinc-500">
                          {formatTime(publicLastMessage.createdAt)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="block text-[11px] text-zinc-400 truncate">
                        {previewFor(publicLastMessage)}
                      </span>
                      {publicUnread > 0 && (
                        <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {publicUnread > 9 ? "9+" : publicUnread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>

                {listEntries.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">
                    No teammates found.
                  </p>
                ) : (
                  listEntries.map(({ contact, summary, unread }) => (
                    <button
                      key={contact.id}
                      onClick={() => openThread({ kind: "dm", contact })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer text-left"
                    >
                      <span className="w-10 h-10 rounded-full bg-yellow-400/20 text-yellow-300 flex items-center justify-center text-[10px] font-bold border border-yellow-400/30 shrink-0">
                        {initials(contact.displayName || contact.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between">
                          <span
                            className={`text-xs truncate ${unread ? "font-bold text-zinc-100" : "font-medium text-zinc-200"}`}
                          >
                            {contact.displayName || contact.email}
                          </span>
                          {summary && (
                            <span className="text-[10px] text-zinc-500">
                              {formatTime(summary.lastMessageAt)}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={`block text-[11px] truncate ${unread ? "text-zinc-200" : "text-zinc-500"}`}
                          >
                            {summary
                              ? summary.hasAttachment
                                ? `📎 ${summary.lastMessage || "Attachment"}`
                                : summary.lastMessage
                              : "Start a conversation"}
                          </span>
                          {unread && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-zinc-950"
              >
                {messages.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">
                    {activeThread?.kind === "public"
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
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed space-y-1.5 ${
                            mine
                              ? "bg-emerald-600 text-white"
                              : "bg-zinc-900 border border-white/10 text-zinc-200"
                          }`}
                        >
                          {message.attachmentUrl &&
                            (message.attachmentType === "image" ? (
                              <a
                                href={message.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={message.attachmentUrl}
                                  alt={message.attachmentName || "Attachment"}
                                  className="max-h-48 rounded-xl object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={message.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
                                  mine ? "bg-black/15" : "bg-black/30"
                                }`}
                              >
                                <FileText className="w-4 h-4 shrink-0" />
                                <span className="truncate flex-1">
                                  {message.attachmentName || "Attachment"}
                                </span>
                                <Download className="w-3.5 h-3.5 shrink-0" />
                              </a>
                            ))}
                          {message.text && <span>{message.text}</span>}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-white/5 bg-zinc-950">
                {attachError && (
                  <p className="px-3 pt-2 text-[10px] text-red-400">
                    {attachError}
                  </p>
                )}
                {pendingFile && (
                  <div className="mx-3 mt-2 flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-1.5">
                    {pendingFile.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(pendingFile)}
                        alt="Attachment preview"
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    ) : (
                      <FileText className="w-4 h-4 text-zinc-400" />
                    )}
                    <span className="flex-1 text-[11px] text-zinc-300 truncate">
                      {pendingFile.name}
                    </span>
                    <button
                      onClick={() => {
                        setPendingFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="p-0.5 text-zinc-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="p-3 flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFilePick(e.target.files?.[0])}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-zinc-400 hover:text-emerald-400 bg-zinc-900 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-colors"
                    title="Attach an image or file"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
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
                      activeThread?.kind === "public"
                        ? "Message the whole team..."
                        : `Message ${activeThread?.contact.displayName || "teammate"}...`
                    }
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200 resize-none max-h-24"
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!draft.trim() && !pendingFile) || sending}
                    className="p-2.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {sending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-2xl transition-all cursor-pointer hover:scale-105"
        title={`Chatting as ${senderName}`}
      >
        <MessageCircle className="w-6 h-6" fill="currentColor" />
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-zinc-950">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
};
