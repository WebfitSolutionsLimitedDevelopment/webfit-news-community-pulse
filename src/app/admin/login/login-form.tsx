"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    searchParams.get("error") === "unauthorised"
      ? "This account is not authorised for the admin dashboard."
      : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="luxury-border w-full max-w-md rounded-[2rem] bg-white p-8 md:p-10">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[#7b1025] text-white">
          <LockKeyhole />
        </div>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.28em] text-[#b88a2a]">
          Secure administration
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Sign in to Community Pulse
        </h1>
        <p className="mt-3 leading-7 text-neutral-500">
          Authorised Webfit News team members only.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold">Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/15 px-4 py-3 outline-none focus:border-[#7b1025]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/15 px-4 py-3 outline-none focus:border-[#7b1025]"
            />
          </label>

          {message && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#7b1025] px-5 py-3 font-semibold text-white transition hover:bg-[#5d0b1c] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

