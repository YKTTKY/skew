import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

/**
 * Public landing. Authenticated Retail Traders can open the Dashboard;
 * visitors can sign up or sign in. Research surfaces stay behind auth.
 */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">Skew</span>
        <nav className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Pre-Trade Research for retail traders
        </h1>
        <p className="text-lg leading-relaxed text-zinc-600">
          Skew gathers news, clusters Stories, and scores Bias and Sentiment per
          Instrument — so you can understand narrative before you trade. Skew
          never issues buy, sell, or hold recommendations.
        </p>
        <Show when="signed-out">
          <div className="flex flex-wrap gap-3">
            <SignUpButton mode="modal">
              <button
                type="button"
                className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Create account
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Sign in
              </button>
            </SignInButton>
          </div>
        </Show>
        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="inline-flex w-fit rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Open Dashboard
          </Link>
        </Show>
      </main>
    </div>
  );
}
