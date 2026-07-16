import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("site_settings")
    .select("setting_key, setting_value, is_public")
    .order("setting_key");

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b88a2a]">
        Platform settings
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Site configuration</h1>
      <p className="mt-3 max-w-2xl text-neutral-600">
        These settings are loaded from Supabase. Editing controls can be added in the next phase.
      </p>

      <div className="mt-8 space-y-4">
        {settings?.map((item) => (
          <div key={item.setting_key} className="rounded-[1.5rem] border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">{item.setting_key}</h2>
              <span className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                {item.is_public ? "Public" : "Private"}
              </span>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-100">
              {JSON.stringify(item.setting_value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
