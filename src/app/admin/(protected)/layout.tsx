import Link from "next/link";
import { BarChart3, Home, LogOut, PlusCircle, Settings } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#f3efe7]">
      <header className="border-b border-black/10 bg-[#171717] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#7b1025]">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#e9c96d]">
                Webfit News
              </p>
              <p className="font-semibold">Community Pulse Admin</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold">{profile.full_name}</p>
              <p className="text-xs text-white/50">{profile.role}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:grid-cols-[220px_1fr] md:px-8">
        <aside className="h-fit rounded-[1.5rem] border border-black/10 bg-white p-3">
          <nav className="space-y-1 text-sm font-semibold">
            <Link className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-neutral-100" href="/admin">
              <Home size={17} /> Dashboard
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-neutral-100" href="/admin/polls/new">
              <PlusCircle size={17} /> New poll
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-neutral-100" href="/admin/settings">
              <Settings size={17} /> Settings
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-neutral-100" href="/">
              <BarChart3 size={17} /> Public site
            </Link>
          </nav>
        </aside>

        <section>{children}</section>
      </div>
    </div>
  );
}
