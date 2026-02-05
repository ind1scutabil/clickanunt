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
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-4">
            <span className="text-white">Mesajele </span>
            <span className="neon-text bg-clip-text text-transparent bg-gradient-to-r from-[#FF7900] to-[#FFB84D]">
              mele
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Gestionează conversațiile tale cu cumpărătorii și vânzătorii
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-4 px-6 font-bold text-lg transition-all ${
              activeTab === "all"
                ? "border-b-4 border-[#FF7900] text-[#FF7900]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Toate
            <span className="ml-2 px-2 py-1 bg-[#2A2A2A] rounded-full text-xs">
              {messages.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`pb-4 px-6 font-bold text-lg transition-all ${
              activeTab === "unread"
                ? "border-b-4 border-[#FF7900] text-[#FF7900]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Necitite
            <span className="ml-2 px-2 py-1 bg-[#FF7900] rounded-full text-xs">
              {messages.filter((m) => m.unread).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`pb-4 px-6 font-bold text-lg transition-all ${
              activeTab === "sent"
                ? "border-b-4 border-[#FF7900] text-[#FF7900]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Trimise
            <span className="ml-2 px-2 py-1 bg-[#2A2A2A] rounded-full text-xs">0</span>
          </button>
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-full mb-6">
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
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-[0_0_30px_rgba(255,121,0,0.5)]"
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
          <div className="space-y-4">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`glass-dark rounded-xl p-6 border-2 hover:border-[#FF7900] transition-all cursor-pointer group ${
                  message.unread ? "border-[#FF7900]/30" : "border-[#2A2A2A]"
                }`}
              >
                <div className="flex items-start gap-5">
                  {/* Avatar */}
                  <div className="w-14 h-14 bg-gradient-to-br from-[#FF7900] to-[#E66D00] rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                    {message.avatar}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-black text-xl text-white mb-1 group-hover:text-[#FF7900] transition">
                          {message.sender}
                        </h3>
                        <p className="text-sm text-gray-400 font-medium">
                          Re: {message.listingTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 font-medium whitespace-nowrap">
                          {message.time}
                        </span>
                        {message.unread && (
                          <span className="w-3 h-3 bg-[#FF7900] rounded-full animate-pulse"></span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-300 font-medium mb-4 line-clamp-2">
                      {message.preview}
                    </p>

                    <div className="flex gap-3">
                      <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF7900] to-[#E66D00] hover:from-[#E66D00] hover:to-[#FF7900] text-white rounded-lg font-bold text-sm transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                        Răspunde
                      </button>
                      <button className="flex items-center gap-2 px-5 py-2.5 glass-dark hover:bg-white/10 text-white rounded-lg font-bold text-sm transition-all border border-[#2A2A2A]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#1E90FF] to-[#4DA6FF] rounded-full mb-6">
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
