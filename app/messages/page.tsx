"use client";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useState } from "react";

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "sent">("all");

  // No messages - clean database
  const messages: any[] = [];

  const filteredMessages = messages.filter((msg) => {
    if (activeTab === "unread") return msg.unread;
    if (activeTab === "sent") return false; // Mock: no sent messages yet
    return true;
  });

  // Empty state component
  const EmptyState = ({ tab }: { tab: string }) => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-32 h-32 mb-6 relative">
        <svg viewBox="0 0 200 200" className="w-full h-full text-white/10">
          <circle cx="100" cy="100" r="80" fill="currentColor" />
          <path 
            d="M60 80 L100 110 L140 80 M60 80 L60 130 L140 130 L140 80" 
            stroke="currentColor" 
            strokeWidth="8" 
            fill="none" 
            className="text-white/20"
          />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">
        {tab === "all" && "Niciun mesaj încă"}
        {tab === "unread" && "Toate mesajele sunt citite"}
        {tab === "sent" && "Nu ai trimis mesaje"}
      </h3>
      <p className="text-white/60 mb-8 max-w-md text-center leading-relaxed">
        {tab === "all" && "Când cineva îți trimite un mesaj despre anunțurile tale, îl vei vedea aici."}
        {tab === "unread" && "Bravo! Ai răspuns la toate mesajele primite."}
        {tab === "sent" && "Când contactezi un vânzător, conversațiile vor apărea aici."}
      </p>
      <Link href="/listings">
        <button className="px-6 py-3 bg-gradient-to-r from-[#6D5BFF] to-[#00D4FF] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-[#6D5BFF]/30 transition-all">
          Explorează Anunțuri
        </button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F1117]">
      
      <Navbar />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Header with 3D effect */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            <span className="text-white">Mesajele</span>
            <span className="text-white/80"> mele</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Gestionează conversațiile tale cu cumpărătorii și vânzătorii
          </p>
        </div>

        {/* Tabs with glass effect */}
        <div className="mb-8">
          <div className="flex gap-2 bg-[#161B22] border border-white/5 rounded-[14px] p-1.5">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 h-11 px-4 font-semibold text-base transition-all rounded-[12px] border ${
                activeTab === "all"
                  ? "bg-[#1C212B] border-white/10 text-white"
                  : "border-transparent text-white/70 hover:bg-white/5"
              }`}
            >
              Toate
              <span className="ml-2 px-2.5 py-0.5 bg-white/10 border border-white/10 text-white/70 rounded-full text-xs font-semibold">
                {messages.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`flex-1 h-11 px-4 font-semibold text-base transition-all rounded-[12px] border ${
                activeTab === "unread"
                  ? "bg-[#1C212B] border-white/10 text-white"
                  : "border-transparent text-white/70 hover:bg-white/5"
              }`}
            >
              Necitite
              <span className="ml-2 px-2.5 py-0.5 bg-white/10 border border-white/10 text-white/70 rounded-full text-xs font-semibold">
                {messages.filter((m) => m.unread).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("sent")}
              className={`flex-1 h-11 px-4 font-semibold text-base transition-all rounded-[12px] border ${
                activeTab === "sent"
                  ? "bg-[#1C212B] border-white/10 text-white"
                  : "border-transparent text-white/70 hover:bg-white/5"
              }`}
            >
              Trimise
              <span className="ml-2 px-2.5 py-0.5 bg-white/10 border border-white/10 text-white/70 rounded-full text-xs font-semibold">0</span>
            </button>
          </div>
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="max-w-[520px] mx-auto mt-10 text-center bg-[#161B22] border border-white/5 rounded-2xl p-7 md:p-8 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 border border-white/10 rounded-2xl mb-5">
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
            <p className="text-white/70 text-base leading-relaxed mb-6">
              {activeTab === "sent"
                ? "Trimite primul mesaj unui vânzător"
                : "Când vei primi mesaje, le vei vedea aici"}
            </p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-3 h-11 px-6 rounded-[12px] bg-gradient-to-r from-[#6D5BFF] to-[#4F46E5] hover:from-[#5B4BFF] hover:to-[#4338CA] text-white font-semibold shadow-[0_18px_50px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]"
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
                className={`relative bg-[#161B22] rounded-2xl p-6 border border-white/5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition-all duration-300 cursor-pointer group hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.40)] ${
                  message.unread ? "border-white/10" : "border-white/5"
                }`}
              >
                <div className="relative flex items-start gap-5">
                  {/* Avatar */}
                  <div className="w-14 h-14 bg-[#1C212B] border border-white/10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {message.avatar}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-xl text-white mb-1">
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
                          <span className="w-2.5 h-2.5 bg-white/70 rounded-full"></span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-300 font-medium mb-5 line-clamp-2">
                      {message.preview}
                    </p>

                    <div className="flex gap-3">
                      <button className="flex items-center gap-2 h-11 px-5 bg-gradient-to-r from-[#6D5BFF] to-[#4F46E5] hover:from-[#5B4BFF] hover:to-[#4338CA] text-white rounded-[12px] font-semibold text-sm transition-all shadow-[0_18px_50px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]">
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
                      <button className="flex items-center gap-2 h-11 px-5 bg-[#1C212B] hover:bg-[#222836] text-white/80 hover:text-white rounded-[12px] font-semibold text-sm transition-all border border-white/5 hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(99,102,241,0.35)]">
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
          <div className="max-w-[520px] mx-auto mt-10 text-center bg-[#161B22] border border-white/5 rounded-2xl p-7 md:p-8 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 border border-white/10 rounded-2xl mb-5">
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
            <p className="text-white/70 text-base leading-relaxed">
              Mesajele pe care le trimiți vânzătorilor vor apărea aici
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
