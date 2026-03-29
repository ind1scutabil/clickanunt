"use client";

import dynamic from "next/dynamic";

const DashboardMessagesPage = dynamic(
  () => import("@/app/dashboard/messages/page"),
  {
    ssr: false,
    loading: () => (
      <div className="enterprise-page-bg enterprise-mesh flex min-h-screen flex-col text-white">
        <div className="h-14 animate-pulse border-b border-white/10 bg-[var(--bg-elevated)]/40" />
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
          <div className="mb-8 space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-64 max-w-full animate-pulse rounded-lg bg-white/10" />
          </div>
          <div className="grid h-[min(70vh,640px)] grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] animate-pulse" />
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] animate-pulse md:col-span-2" />
          </div>
        </div>
      </div>
    ),
  }
);

export default function MessagesPage() {
  return <DashboardMessagesPage />;
}
