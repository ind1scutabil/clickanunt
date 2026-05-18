"use client";

import Link from "next/link";
import {
  ADMIN_COMMAND_CARDS,
  ADMIN_COMMAND_CENTER_HEADING,
  ADMIN_MODERATION_QUICK_LINKS,
  ADMIN_SECONDARY_LINKS,
  type AdminCommandCenterStats,
  resolveAdminCardCount,
  resolveQuickLinkCount,
} from "@/app/components/admin/admin-command-center-config";

type Props = {
  stats: AdminCommandCenterStats;
};

function CountBadge({ count, label }: { count: number; label?: string }) {
  return (
    <p className="mt-2 font-mono text-xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)] sm:text-2xl">
      {count}
      {label ? (
        <span className="ml-1.5 text-[11px] font-normal text-[var(--text-muted)]">{label}</span>
      ) : null}
    </p>
  );
}

export default function AdminCommandCenter({ stats }: Props) {
  return (
    <section
      className="mb-7"
      aria-labelledby="admin-command-center-heading"
      data-testid="admin-command-center"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Navigare admin
          </p>
          <h2
            id="admin-command-center-heading"
            className="text-lg font-semibold tracking-tight text-[var(--text-primary)] sm:text-xl"
          >
            {ADMIN_COMMAND_CENTER_HEADING}
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-snug text-[var(--text-tertiary)]">
            Acces rapid la zonele operaționale — fără a deschide meniul Cont.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[12px]">
          {ADMIN_SECONDARY_LINKS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-lg border border-white/[0.1] bg-[var(--bg-secondary)] px-3 py-1.5 font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {ADMIN_COMMAND_CARDS.map((card) => {
          const count = resolveAdminCardCount(card, stats);
          return (
            <Link
              key={card.id}
              href={card.href}
              data-testid={`admin-command-card-${card.id}`}
              className="group flex min-h-[8.5rem] flex-col rounded-xl border border-white/[0.08] bg-[var(--bg-elevated)]/95 p-4 shadow-[var(--shadow-md)] ring-1 ring-inset ring-white/[0.03] transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-[var(--border-focus)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <div
                className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg text-base ${card.iconWrapClass}`}
                aria-hidden
              >
                {card.icon}
              </div>
              <h3 className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
                {card.title}
              </h3>
              <p className="mt-1 flex-1 text-[12px] leading-snug text-[var(--text-tertiary)]">
                {card.description}
              </p>
              {count !== null && card.countLabel ? (
                <CountBadge count={count} label={card.countLabel} />
              ) : (
                <p className="mt-2 text-[12px] font-semibold text-[var(--accent-secondary)]">
                  {card.openLabel ?? "Deschide →"}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <div
        className="mt-4 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-[var(--bg-elevated)]/90 p-4 ring-1 ring-inset ring-violet-500/10"
        data-testid="admin-moderation-quick-links"
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
              Prioritate
            </p>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Moderare — control rapid
            </h3>
          </div>
          <Link
            href="/admin/moderation"
            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-lg bg-violet-600/90 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            data-testid="admin-moderation-open-all"
          >
            Panou moderare complet
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {ADMIN_MODERATION_QUICK_LINKS.map((link) => {
            const count = resolveQuickLinkCount(link, stats);
            return (
              <Link
                key={link.id}
                href={link.href}
                data-testid={`admin-moderation-link-${link.id}`}
                className="inline-flex min-h-[2.5rem] max-w-full items-center gap-2 rounded-lg border border-white/[0.1] bg-[var(--bg-primary)]/60 px-3 py-2 text-[12px] font-medium text-[var(--text-secondary)] transition hover:border-violet-500/35 hover:bg-violet-500/10 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <span className="truncate">{link.label}</span>
                {count !== null ? (
                  <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-amber-100">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
