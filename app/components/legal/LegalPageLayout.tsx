import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPageLayout({
  title,
  accentClassName = "text-[#FF7900]",
  children,
}: {
  title: string;
  accentClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-sm text-gray-400">
          <Link href="/" className="text-[#FF7900] hover:underline">
            ← Acasă
          </Link>
        </div>
        <h1 className={`mb-8 text-4xl font-bold ${accentClassName}`}>{title}</h1>
        <div className="space-y-8 text-gray-300">{children}</div>
      </div>
    </div>
  );
}
