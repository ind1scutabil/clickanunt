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
import { notifyMessagingInboxSync } from "@/lib/messaging-broadcast-sync";
import { connectMessageEventsSse } from "@/lib/message-events-sse-client";
import { displayNameForMessagingUser } from "@/lib/messaging-display";
import { messagingUserIdsEqual } from "@/lib/messaging-user-id";

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
  const [sendError, setSendError] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<{
    conversation: Conversation;
    content: string;
  } | null>(null);
  const [lastFailedContent, setLastFailedContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const messagesRequestSeqRef = useRef(0);
  const lastAppliedMessagesSeqRef = useRef(0);
  const isSendingRef = useRef(false);

  /** Polling fallback doar dacă SSE nu e stabilit sau a căzut (server single-node pentru pub/sub SSE). */
  const CONV_FALLBACK_MS = 2_500;
  const MSG_FALLBACK_MS = 2_500;
  /** Chiar dacă SSE e „online”, reconciliere ușoară pentru tab-uri/proxy-uri care pierd evente. */
  const CONV_RECONCILE_SLOW_MS = 8_500;
  /** Dacă EventSource nu deschide deloc (~2.6s), activăm polling ca rețea degradată. */
  const SSE_WATCHDOG_MS = 2_600;

  const conversationsPollingRef = useRef<number | null>(null);
  const messagesPollingRef = useRef<number | null>(null);
  const slowConversationSyncRef = useRef<number | null>(null);
  const sseEverOpenedRef = useRef(false);
  /** În browser timer id este numeric — separat de `@types/node` Timeout. */
  const sseWatchdogRef = useRef<number | null>(null);
  /** SSE stabil = fără intervaluri pentru conversații/mesaje (evită dublaje + noise). */
  const sseLiveRef = useRef(false);
  const conversationsPollInFlightRef = useRef(false);
  const messagesPollInFlightRef = useRef(false);
  const lastSendFingerprintRef = useRef<{ t: number; fp: string } | null>(
    null
  );
  const lastInboxNotifyAtRef = useRef(0);
  const fetchMessagesRefForSse = useRef<
    (userId: string, listingId?: string, conversationId?: string) => Promise<void>
  >(async () => {});

  const sseHandlerRef = useRef<{ fetchConversations: () => Promise<void> }>({
    fetchConversations: async () => {},
  });
  const ensurePollingIntervalsRef = useRef<() => void>(() => {});

  const clearFallbackPolling = () => {
    if (conversationsPollingRef.current) {
      clearInterval(conversationsPollingRef.current);
      conversationsPollingRef.current = null;
    }
    if (messagesPollingRef.current) {
      clearInterval(messagesPollingRef.current);
      messagesPollingRef.current = null;
    }
    if (sseWatchdogRef.current) {
      clearTimeout(sseWatchdogRef.current);
      sseWatchdogRef.current = null;
    }
  };

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
        const rawMe =
          typeof user?.id === "string"
            ? user.id
            : typeof user?.userId === "string"
              ? user.userId
              : null;
        setCurrentUserId(rawMe ? rawMe.trim().toLowerCase() : null);
      } catch {
        setCurrentUserId(null);
      }
    }

    sseWatchdogRef.current = window.setTimeout(() => {
      if (!sseEverOpenedRef.current) {
        ensurePollingIntervalsRef.current();
      }
    }, SSE_WATCHDOG_MS) as unknown as number;

    void fetchConversations();

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

      const currentConversation = selectedConversationRef.current;
      if (!currentConversation) {
        return;
      }

      // Înainte de filtrul după seq — răspunsurile întârziate pentru alt fir erau îngropate și puteau pierde snapshot-uri ok
      if (conversationId && currentConversation.id !== conversationId) {
        return;
      }

      if (
        !conversationId &&
        !messagingUserIdsEqual(currentConversation.otherParticipant.id, userId)
      ) {
        return;
      }

      if (requestSeq < lastAppliedMessagesSeqRef.current) {
        return;
      }

      lastAppliedMessagesSeqRef.current = requestSeq;

      setMessages((prevMessages) => {
        const pendingOptimisticMessages = prevMessages.filter((msg) => msg.id.startsWith('temp-'));

        const mergedMessages = [...nextMessages];

        for (const tempMessage of pendingOptimisticMessages) {
          const hasServerConfirmedEquivalent = nextMessages.some((serverMessage: Message) => {
            if (!currentUserId) return false;

            const isSameSender = messagingUserIdsEqual(serverMessage.sender.id, currentUserId);
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

      const now = Date.now();
      if (now - lastInboxNotifyAtRef.current >= 550) {
        lastInboxNotifyAtRef.current = now;
        notifyMessagingInboxSync();
      }
    } catch (err) {
      console.error('[Messages] Error fetching messages:', err);
    }
  };

  const runConversationPoll = async (opts?: { ignoreSse?: boolean }) => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    if (conversationsPollInFlightRef.current) return;
    conversationsPollInFlightRef.current = true;
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
      /* retry next tick */
    } finally {
      conversationsPollInFlightRef.current = false;
    }
  };

  const runMessagesPollTick = async () => {
    const cur = selectedConversationRef.current;
    if (!cur) return;
    if (isSendingRef.current) return;
    if (messagesPollInFlightRef.current) return;
    messagesPollInFlightRef.current = true;
    try {
      await fetchMessages(cur.otherParticipant.id, cur.listing?.id, cur.id, "poll");
    } finally {
      messagesPollInFlightRef.current = false;
    }
  };

  const ensurePollingIntervals = () => {
    /** Polling rămâne activ și când SSE e conectat — altfel UI-ul depinde integral de Redis/SSE și „îngheață”. */
    if (!conversationsPollingRef.current) {
      conversationsPollingRef.current = window.setInterval(
        () => {
          void runConversationPoll();
        },
        CONV_FALLBACK_MS
      ) as unknown as number;
    }
    const sel = selectedConversationRef.current;
    if (sel && !messagesPollingRef.current) {
      messagesPollingRef.current = window.setInterval(
        () => {
          void runMessagesPollTick();
        },
        MSG_FALLBACK_MS
      ) as unknown as number;
    }
  };

  ensurePollingIntervalsRef.current = ensurePollingIntervals;

  /** Reconcile listă vs DB chiar dacă SSE pare conectat (evită UI „înghețat” fără refresh). */
  useEffect(() => {
    slowConversationSyncRef.current = window.setInterval(() => {
      void runConversationPoll({ ignoreSse: true });
    }, CONV_RECONCILE_SLOW_MS) as unknown as number;
    return () => {
      if (slowConversationSyncRef.current !== null) {
        clearInterval(slowConversationSyncRef.current);
        slowConversationSyncRef.current = null;
      }
    };
  }, []);

  const fetchConversations = async () => {
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
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    /** Evită respingerea primului GET din coadă dacă seq global e mare de la alt thread */
    lastAppliedMessagesSeqRef.current = 0;
    setSelectedConversation(conversation);
    selectedConversationRef.current = conversation;
    setMessages([]);
    setIsLoadingThread(true);
    try {
      await fetchMessages(
        conversation.otherParticipant.id,
        conversation.listing?.id,
        conversation.id
      );
    } finally {
      setIsLoadingThread(false);
    }

    if (messagesPollingRef.current) {
      clearInterval(messagesPollingRef.current);
      messagesPollingRef.current = null;
    }
    messagesPollingRef.current = window.setInterval(() => {
      void runMessagesPollTick();
    }, MSG_FALLBACK_MS) as unknown as number;
  };

  sseHandlerRef.current = { fetchConversations };

  fetchMessagesRefForSse.current = (userId, listingId, conversationId) =>
    fetchMessages(userId, listingId, conversationId, "manual");

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) return;

    const dispose = connectMessageEventsSse({
      onOpen: () => {
        if (sseWatchdogRef.current) {
          clearTimeout(sseWatchdogRef.current);
          sseWatchdogRef.current = null;
        }
        sseEverOpenedRef.current = true;
        sseLiveRef.current = true;
        ensurePollingIntervalsRef.current();
      },
      onTransportEnded: () => {
        sseLiveRef.current = false;
        ensurePollingIntervalsRef.current();
      },
      onMessage: (ev) => {
        let d: { type?: string };
        try {
          d = JSON.parse(ev.data);
        } catch {
          return;
        }
        const kind = typeof (d as { type?: string }).type === "string"
          ? (d as { type: string }).type
          : "";
        if (
          kind === "typing" ||
          kind === "presence" ||
          kind === "heartbeat" ||
          kind === "connected"
        )
          return;
        if (
          kind !== "message" &&
          kind !== "unread_update" &&
          kind !== "conversation_update" &&
          kind !== "read_receipt" &&
          kind !== "delivery_receipt"
        )
          return;
        void sseHandlerRef.current.fetchConversations();
        notifyMessagingInboxSync();
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

  /** Tab în fundal: browserul încetinește puternic setInterval; la revenire refacem sync imediat */
  useEffect(() => {
    const onVisibility = () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") {
        return;
      }
      void sseHandlerRef.current.fetchConversations();
      const sel = selectedConversationRef.current;
      if (sel) {
        void fetchMessagesRefForSse.current(
          sel.otherParticipant.id,
          sel.listing?.id,
          sel.id
        );
      }
      ensurePollingIntervalsRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const onFocus = () => {
      if (!localStorage.getItem("accessToken")) return;
      void sseHandlerRef.current.fetchConversations();
      const sel = selectedConversationRef.current;
      if (sel) {
        void fetchMessagesRefForSse.current(
          sel.otherParticipant.id,
          sel.listing?.id,
          sel.id
        );
      }
      ensurePollingIntervalsRef.current();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /** Debug UI state: dev sau `localStorage.setItem("MSG_UI_DEBUG","1")` + refresh */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const debug =
      process.env.NODE_ENV === "development" ||
      window.localStorage.getItem("MSG_UI_DEBUG") === "1";
    if (!debug) return;

    const last = messages.length > 0 ? messages[messages.length - 1] : null;
    console.log("[MSG_UI]", {
      currentUserId,
      conversationsCount: conversations.length,
      selectedConversationId: selectedConversation?.id ?? null,
      messagesCount: messages.length,
      lastMessage: last
        ? {
            id: last.id,
            contentPreview:
              typeof last.content === "string"
                ? last.content.slice(0, 120)
                : "(no content)",
            senderId: last.sender?.id ?? null,
          }
        : null,
      unreadCount: selectedConversation?.unreadCount ?? 0,
    });
  }, [
    currentUserId,
    conversations.length,
    selectedConversation?.id,
    selectedConversation?.unreadCount,
    messages,
    messages.length,
  ]);

  const MESSAGE_MAX_CHARS = 5000;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeConversation = selectedConversationRef.current || selectedConversation;
    const trimmedContent = newMessage.trim();

    if (!trimmedContent || !activeConversation) {
      return;
    }

    await sendOutboundMessage(activeConversation, trimmedContent);
  };

  const sendOutboundMessage = async (
    conversationSnapshot: Conversation,
    trimmedContent: string,
    options?: { skipFingerprint?: boolean; keepInput?: boolean }
  ) => {
    if (trimmedContent.length > MESSAGE_MAX_CHARS) {
      setSendError("Mesajul depășește lungimea maximă permisă (5000 caractere).");
      return;
    }

    const now = Date.now();
    const fp = `${conversationSnapshot.id}|${trimmedContent}`;
    if (!options?.skipFingerprint) {
      const last = lastSendFingerprintRef.current;
      if (last && last.fp === fp && now - last.t < 900) {
        return;
      }
      lastSendFingerprintRef.current = { t: now, fp };
    }

    if (!options?.keepInput) {
      setNewMessage("");
    }

    setSendError(null);
    setRetryPayload(null);

    const optimisticMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const optimisticMessage: Message = {
      id: optimisticMessageId,
      sender: {
        id: currentUserId || "me",
        name: "Tu",
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

    setMessages((prev) => [...prev, optimisticMessage]);

    const sendBarrierSeq = ++messagesRequestSeqRef.current;
    lastAppliedMessagesSeqRef.current = sendBarrierSeq;

    setIsSending(true);
    try {
      let lastErrText = "";
      let lastResp: Response | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        await syncSessionFromCookies();
        const response = await postJsonWithAuthRefresh(
          `/api/messages/${conversationSnapshot.otherParticipant.id}`,
          {
            content: trimmedContent,
            listingId: conversationSnapshot.listing?.id,
            conversationId: conversationSnapshot.id,
          }
        );
        lastResp = response;

        if (response.ok) {
          const data = await response.json() as {
            conversationId?: string;
            message?: Message;
          };

          const resolvedConversationId =
            data?.conversationId || conversationSnapshot.id;

          if (data?.message) {
            setMessages((prev) => {
              const hasTemp = prev.some((msg) => msg.id === optimisticMessageId);
              const hasServerMessage = prev.some((msg) => msg.id === data.message!.id);
              let next = prev;

              if (!hasTemp && !hasServerMessage) {
                next = [...prev, data.message!];
              }

              return next.sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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

          await fetchConversations();
          notifyMessagingInboxSync();
          setRetryPayload(null);
          setSendError(null);
          return;
        }

        let errHuman = "";
        try {
          const errorData = (await response.clone().json()) as { error?: string };
          errHuman =
            typeof errorData?.error === "string"
              ? errorData.error
              : "Nu am putut trimite mesajul.";
          lastErrText = errHuman;
        } catch {
          lastErrText = response.statusText || "Eroare rețea";
          errHuman = lastErrText;
        }

        if (response.status === 429 || response.status >= 500) {
          await new Promise((r) => window.setTimeout(r, 520 * (attempt + 1)));
          continue;
        }

        throw new Error(errHuman);
      }

      throw new Error(
        lastErrText ||
          (!lastResp?.ok
            ? `Eroare trimitere (${lastResp?.status ?? "?"})`
            : "Eroare trimitere")
      );
    } catch (err: unknown) {
      console.error("[Messaging] Error sending message:", err);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessageId));
      setNewMessage(trimmedContent);
      const msg =
        err instanceof Error ? err.message : "Eroare la trimiterea mesajului.";
      setSendError(msg);
      setRetryPayload({ conversation: conversationSnapshot, content: trimmedContent });
      notifyMessagingInboxSync();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="enterprise-page-bg enterprise-mesh flex min-h-screen flex-col text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-6">
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

        <div className="grid h-[min(70dvh,640px)] grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {/* Conversations List */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/90 shadow-[var(--shadow-md)] backdrop-blur-sm">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Conversații
              </h2>
            </div>

            <div className="flex-1 touch-pan-y overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
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
                    {conv.lastMessage &&
                      typeof (conv.lastMessage as { content?: string }).content === "string" &&
                      (conv.lastMessage as { content: string }).content.trim().length > 0 && (
                        <p className="mb-1 line-clamp-2 text-left text-xs text-[var(--text-secondary)]">
                          {(conv.lastMessage as { content: string }).content}
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

                <div
                  ref={messagesContainerRef}
                  className="flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-y-contain px-5 py-5 [-webkit-overflow-scrolling:touch]"
                >
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
                        className={`flex flex-col ${messagingUserIdsEqual(msg.sender.id, currentUserId) ? "items-end" : "items-start"}`}
                      >
                        {!messagingUserIdsEqual(msg.sender.id, currentUserId) && (
                          <span className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            {displayNameForMessagingUser(msg.sender)}
                          </span>
                        )}
                        <div
                          className={`max-w-[min(100%,20rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            messagingUserIdsEqual(msg.sender.id, currentUserId)
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

                {sendError && (
                  <div
                    className="border-b border-amber-500/25 bg-amber-500/10 px-5 py-3 text-sm text-amber-100"
                    role="alert"
                  >
                    <p className="mb-2 font-medium">{sendError}</p>
                    {retryPayload && (
                      <button
                        type="button"
                        className="rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-50 transition hover:bg-amber-500/20"
                        onClick={() => {
                          lastSendFingerprintRef.current = null;
                          void sendOutboundMessage(retryPayload.conversation, retryPayload.content, {
                            skipFingerprint: true,
                            keepInput: true,
                          });
                        }}
                      >
                        Trimite din nou
                      </button>
                    )}
                  </div>
                )}
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-3 border-t border-white/[0.06] bg-[var(--bg-primary)]/40 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
                  id="message-form"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                    }}
                    placeholder="Scrie un mesaj…"
                    maxLength={MESSAGE_MAX_CHARS}
                    className="enterprise-input flex-1 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-muted)]"
                    id="message-input"
                    enterKeyHint="send"
                    autoComplete="off"
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
