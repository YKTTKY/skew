import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

/**
 * Authenticated Dashboard shell chrome: branding, home nav, sign out via Clerk UserButton.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Skew
          </Link>
          <nav className="flex items-center gap-3 text-sm text-zinc-600">
            <Link href="/dashboard" className="hover:text-zinc-900">
              Watchlist
            </Link>
          </nav>
        </div>
        <UserButton />
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
