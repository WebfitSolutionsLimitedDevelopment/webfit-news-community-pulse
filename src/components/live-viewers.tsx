"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ROOM = "webfit:results-2026:viewers:v1";
const STORAGE_KEY = "webfit:results-2026:viewer";

export function LiveViewers() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let viewer: string = crypto.randomUUID();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) viewer = saved;
      else localStorage.setItem(STORAGE_KEY, viewer);
    } catch {
      // A tab can still join when browser storage is disabled.
    }

    const supabase = createClient();
    const channel = supabase.channel(ROOM, { config: { presence: { key: viewer } } });
    let connected = false;
    let disposed = false;

    const updateCount = () => {
      if (disposed || !connected) return;
      setCount(Object.keys(channel.presenceState()).length);
    };
    const updateVisibility = async () => {
      if (!connected || disposed) return;
      if (document.visibilityState === "visible") {
        const result = await channel.track({ viewing: true });
        if (result !== "ok" && !disposed) setCount(null);
      } else {
        await channel.untrack();
      }
    };

    channel.on("presence", { event: "sync" }, updateCount).subscribe((status) => {
      if (disposed) return;
      connected = status === "SUBSCRIBED";
      if (connected) void updateVisibility();
      else setCount(null);
    });
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      disposed = true;
      connected = false;
      document.removeEventListener("visibilitychange", updateVisibility);
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold normal-case tracking-normal text-slate-500"
      title="Active browsers viewing this results page. Multiple visible tabs in the same browser count once. Updates as viewers join or leave."
      aria-label={count === null ? "Connecting to live viewer count" : count.toLocaleString("en-NZ") + " active browsers watching now"}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
      <span className="tabular-nums">{count === null ? "Viewers —" : count.toLocaleString("en-NZ") + " watching now"}</span>
    </span>
  );
}
