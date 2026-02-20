"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { clearCsrfTokenCache, getCsrfToken } from "@/lib/security/csrf-client";

interface Message {
  id: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const messagesRequestSeqRef = useRef(0);
  const lastAppliedMessagesSeqRef = useRef(0);
  const isSendingRef = useRef(false);

  // Real-time polling interval refs
  const conversationsPollingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Diagnostic: Component mount tracking
  console.log('[MOUNT-CHECK] MessagesPage component rendering...');
  if (typeof window !== 'undefined') {
    (window as any).__messagesPageRendered = new Date().toISOString();
  }

  useEffect(() => {
    console.log('[MOUNT-CHECK] MessagesPage useEffect with empty deps - COMPONENT MOUNTED');
    if (typeof window !== 'undefined') {
      (window as any).__messagesPageMounted = true;
      console.log('[MOUNT-CHECK] Set window.__messagesPageMounted = true');
    }
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login?redirect=/dashboard/messages');
      return;
    }

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user?.id || null);
      } catch {
        setCurrentUserId(null);
      }
    }

    fetchConversations();

    // Cleanup on unmount
    return () => {
      if (conversationsPollingRef.current) clearInterval(conversationsPollingRef.current);
      if (messagesPollingRef.current) clearInterval(messagesPollingRef.current);
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

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/messages/conversations', {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      const conversationsList = Array.isArray(data) ? data : data.conversations || [];
      setConversations(conversationsList);

      if (!selectedConversation && conversationsList.length > 0) {
        await handleSelectConversation(conversationsList[0]);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('[Messages] Fetch error:', err);
      setIsLoading(false);
    }

    // Start real-time polling for conversations (every 800ms)
    if (!conversationsPollingRef.current) {
      conversationsPollingRef.current = setInterval(async () => {
        try {
          const token = localStorage.getItem('accessToken');
          const headers: HeadersInit = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          
          const response = await fetch('/api/messages/conversations', {
            headers,
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            const conversationsList = Array.isArray(data) ? data : data.conversations || [];
            setConversations(conversationsList);
          }
        } catch (err) {
          // Silent fail for polling
        }
      }, 1500);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    console.log('[SELECT-CONV] Selected conversation:', conversation.id, 'with', conversation.otherParticipant.name);
    setSelectedConversation(conversation);
    selectedConversationRef.current = conversation;
    await fetchMessages(conversation.otherParticipant.id, conversation.listing?.id, conversation.id);

    // Clear old polling
    if (messagesPollingRef.current) {
      console.log('[SELECT-CONV] Clearing old polling interval');
      clearInterval(messagesPollingRef.current);
    }
    
    // Start real-time polling for messages (every 500ms)
    console.log('[SELECT-CONV] Starting message polling at 800ms...');
    messagesPollingRef.current = setInterval(() => {
      const currentConversation = selectedConversationRef.current;
      if (!currentConversation) {
        console.warn('[POLLING] ❌ No currentConversation in ref!');
        return;
      }
      if (isSendingRef.current) {
        console.log('[POLLING] Skipping - isSendingRef is true');
        return;
      }
      fetchMessages(
        currentConversation.otherParticipant.id,
        currentConversation.listing?.id,
        currentConversation.id,
        'poll'
      );
    }, 800);
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
    
    if (source === 'poll') {
      console.log(`[POLL-MSG] Fetching messages for conv ${conversationId}`);
    }

    try {
      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const params = new URLSearchParams();
      if (listingId) params.set('listingId', listingId);
      if (conversationId) params.set('conversationId', conversationId);
      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await fetch(`/api/messages/${userId}${query}`, {
        headers,
        credentials: 'include',
      });

      if (source === 'poll') {
        console.log(`[POLL-MSG] Response status: ${response.status}`);
      }

      if (!response.ok) {
        if (source === 'poll') console.warn(`[POLL-MSG] ❌ Response not ok`);
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      if (source === 'poll') {
        console.log(`[POLL-MSG] Got ${Array.isArray(data) ? data.length : (data.messages || []).length} messages`);
      }

      const nextMessages = Array.isArray(data) ? data : data.messages || [];

      if (requestSeq < lastAppliedMessagesSeqRef.current) {
        return;
      }

      const currentConversation = selectedConversationRef.current;
      if (!currentConversation) {
        if (source === 'poll') console.warn(`[POLL-MSG] ❌ No current conversation!`);
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

        if (source === 'poll' && !isSameSnapshot) {
          console.log(`[POLL-MSG] ✓ State updated: ${prevMessages.length} -> ${mergedMessages.length} messages`);
        }

        return isSameSnapshot ? prevMessages : mergedMessages;
      });
    } catch (err) {
      console.error(`[POLL-MSG] Error:`, err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[SEND] Button clicked, form submitted');
    
    const activeConversation = selectedConversationRef.current || selectedConversation;
    console.log('[SEND] activeConversation:', activeConversation?.id, 'newMessage length:', newMessage.trim().length);
    
    if (!newMessage.trim() || !activeConversation) {
      console.log('[SEND] ❌ Early return - no message or no conversation');
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
      const token = localStorage.getItem('accessToken');
      console.log('[SEND] TOKEN fetched from storage:', !!token);

      const sendMessageRequest = async (csrfToken: string) => {
        const body = {
          content: trimmedContent,
          listingId: conversationSnapshot.listing?.id,
          conversationId: conversationSnapshot.id,
        };
        console.log('[SEND] Preparing fetch to /api/messages/' + conversationSnapshot.otherParticipant.id);
        console.log('[SEND] Body:', body);

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        console.log('[SEND] Headers prepared, initiating fetch...');
        return fetch(`/api/messages/${conversationSnapshot.otherParticipant.id}`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(body),
        });
      };

      let csrfToken = await getCsrfToken();
      console.log('[SEND] CSRF token obtained');
      
      let response = await sendMessageRequest(csrfToken);
      console.log('[SEND] Response received, status:', response.status);

      if (response.status === 403) {
        console.log('[SEND] CSRF 403, retrying with fresh token...');
        clearCsrfTokenCache();
        csrfToken = await getCsrfToken();
        response = await sendMessageRequest(csrfToken);
        console.log('[SEND] Retry response status:', response.status);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SEND] ❌ Response not ok:', response.status, errorData);
        throw new Error(errorData?.error || 'Failed to send message');
      }

      const data = await response.json();
      console.log('[SEND] ✓ Response success:', data);

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
        console.log('[SEND] Conversation ID changed from', conversationSnapshot.id, 'to', resolvedConversationId);
        setSelectedConversation((prev) => {
          const next = prev ? { ...prev, id: resolvedConversationId } : prev;
          selectedConversationRef.current = next;
          return next;
        });
      }

      // Let polling reconcile the canonical server list to avoid immediate overwrite races.
      console.log('[SEND] Triggering fetchConversations to sync...');
      fetchConversations();
      console.log('[SEND] ✓✓✓ MESSAGE SEND COMPLETE ✓✓✓');
    } catch (err) {
      console.error('[SEND] ❌ EXCEPTION:', err);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessageId));
      setNewMessage(trimmedContent);
      alert('Eroare la trimiterea mesajului. Te rog încearcă din nou.');
    } finally {
      console.log('[SEND] Finally block - setting isSending to false');
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF7900] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Se încarcă mesajele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-2">
            <span className="text-white">Mesajele </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
              mele
            </span>
          </h1>
          <p className="text-gray-400">Comunică cu cumpărătorii și vânzătorii</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <div className="glass-dark rounded-2xl border-2 border-[#2A2A2A] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#2A2A2A]">
              <h2 className="text-xl font-bold">Conversații</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <p>Nu ai conversații</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full p-4 border-b border-[#2A2A2A] text-left transition ${
                      selectedConversation?.id === conv.id
                        ? 'bg-[#FF7900]/20 border-[#FF7900]'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {conv.otherParticipant.avatar ? (
                        <img
                          src={conv.otherParticipant.avatar}
                          alt={conv.otherParticipant.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FF7900] to-[#FFB84D] flex items-center justify-center text-sm font-bold">
                          {conv.otherParticipant.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{conv.otherParticipant.name}</p>
                        {conv.unreadCount > 0 && (
                          <span className="inline-block bg-[#FF7900] text-white text-xs px-2 py-1 rounded-full font-bold">
                            {conv.unreadCount} nou
                          </span>
                        )}
                      </div>
                    </div>
                    {conv.listing && (
                      <p className="text-xs text-gray-400 mb-1 truncate">
                        Re: {conv.listing.title} • #{conv.listing.id.slice(-6)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">{new Date(conv.lastMessageAt).toLocaleString()}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="md:col-span-2 glass-dark rounded-2xl border-2 border-[#2A2A2A] overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-[#2A2A2A] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedConversation.otherParticipant.avatar ? (
                      <img
                        src={selectedConversation.otherParticipant.avatar}
                        alt={selectedConversation.otherParticipant.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF7900] to-[#FFB84D] flex items-center justify-center text-sm font-bold">
                        {selectedConversation.otherParticipant.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white">{selectedConversation.otherParticipant.name}</p>
                      {selectedConversation.listing && (
                        <p className="text-xs text-gray-400">{selectedConversation.listing.title} • #{selectedConversation.listing.id.slice(-6)}</p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/users/${selectedConversation.otherParticipant.id}/profile`}
                    className="px-4 py-2 border-2 border-[#FF7900] text-[#FF7900] rounded-lg font-bold text-sm hover:bg-[#FF7900]/10 transition"
                  >
                    Profil
                  </Link>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p>Niciun mesaj. Începe conversația!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender.id === currentUserId
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-xl ${
                            msg.sender.id === currentUserId
                              ? 'bg-[#FF7900] text-white'
                              : 'bg-[#2A2A2A] text-gray-200'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString('ro-RO')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={(e) => {
                    console.log('[FORM] Form submitted - calling handleSendMessage');
                    console.log('[FORM] Event:', e, 'Type:', e.type);
                    handleSendMessage(e);
                  }}
                  className="p-6 border-t border-[#2A2A2A] flex gap-3"
                  id="message-form"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (e.target.value.length % 10 === 0) {
                        console.log('[INPUT] Typing, current length:', e.target.value.length);
                      }
                    }}
                    placeholder="Scrie mesajul..."
                    className="flex-1 bg-[#2A2A2A] border-2 border-[#2A2A2A] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF7900]"
                    id="message-input"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    onClick={(e) => {
                      console.log('[BUTTON-CLICK] Button clicked! DOM check:', {
                        form: document.getElementById('message-form'),
                        input: document.getElementById('message-input'),
                        isSending,
                        hasText: !!newMessage.trim(),
                        buttonDisabled: isSending || !newMessage.trim()
                      });
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-[#FF7900] to-[#E66D00] text-white rounded-lg font-bold hover:shadow-lg hover:shadow-[#FF7900]/50 transition disabled:opacity-50"
                    id="send-button"
                  >
                    {isSending ? 'Se trimite...' : 'Trimite'}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Selectează o conversație</p>
              </div>
            )}
          </div>
        </div>

        {/* Back Link */}
        <Link href="/dashboard" className="text-[#FF7900] hover:text-[#FFB84D] font-bold mt-8">
          ← Înapoi la dashboard
        </Link>
      </div>

      <Footer />
    </div>
  );
}
