export default function MessagesLoading() {
  return (
    <div className="enterprise-page-bg enterprise-mesh flex min-h-screen flex-col text-white">
      <div className="h-14 animate-pulse border-b border-white/10 bg-[var(--bg-elevated)]/40" />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="mb-8 space-y-3">
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-10 w-64 max-w-full animate-pulse rounded-lg bg-white/10" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="grid h-[min(70vh,640px)] grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          <div className="animate-pulse rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/50" />
          <div className="animate-pulse rounded-2xl border border-white/[0.08] bg-[var(--bg-elevated)]/50 md:col-span-2" />
        </div>
      </div>
    </div>
  );
}
