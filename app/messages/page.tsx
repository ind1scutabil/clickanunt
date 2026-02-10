"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState } from "react";

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "sent">("all");

  // Mock messages data
  const messages = [
    {
      id: 1,
      sender: "Ion Popescu",
      subject: "Întrebare despre BMW Seria 3",
      preview: "Bună ziua, sunt interesat de mașină. Este disponibilă pentru o probă?",
      time: "2 ore în urmă",
      unread: true,
      avatar: "IP",
      listingTitle: "BMW Seria 3 320d xDrive",
    },
    {
      id: 2,
      sender: "Maria Ionescu",
      subject: "Ofertă pentru apartament",
      preview: "Am văzut anunțul dumneavoastră pentru apartamentul de 2 camere...",
      time: "5 ore în urmă",
      unread: true,
      avatar: "MI",
      listingTitle: "Apartament 2 camere decomandat",
    },
    {
      id: 3,
      sender: "Andrei Dumitrescu",
      subject: "Negociere preț iPhone",
      preview: "Sunt interesat să cumpăr telefonul. Acceptați 4000 RON?",
      time: "1 zi în urmă",
      unread: false,
      avatar: "AD",
      listingTitle: "iPhone 14 Pro Max 256GB",
    },
  ];

  const filteredMessages = messages.filter((msg) => {
    if (activeTab === "unread") return msg.unread;
    if (activeTab === "sent") return false; // Mock: no sent messages yet
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0B14] relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#6366F1]/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/2 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* Header with 3D effect */}
        <div className="mb-12">
          <h1 className="text-6xl font-black mb-4 relative">
            <span className="text-white drop-shadow-2xl">Mesajele </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] animate-gradient-x drop-shadow-2xl">
              mele
            </span>
            <div className="absolute -inset-1 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] opacity-20 blur-3xl -z-10"></div>
          </h1>
          <p className="text-gray-400 text-lg font-medium">
            Gestionează conversațiile tale cu cumpărătorii și vânzătorii
          </p>
        </div>

        {/* Tabs with glass effect */}
        <div className="group relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1]/10 via-[#8B5CF6]/10 to-[#7C3AED]/10 rounded-2xl blur-xl"></div>
          <div className="relative flex gap-2 bg-slate-800/80 backdrop-blur-xl rounded-2xl p-2 border border-slate-700/50 shadow-2xl">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 px-6 py-4 font-bold text-lg transition-all rounded-xl ${
                activeTab === "all"
                  ? "bg-gradient-to-r from-[#6366F1]/20 to-[#7C3AED]/20 text-[#8B5CF6] shadow-lg border border-[#6366F1]/50"
                  : "text-gray-400 hover:text-[#8B5CF6] hover:bg-slate-700/50"
              }`}
            >
              Toate
              <span className="ml-2 px-2.5 py-1 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white rounded-full text-xs font-bold shadow-lg">
                {messages.length}
            </span>
          </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`flex-1 px-6 py-4 font-bold text-lg transition-all rounded-xl ${
                activeTab === "unread"
                  ? "bg-gradient-to-r from-[#7C3AED]/20 to-[#6366F1]/20 text-[#8B5CF6] shadow-lg border border-[#7C3AED]/50"
                  : "text-gray-400 hover:text-[#8B5CF6] hover:bg-slate-700/50"
              }`}
            >
              Necitite
              <span className="ml-2 px-2.5 py-1 bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
                {messages.filter((m) => m.unread).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("sent")}
              className={`flex-1 px-6 py-4 font-bold text-lg transition-all rounded-xl ${
                activeTab === "sent"
                  ? "bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/20 text-[#8B5CF6] shadow-lg border border-[#6366F1]/50"
                  : "text-gray-400 hover:text-[#8B5CF6] hover:bg-slate-700/50"
              }`}
            >
              Trimise
              <span className="ml-2 px-2.5 py-1 bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white rounded-full text-xs font-bold shadow-lg">0</span>
            </button>
          </div>
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] rounded-full mb-6 shadow-2xl animate-pulse">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">
              {activeTab === "sent" ? "Niciun mesaj trimis" : "Niciun mesaj"}
            </h3>
            <p className="text-gray-400 text-lg mb-8">
              {activeTab === "sent"
                ? "Trimite primul mesaj unui vânzător"
                : "Când vei primi mesaje, le vei vedea aici"}
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:via-[#8B5CF6] hover:to-[#6366F1] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Explorează anunțuri
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`relative bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border-2 hover:border-[#6366F1]/50 hover:shadow-2xl hover:shadow-[#6366F1]/20 transition-all duration-300 cursor-pointer group overflow-hidden ${
                  message.unread ? "border-[#6366F1]/30 shadow-lg shadow-[#6366F1]/10" : "border-slate-700/50 shadow-sm"
                }`}
              >
                {/* Animated background blob */}
                {message.unread && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#6366F1]/30 to-[#8B5CF6]/30 rounded-full filter blur-3xl animate-pulse"></div>
                )}
                
                <div className="relative flex items-start gap-5">
                  {/* Avatar */}
                  <div className="w-14 h-14 bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg">
                    {message.avatar}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-black text-xl text-white mb-1 group-hover:bg-gradient-to-r group-hover:from-[#6366F1] group-hover:to-[#7C3AED] group-hover:bg-clip-text group-hover:text-transparent transition">
                          {message.sender}
                        </h3>
                        <p className="text-sm text-gray-400 font-semibold">
                          Re: {message.listingTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
                          {message.time}
                        </span>
                        {message.unread && (
                          <span className="w-3 h-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full animate-pulse shadow-lg"></span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-300 font-medium mb-5 line-clamp-2">
                      {message.preview}
                    </p>

                    <div className="flex gap-3">
                      <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:via-[#8B5CF6] hover:to-[#6366F1] text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                        Răspunde
                      </button>
                      <button className="flex items-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-gray-300 hover:text-[#8B5CF6] rounded-xl font-bold text-sm transition-all border-2 border-slate-600/50 hover:border-[#6366F1]/50 shadow-sm hover:shadow-md">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Marchează ca citit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State for Sent Messages */}
        {activeTab === "sent" && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#6366F1] via-[#8B5CF6] to-[#7C3AED] rounded-full mb-6 shadow-2xl animate-pulse">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Niciun mesaj trimis</h3>
            <p className="text-gray-400 text-lg">
              Mesajele pe care le trimiți vânzătorilor vor apărea aici
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
