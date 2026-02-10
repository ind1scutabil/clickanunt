'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';

interface Message {
  id: string;
  senderId: string;
  senderEmail: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Listing {
  id: string;
  title: string;
  photos?: string[];
  category?: string;
  priceAmount?: number;
  priceCurrency?: string;
  city?: string;
  county?: string;
  make?: string;
  model?: string;
  year?: number;
  owner?: {
    id: string;
    email: string;
  };
}

interface CurrentUser {
  id: string;
  email: string;
}

export default function ListingMessagesPage() {
  const params = useParams();
  const id = params?.id as string;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user) as CurrentUser;
      setCurrentUser(parsed);
    }

    if (!id) {
      setLoading(false);
      return;
    }

    // Fetch listing
    fetch(`/api/listings/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.listing) {
          setListing(data.listing);
        }
      })
      .catch(err => {
        console.error('Error fetching listing:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser || !listing) {
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderEmail: currentUser.email,
      listingId: listing.id,
      listingTitle: listing.title || '',
      listingPrice: listing.priceAmount || 0,
      content: messageText,
      timestamp: new Date().toLocaleString(),
      isRead: false,
    };

    setMessages([...messages, newMessage]);
    setMessageText('');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <p className="text-white text-xl mb-4">Trebuie să te loghezi pentru a vedea mesajele</p>
            <a href="/auth/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Logare
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-300">Se încarcă...</p>
          </div>
        ) : !listing ? (
          <div className="text-center py-12">
            <p className="text-gray-300 text-lg">Anunț nu gasit</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Chat Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden flex flex-col h-[600px]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="text-6xl mb-4">💭</div>
                      <p className="text-gray-400">Nicio conversație încă</p>
                      <p className="text-gray-500 text-sm mt-2">Scrie mai jos pentru a contacta vânzătorul</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderEmail === currentUser?.email ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-sm px-6 py-4 rounded-2xl ${
                            msg.senderEmail === currentUser?.email
                              ? 'bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white rounded-br-none'
                              : 'bg-gray-700/50 text-gray-100 rounded-bl-none'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className="text-xs mt-2 opacity-70">{msg.timestamp}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-700/30 bg-gray-900/50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Scrie mesajul..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 bg-gray-800/50 border border-gray-700/30 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#6D5BFF]/50"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#6D5BFF]/50 transition"
                    >
                      Trimite
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Listing Info Sidebar */}
            <div className="space-y-6">
              {/* Listing Card */}
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
                <div className="h-48 bg-gray-700 overflow-hidden">
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${listing.photos?.[0] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=300&fit=crop'})`,
                    }}
                  />
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-xl mb-2">{listing.title}</h3>
                    <p className="text-2xl font-black bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] bg-clip-text text-transparent">
                      {listing.priceAmount?.toLocaleString()} {listing.priceCurrency || 'RON'}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300">
                    {listing.city && listing.county && (
                      <p>📍 {listing.city}, {listing.county}</p>
                    )}
                    {listing.make && listing.model && (
                      <p>🚗 {listing.make} {listing.model}</p>
                    )}
                    {listing.year && (
                      <p>📅 {listing.year}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              {listing.owner && (
                <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-6">
                  <h4 className="font-bold text-white mb-4">Informații vânzător</h4>
                  <div className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-2xl border border-gray-700/30 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#6D5BFF] to-[#4E3CFF] rounded-full flex items-center justify-center text-white font-black text-lg">
                      {listing.owner.email?.charAt(0).toUpperCase() || 'V'}
                    </div>
                    <div>
                      <p className="font-bold text-white">{listing.owner.email?.split('@')[0]}</p>
                      <p className="text-xs text-gray-400">✅ Verificat</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300">
                    <p className="flex items-center gap-2">
                      <span>📋</span>
                      <span>25+ anunțuri active</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span>⭐</span>
                      <span>4.8 rating (156 evaluări)</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span>🕒</span>
                      <span>Răspund în 2 ore</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
