export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-800",
    paused: "bg-amber-100 text-amber-800",
    closed: "bg-neutral-200 text-neutral-700",
    scheduled: "bg-blue-100 text-blue-800",
    draft: "bg-violet-100 text-violet-800",
    archived: "bg-neutral-900 text-white",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
        styles[status] || "bg-neutral-100 text-neutral-700"
      }`}
    >
      {status}
    </span>
  );
}
