'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import {
  fetchWithAuthRefresh,
  postJsonWithAuthRefresh,
  syncSessionFromCookies,
} from '@/lib/admin-fetch';
import { connectMessageEventsSse } from '@/lib/message-events-sse-client';
import { listingPrimaryPhotoSrc } from '@/lib/listing-photo-url';
import { displayNameForMessagingUser } from '@/lib/messaging-display';
import type { ListingPublicDto, MessageThreadRowDto } from '@clickanunt/api-contracts';

type Message = MessageThreadRowDto;

type Listing = ListingPublicDto & {
  owner?: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    businessName: string | null;
    role?: string | null;
    totalListings: number;
    averageRating: number;
    responseRate: number;
  };
}

interface CurrentUser {
  id: string;
  email: string;
  name?: string;
}

export default function ListingMessagesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const fetchMessagesRef = useRef<
    (ownerId: string, _token: string | null, listingId?: string) => Promise<void>
  >(async () => {});
  const listingThreadRef = useRef<{
    listingId?: string;
    ownerId?: string;
    currentUserId?: string;
  }>({});

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Când SSE e conectat, polling-ul HTTP e oprit (fallback la deconectare) */
  const [sseConnected, setSseConnected] = useState(false);

  const messagingPeerId = useMemo(
    () => (listing ? listing.owner?.id ?? listing.ownerUserId : null),
    [listing]
  );
  const isOwnListing = Boolean(
    currentUser?.id &&
      messagingPeerId &&
      messagingPeerId === currentUser.id
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      router.push('/auth/login');
      return;
    }

    const parsed = JSON.parse(userStr) as CurrentUser & { userId?: string };
    const resolvedUserId = parsed.id ?? parsed.userId;
    if (!resolvedUserId) {
      router.push('/auth/login');
      return;
    }
    setCurrentUser({ ...parsed, id: resolvedUserId });

    if (!id) {
      setLoading(false);
      return;
    }

    // Fetch listing
    const fetchListing = async () => {
      try {
        await syncSessionFromCookies();
        const res = await fetch(`/api/listings/${id}`);
        if (!res.ok) throw new Error('Failed to fetch listing');
        const data = await res.json();
        setListing(data);

        const accessAfterSync = localStorage.getItem('accessToken') || token;

        const ownerPeerId = data.owner?.id ?? data.ownerUserId;
        // Once we have the listing owner, fetch messages
        if (ownerPeerId && ownerPeerId !== resolvedUserId) {
          fetchMessages(ownerPeerId, accessAfterSync, data.id);
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Nu am putut încărca anunțul');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id, router]);

  const fetchMessages = async (ownerId: string, _token: string | null, listingId?: string) => {
    try {
      const query = listingId ? `?listingId=${encodeURIComponent(listingId)}` : '';
      const res = await fetchWithAuthRefresh(`/api/messages/${ownerId}${query}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      // Don't show error for empty conversations
      setMessages([]);
    }
  };

  fetchMessagesRef.current = fetchMessages;

  useEffect(() => {
    listingThreadRef.current = {
      listingId: listing?.id,
      ownerId: messagingPeerId ?? undefined,
      currentUserId: currentUser?.id,
    };
  }, [listing?.id, messagingPeerId, currentUser?.id]);

  // SSE: mesaje noi pentru acest anunț (+ reconectare cu token proaspăt)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token || !listing?.id || !messagingPeerId || !currentUser?.id) {
      return;
    }
    if (isOwnListing) {
      return;
    }

    const dispose = connectMessageEventsSse({
      onOpen: () => setSseConnected(true),
      onTransportEnded: () => setSseConnected(false),
      onMessage: (ev) => {
        let d: {
          type?: string;
          listingId?: string | null;
          senderId?: string;
          receiverId?: string;
        };
        try {
          d = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (d.type !== "message") return;
        const ctx = listingThreadRef.current;
        const { listingId, ownerId, currentUserId } = ctx;
        if (!listingId || !ownerId || !currentUserId) return;
        if (d.listingId == null || d.listingId !== listingId) return;
        if (d.senderId !== currentUserId && d.receiverId !== currentUserId) return;
        void fetchMessagesRef.current(
          ownerId,
          localStorage.getItem("accessToken"),
          listingId
        );
      },
    });

    return () => {
      dispose();
      setSseConnected(false);
    };
  }, [listing?.id, messagingPeerId, currentUser?.id, isOwnListing]);

  // Fallback polling când SSE nu e activ
  useEffect(() => {
    if (!listing?.id || !messagingPeerId || !currentUser?.id) {
      return;
    }

    if (isOwnListing) {
      return;
    }

    if (sseConnected) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollMessages = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const token = localStorage.getItem("accessToken");
      await fetchMessages(messagingPeerId, token, listing.id);
    };

    void pollMessages();

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      void pollMessages();
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [listing?.id, messagingPeerId, currentUser?.id, sseConnected, isOwnListing]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser || !listing || sendingMessage) {
      return;
    }

    const peerId = messagingPeerId;
    if (!peerId) {
      return;
    }

    if (peerId === currentUser.id) {
      setError('Nu poți trimite mesaje propriului anunț');
      return;
    }

    setSendingMessage(true);
    setError(null);

    try {
      await syncSessionFromCookies();
      const token = localStorage.getItem('accessToken');
      const res = await postJsonWithAuthRefresh(`/api/messages/${peerId}`, {
        content: messageText.trim(),
        listingId: listing.id,
      });

      if (!res.ok) {
        const raw = await res.text();
        let errMsg = 'Failed to send message';
        try {
          const parsed = JSON.parse(raw) as { error?: string };
          if (typeof parsed?.error === 'string') errMsg = parsed.error;
        } catch {
          errMsg = res.status === 401 ? 'Nu ești autentificat sau sesiunea a expirat.' : raw.slice(0, 200);
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      
      // Add new message to list
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }

      // Refresh conversation messages for the same listing immediately
      await fetchMessages(peerId, token, listing.id);
      
      setMessageText('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Nu am putut trimite mesajul. Te rugăm să încerci din nou.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
  };

  if (!currentUser) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm mt-4 text-center">Se încarcă...</p>
            </div>
          </div>
        ) : !listing ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-300 text-lg mb-2">Anunț negăsit</p>
            <p className="text-gray-500 text-sm">Acest anunț nu există sau a fost șters</p>
          </div>
        ) : isOwnListing ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📢</div>
            <p className="text-gray-300 text-lg mb-2">Acesta este anunțul tău</p>
            <p className="text-gray-500 text-sm mb-6">Pentru a vedea mesajele primite, accesează secțiunea Mesaje din Dashboard</p>
            <a 
              href="/dashboard/messages"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Vezi mesajele mele
            </a>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Chat Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-transparent backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Conversație cu vânzătorul</h1>
                    <p className="text-gray-400 text-sm">Discută despre acest anunț și pune întrebări</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Online</span>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-300 font-semibold">Eroare</p>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Chat Box */}
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col h-[600px]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-gray-300 font-semibold mb-2">Începe conversația</p>
                      <p className="text-gray-500 text-sm max-w-md">
                        Acesta este începutul conversației tale cu vânzătorul. 
                        Pune întrebări despre anunț, negociază prețul sau cere detalii suplimentare.
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => {
                        const isOwn = msg.senderId === currentUser.id;
                        const senderLabel = displayNameForMessagingUser(msg.sender);
                        const senderInitial =
                          senderLabel.charAt(0).toUpperCase() ||
                          msg.sender?.email?.[0]?.toUpperCase() ||
                          '?';
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                          >
                            <div className={`flex gap-3 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                              {/* Avatar */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                isOwn 
                                  ? 'bg-gradient-to-br from-blue-600 to-cyan-500' 
                                  : 'bg-gradient-to-br from-slate-600 to-slate-700'
                              }`}>
                                {senderInitial}
                              </div>
                              
                              {/* Message Bubble */}
                              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                {!isOwn && (
                                  <span className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    {senderLabel}
                                  </span>
                                )}
                                <div
                                  className={`px-5 py-3 rounded-2xl ${
                                    isOwn
                                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-md shadow-lg shadow-blue-500/30'
                                      : 'bg-slate-700/70 text-gray-100 rounded-bl-md border border-slate-600/50'
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                                </div>
                                <div className={`flex items-center gap-2 mt-1 px-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                  <span className="text-xs text-gray-500">{formatMessageTime(msg.createdAt)}</span>
                                  {isOwn && msg.isRead && (
                                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-700/50 bg-slate-900/70 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Scrie mesajul tău aici..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendingMessage}
                      className="flex-1 bg-slate-800/70 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !messageText.trim()}
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sendingMessage ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Trimite...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                          <span>Trimite</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Apasă Enter pentru a trimite, Shift+Enter pentru linie nouă</p>
                </div>
              </div>
            </div>

            {/* Listing Info Sidebar */}
            <div className="space-y-6">
              {/* Listing Card */}
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden hover:border-blue-500/30 transition-all duration-normal ease-premium">
                <div className="h-48 bg-slate-700 overflow-hidden relative group">
                  <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-normal ease-premium group-hover:scale-110"
                    style={{
                      backgroundImage: `url(${listingPrimaryPhotoSrc(listing.photos)})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-xl mb-2 leading-tight">{listing.title}</h3>
                    <p className="text-3xl font-black bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                      {listing.priceAmount?.toLocaleString('ro-RO')} {listing.priceCurrency || 'RON'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {listing.city && listing.county && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span>{listing.city}, {listing.county}</span>
                      </div>
                    )}
                    {listing.make && listing.model && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                        </svg>
                        <span>{listing.make} {listing.model}</span>
                      </div>
                    )}
                    {listing.year && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span>An fabricație: {listing.year}</span>
                      </div>
                    )}
                  </div>

                  <a 
                    href={`/listings/${listing.id}`}
                    className="block w-full text-center bg-slate-700/50 hover:bg-slate-700 text-gray-300 hover:text-white py-2.5 rounded-xl transition-all font-medium border border-slate-600/50 hover:border-blue-500/50"
                  >
                    Vezi anunțul complet →
                  </a>
                </div>
              </div>

              {/* Seller Info */}
              {listing.owner && (
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Informații vânzător
                  </h4>
                  
                  <div className="flex items-center gap-4 p-4 bg-slate-900/70 rounded-2xl border border-slate-700/50 mb-4 hover:border-blue-500/30 transition-all">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">
                      {displayNameForMessagingUser(listing.owner).charAt(0).toUpperCase() || 'V'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">
                        {listing.owner.businessName?.trim()
                          ? listing.owner.businessName
                          : displayNameForMessagingUser(listing.owner)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-green-400 font-medium">Verificat</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1  0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        <span>Anunțuri active</span>
                      </div>
                      <span className="font-bold text-white">{listing.owner.totalListings}+</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>Rating mediu</span>
                      </div>
                      <span className="font-bold text-white">{listing.owner.averageRating.toFixed(1)} ★</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700/30">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1-1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>Răspunsuri</span>
                      </div>
                      <span className="font-bold text-white">{listing.owner.responseRate}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips Card */}
              <div className="bg-gradient-to-br from-blue-600/10 via-cyan-500/10 to-transparent backdrop-blur-xl rounded-2xl border border-blue-500/20 p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm mb-1">Sfaturi pentru o conversație sigură</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• Nu partaja informații personale sensibile</li>
                      <li>• Verifică detaliile anunțului înainte de cumpărare</li>
                      <li>• Cere poze/detalii suplimentare dacă e necesar</li>
                      <li>• Raportează comportamentul suspect</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
