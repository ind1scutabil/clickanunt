"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import {
  fetchWithAuthRefresh,
  postJsonWithAuthRefresh,
  syncSessionFromCookies,
} from "@/lib/admin-fetch";
import { connectMessageEventsSse } from "@/lib/message-events-sse-client";
import { displayNameForMessagingUser } from "@/lib/messaging-display";

interface Message {
  id: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
    email?: string | null;
    role?: string | null;
  };
  recipient: {
    id: string;
    name: string;
  };
  listing?: {
    id: string;
    title: string;
  };
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    avatar?: string;
    email?: string | null;
    role?: string | null;
  };
  listing?: {
    id: string;
    title: string;
  };
  lastMessage: any;
  unreadCount: number;
  lastMessageAt: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  /** Lista din stânga: nu așteptăm încărcarea mesajelor primei conversații */
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  /** Firul activ: mesaje în curs de încărcare (după selectare / auto-select) */
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const messagesRequestSeqRef = useRef(0);
  const lastAppliedMessagesSeqRef = useRef(0);
  const isSendingRef = useRef(false);

  /** Rulare în paralel cu SSE: backup 3s pentru sync instant dacă evenimentul rată */
  const CONV_POLL_MS = 3_000;
  const MSG_POLL_MS = 3_000;

  const conversationsPollingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesPollingRef = useRef<NodeJS.Timeout | null>(null);
  /** SSE activ → nu mai pornim polling în handleSelectConversation */
  const sseLiveRef = useRef(false);
  const fetchMessagesRefForSse = useRef<
    (userId: string, listingId?: string, conversationId?: string) => Promise<void>
  >(async () => {});

  const sseHandlerRef = useRef<{
    fetchConversations: (opts?: { startPolling?: boolean }) => Promise<void>;
  }>({
    fetchConversations: async () => {},
  });
  const startPollingFallbackRef = useRef<() => void>(() => {});

  const clearFallbackPolling = () => {
    if (conversationsPollingRef.current) {
      clearInterval(conversationsPollingRef.current);
      conversationsPollingRef.current = null;
    }
    if (messagesPollingRef.current) {
      clearInterval(messagesPollingRef.current);
      messagesPollingRef.current = null;
    }
  };

  const startPollingFallback = () => {
    if (conversationsPollingRef.current) return;
    conversationsPollingRef.current = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const response = await fetchWithAuthRefresh("/api/messages/conversations");
        if (response.ok) {
          const data = await response.json();
          const conversationsList: Conversation[] = Array.isArray(data)
            ? data
            : data.conversations || [];
          setConversations(conversationsList);
          const sel = selectedConversationRef.current;
          if (!sel && conversationsList.length > 0) {
            void handleSelectConversation(conversationsList[0]);
          } else if (sel && conversationsList.length > 0) {
            const fresh = conversationsList.find((c) => c.id === sel.id);
            if (fresh) {
              setSelectedConversation(fresh);
              selectedConversationRef.current = fresh;
            }
          }
        }
      } catch {
        /* ignore */
      }
    }, CONV_POLL_MS);

    const sel = selectedConversationRef.current;
    if (sel && !messagesPollingRef.current) {
      messagesPollingRef.current = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        const cur = selectedConversationRef.current;
        if (!cur) return;
        if (isSendingRef.current) return;
        void fetchMessages(cur.otherParticipant.id, cur.listing?.id, cur.id, "poll");
      }, MSG_POLL_MS);
    }
  };

  startPollingFallbackRef.current = startPollingFallback;

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.replace('/auth/login?redirect=/messages');
      return;
    }

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as { id?: string; userId?: string };
        setCurrentUserId(
          typeof user?.id === "string"
            ? user.id
            : typeof user?.userId === "string"
              ? user.userId
              : null
        );
      } catch {
        setCurrentUserId(null);
      }
    }

    void fetchConversations({ startPolling: true });

    return () => {
      clearFallbackPolling();
    };
  }, [router]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    const newestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

    if (!newestMessageId) {
      lastMessageIdRef.current = null;
      return;
    }

    // Only scroll if:
    // 1. A NEW message was actually added (not just a re-render)
    // 2. AND the user is already at or near the bottom (within 100px)
    if (newestMessageId !== lastMessageIdRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = 
          container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }
      lastMessageIdRef.current = newestMessageId;
    }
  }, [messages]);

  const fetchConversations = async (opts?: { startPolling?: boolean }) => {
    const startPolling = opts?.startPolling === true;
    try {
      const response = await fetchWithAuthRefresh("/api/messages/conversations");

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      const conversationsList: Conversation[] = Array.isArray(data)
        ? data
        : data.conversations || [];
      setConversations(conversationsList);
      setIsLoadingConversations(false);

      const sel = selectedConversationRef.current;
      if (!sel && conversationsList.length > 0) {
        void handleSelectConversation(conversationsList[0]);
      } else if (sel && conversationsList.length > 0) {
        const fresh = conversationsList.find((c) => c.id === sel.id);
        const thread = fresh ?? sel;
        if (fresh) {
          setSelectedConversation(fresh);
          selectedConversationRef.current = fresh;
        }
        void fetchMessages(
          thread.otherParticipant.id,
          thread.listing?.id,
          thread.id,
          "manual"
        );
      }
    } catch (err) {
      console.error("[Messages] Fetch error:", err);
      setIsLoadingConversations(false);
    }

    if (startPolling && !conversationsPollingRef.current) {
      conversationsPollingRef.current = setInterval(async () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        try {
          const response = await fetchWithAuthRefresh("/api/messages/conversations");
          if (response.ok) {
            const data = await response.json();
            const conversationsList: Conversation[] = Array.isArray(data)
              ? data
              : data.conversations || [];
            setConversations(conversationsList);
            const sel = selectedConversationRef.current;
            if (!sel && conversationsList.length > 0) {
              void handleSelectConversation(conversationsList[0]);
            } else if (sel && conversationsList.length > 0) {
              const fresh = conversationsList.find((c) => c.id === sel.id);
              if (fresh) {
                setSelectedConversation(fresh);
                selectedConversationRef.current = fresh;
              }
            }
          }
        } catch {
          /* polling */
        }
      }, CONV_POLL_MS);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    selectedConversationRef.current = conversation;
    setMessages([]);
    setIsLoadingThread(true);
    try {
      await fetchMessages(conversation.otherParticipant.id, conversation.listing?.id, conversation.id);
    } finally {
      setIsLoadingThread(false);
    }

    if (messagesPollingRef.current) {
      clearInterval(messagesPollingRef.current);
    }
    messagesPollingRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const currentConversation = selectedConversationRef.current;
      if (!currentConversation) return;
      if (isSendingRef.current) return;
      fetchMessages(
        currentConversation.otherParticipant.id,
        currentConversation.listing?.id,
        currentConversation.id,
        "poll"
      );
    }, MSG_POLL_MS);
  };

  const fetchMessages = async (
    userId: string,
    listingId?: string,
    conversationId?: string,
    source: 'poll' | 'manual' = 'manual'
  ) => {
    if (source === 'poll' && isSendingRef.current) {
      return;
    }

    const requestSeq = ++messagesRequestSeqRef.current;

    try {
      const params = new URLSearchParams();
      if (listingId) params.set('listingId', listingId);
      if (conversationId) params.set('conversationId', conversationId);
      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await fetchWithAuthRefresh(`/api/messages/${userId}${query}`);

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      const nextMessages = Array.isArray(data)
        ? data
        : Array.isArray((data as { messages?: Message[] }).messages)
          ? (data as { messages: Message[] }).messages
          : [];

      if (requestSeq < lastAppliedMessagesSeqRef.current) {
        return;
      }

      const currentConversation = selectedConversationRef.current;
      if (!currentConversation) {
        return;
      }

      // Ignore responses for an older selected conversation
      if (conversationId && currentConversation.id !== conversationId) {
        return;
      }

      if (!conversationId && currentConversation.otherParticipant.id !== userId) {
        return;
      }

      lastAppliedMessagesSeqRef.current = requestSeq;

      setMessages((prevMessages) => {
        const pendingOptimisticMessages = prevMessages.filter((msg) => msg.id.startsWith('temp-'));

        const mergedMessages = [...nextMessages];

        for (const tempMessage of pendingOptimisticMessages) {
          const hasServerConfirmedEquivalent = nextMessages.some((serverMessage: Message) => {
            if (!currentUserId) return false;

            const isSameSender = serverMessage.sender.id === currentUserId;
            const isSameContent = serverMessage.content === tempMessage.content;
            const serverTs = new Date(serverMessage.createdAt).getTime();
            const tempTs = new Date(tempMessage.createdAt).getTime();
            const isCloseInTime = Math.abs(serverTs - tempTs) < 30000;

            return isSameSender && isSameContent && isCloseInTime;
          });

          if (!hasServerConfirmedEquivalent) {
            mergedMessages.push(tempMessage);
          }
        }

        mergedMessages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const prevLast = prevMessages[prevMessages.length - 1];
        const nextLast = mergedMessages[mergedMessages.length - 1];

        const isSameSnapshot =
          prevMessages.length === mergedMessages.length &&
          prevLast?.id === nextLast?.id &&
          prevLast?.updatedAt === nextLast?.updatedAt;

        return isSameSnapshot ? prevMessages : mergedMessages;
      });
    } catch (err) {
      console.error('[Messages] Error fetching messages:', err);
    }
  };

  sseHandlerRef.current = { fetchConversations };

  fetchMessagesRefForSse.current = (userId, listingId, conversationId) =>
    fetchMessages(userId, listingId, conversationId, "manual");

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) return;

    const dispose = connectMessageEventsSse({
      onOpen: () => {
        sseLiveRef.current = true;
      },
      onTransportEnded: () => {
        sseLiveRef.current = false;
        startPollingFallbackRef.current();
      },
      onMessage: (ev) => {
        let d: { type?: string };
        try {
          d = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (d.type !== "message") return;
        void sseHandlerRef.current.fetchConversations({ startPolling: false });
        const sel = selectedConversationRef.current;
        if (sel) {
          void fetchMessagesRefForSse.current(
            sel.otherParticipant.id,
            sel.listing?.id,
            sel.id
          );
        }
      },
    });

    return () => {
      dispose();
      sseLiveRef.current = false;
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const activeConversation = selectedConversationRef.current || selectedConversation;
    
    if (!newMessage.trim() || !activeConversation) {
      return;
    }

    const conversationSnapshot = activeConversation;
    const trimmedContent = newMessage.trim();
    const optimisticMessageId = `temp-${Date.now()}`;

    console.log('[SEND] Starting message send - temp ID:', optimisticMessageId);

    const optimisticMessage: Message = {
      id: optimisticMessageId,
      sender: {
        id: currentUserId || 'me',
        name: 'Tu',
      },
      recipient: {
        id: conversationSnapshot.otherParticipant.id,
        name: conversationSnapshot.otherParticipant.name,
      },
      listing: conversationSnapshot.listing,
      content: trimmedContent,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNewMessage("");
    setMessages((prev) => [...prev, optimisticMessage]);
    console.log('[SEND] Optimistic message added to state');

    // Ignore any in-flight polling responses that started before this send
    const sendBarrierSeq = ++messagesRequestSeqRef.current;
    lastAppliedMessagesSeqRef.current = sendBarrierSeq;

    setIsSending(true);
    try {
      await syncSessionFromCookies();
      const response = await postJsonWithAuthRefresh(
        `/api/messages/${conversationSnapshot.otherParticipant.id}`,
        {
          content: trimmedContent,
          listingId: conversationSnapshot.listing?.id,
          conversationId: conversationSnapshot.id,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SEND] ❌ Response not ok:', response.status, errorData);
        throw new Error(errorData?.error || 'Failed to send message');
      }

      const data = await response.json();
      

      const resolvedConversationId = data?.conversationId || conversationSnapshot.id;

      if (data?.message) {
        setMessages((prev) => {
          const hasTemp = prev.some((msg) => msg.id === optimisticMessageId);
          const hasServerMessage = prev.some((msg) => msg.id === data.message.id);

          // Keep optimistic message until server snapshot confirms it.
          // Replacing temp immediately can cause disappearance if a concurrent
          // fetch returns an older snapshot and overwrites local state.
          let next = prev;

          if (!hasTemp && !hasServerMessage) {
            next = [...prev, data.message];
          }

          return next.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }

      if (resolvedConversationId !== conversationSnapshot.id) {
        setSelectedConversation((prev) => {
          const next = prev ? { ...prev, id: resolvedConversationId } : prev;
          selectedConversationRef.current = next;
          return next;
        });
      }

      await fetchConversations({ startPolling: false });
    } catch (err) {
      console.error('[Messaging] Error sending message:', err);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessageId));
      setNewMessage(trimmedContent);
      alert('Eroare la trimiterea mesajului. Te rog încearcă din nou.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="enterprise-page-bg enterprise-mesh flex min-h-screen flex-col text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Inbox
          </p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
            <span className="text-white">Mesajele </span>
            <span className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
              mele
            </span>
          </h1>
          <p className="text-[var(--text-secondary)]">Comunică cu cumpărători și vânzători</p>
        </header>

        <div className="grid h-[min(70vh,640px)] grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {/* Conversations List */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 shadow-[var(--shadow-md)] backdrop-blur-sm">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Conversații
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoadingConversations ? (
                <div className="space-y-3 p-4" aria-busy="true" aria-label="Se încarcă conversațiile">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl border border-white/[0.04] bg-white/[0.06] p-4"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-white/[0.08]" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-3.5 w-2/3 rounded bg-white/[0.1]" />
                          <div className="h-2.5 w-1/3 rounded bg-white/[0.06]" />
                        </div>
                      </div>
                      <div className="h-2.5 w-full rounded bg-white/[0.05]" />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">
                  <p>Nu există conversații încă.</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full border-b border-white/[0.05] px-4 py-4 text-left transition ${
                      selectedConversation?.id === conv.id
                        ? "bg-[var(--accent-primary)]/12 ring-1 ring-inset ring-[var(--accent-primary)]/35"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-3">
                      {conv.otherParticipant.avatar ? (
                        <img
                          src={conv.otherParticipant.avatar}
                          alt={conv.otherParticipant.name}
                          className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-dark)] text-sm font-semibold text-white">
                          {displayNameForMessagingUser(conv.otherParticipant).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">
                          {displayNameForMessagingUser(conv.otherParticipant)}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="mt-1 inline-flex rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            {conv.unreadCount} nou
                          </span>
                        )}
                      </div>
                    </div>
                    {conv.listing && (
                      <p className="mb-1 truncate text-xs text-[var(--text-tertiary)]">
                        <span className="text-[var(--text-muted)]">Re:</span> {conv.listing.title}
                        <span className="text-[var(--text-muted)]"> · #{conv.listing.id.slice(-6)}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {new Date(conv.lastMessageAt).toLocaleString("ro-RO")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 shadow-[var(--shadow-md)] backdrop-blur-sm md:col-span-2">
            {selectedConversation ? (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {selectedConversation.otherParticipant.avatar ? (
                      <img
                        src={selectedConversation.otherParticipant.avatar}
                        alt={selectedConversation.otherParticipant.name}
                        className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-dark)] text-sm font-semibold text-white">
                        {displayNameForMessagingUser(selectedConversation.otherParticipant).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {displayNameForMessagingUser(selectedConversation.otherParticipant)}
                      </p>
                      {selectedConversation.listing && (
                        <p className="truncate text-xs text-[var(--text-tertiary)]">
                          {selectedConversation.listing.title}{" "}
                          <span className="text-[var(--text-muted)]">· #{selectedConversation.listing.id.slice(-6)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/users/${selectedConversation.otherParticipant.id}/profile`}
                    className="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    Profil
                  </Link>
                </div>

                <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                  {isLoadingThread && messages.length === 0 ? (
                    <div className="space-y-4 py-6" aria-busy="true" aria-label="Se încarcă mesajele">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`flex flex-col ${i % 2 === 0 ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`h-14 max-w-[min(100%,18rem)] animate-pulse rounded-2xl ${
                              i % 2 === 0 ? "bg-[var(--accent-primary)]/25" : "bg-white/[0.08]"
                            }`}
                            style={{ width: `${60 + (i % 3) * 12}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[var(--text-tertiary)]">
                      <p>Niciun mesaj încă. Începe conversația.</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender.id === currentUserId ? "items-end" : "items-start"}`}
                      >
                        {msg.sender.id !== currentUserId && (
                          <span className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            {displayNameForMessagingUser(msg.sender)}
                          </span>
                        )}
                        <div
                          className={`max-w-[min(100%,20rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.sender.id === currentUserId
                              ? "bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-dark)] text-white shadow-[var(--shadow-sm)]"
                              : "border border-white/[0.08] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className="mt-2 text-[10px] font-medium opacity-70">
                            {new Date(msg.createdAt).toLocaleTimeString("ro-RO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-3 border-t border-white/[0.06] bg-[var(--bg-primary)]/40 px-5 py-4"
                  id="message-form"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                    }}
                    placeholder="Scrie un mesaj…"
                    className="enterprise-input flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)]"
                    id="message-input"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    id="send-button"
                  >
                    {isSending ? "Se trimite…" : "Trimite"}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-sm text-[var(--text-tertiary)]">
                <p>
                  {isLoadingConversations
                    ? "Se încarcă conversațiile…"
                    : "Selectează o conversație din listă"}
                </p>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex text-sm font-semibold text-[var(--accent-secondary)] transition hover:text-white"
        >
          ← Înapoi la dashboard
        </Link>
      </div>
    </div>
  );
}
