"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getCsrfToken } from "@/lib/security/csrf-client";

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
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  listing?: {
    id: string;
    title: string;
  };
  lastMessage: string;
  unreadCount: number;
  lastMessageTime: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login?redirect=/dashboard/messages');
      return;
    }

    fetchConversations();
  }, [router]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      const conversationsList = Array.isArray(data) ? data : data.conversations || [];
      setConversations(conversationsList);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setConversations([]);
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/messages/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(Array.isArray(data) ? data : data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem('accessToken');
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/messages/${selectedConversation.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ content: newMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage("");
      await fetchMessages(selectedConversation.id);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
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
                      {conv.otherUser.avatar ? (
                        <img
                          src={conv.otherUser.avatar}
                          alt={conv.otherUser.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FF7900] to-[#FFB84D] flex items-center justify-center text-sm font-bold">
                          {conv.otherUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{conv.otherUser.name}</p>
                        {conv.unreadCount > 0 && (
                          <span className="inline-block bg-[#FF7900] text-white text-xs px-2 py-1 rounded-full font-bold">
                            {conv.unreadCount} nou
                          </span>
                        )}
                      </div>
                    </div>
                    {conv.listing && (
                      <p className="text-xs text-gray-400 mb-1 truncate">
                        Re: {conv.listing.title}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">{conv.lastMessageTime}</p>
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
                    {selectedConversation.otherUser.avatar ? (
                      <img
                        src={selectedConversation.otherUser.avatar}
                        alt={selectedConversation.otherUser.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#FF7900] to-[#FFB84D] flex items-center justify-center text-sm font-bold">
                        {selectedConversation.otherUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white">{selectedConversation.otherUser.name}</p>
                      {selectedConversation.listing && (
                        <p className="text-xs text-gray-400">{selectedConversation.listing.title}</p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/users/${selectedConversation.otherUser.id}`}
                    className="px-4 py-2 border-2 border-[#FF7900] text-[#FF7900] rounded-lg font-bold text-sm hover:bg-[#FF7900]/10 transition"
                  >
                    Profil
                  </Link>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p>Niciun mesaj. Începe conversația!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender.id === localStorage.getItem('userId')
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-xl ${
                            msg.sender.id === localStorage.getItem('userId')
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
                  onSubmit={handleSendMessage}
                  className="p-6 border-t border-[#2A2A2A] flex gap-3"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Scrie mesajul..."
                    className="flex-1 bg-[#2A2A2A] border-2 border-[#2A2A2A] rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF7900]"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="px-6 py-2 bg-gradient-to-r from-[#FF7900] to-[#E66D00] text-white rounded-lg font-bold hover:shadow-lg hover:shadow-[#FF7900]/50 transition disabled:opacity-50"
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
