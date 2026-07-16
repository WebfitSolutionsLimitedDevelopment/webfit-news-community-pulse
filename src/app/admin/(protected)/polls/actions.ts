"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function createPoll(formData: FormData) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const payload = {
    internal_name: value(formData, "internal_name"),
    slug: value(formData, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    title: value(formData, "title"),
    question: value(formData, "question"),
    description: value(formData, "description") || null,
    methodology: value(formData, "methodology") || null,
    status: value(formData, "status") || "draft",
    results_visibility: value(formData, "results_visibility") || "private",
    is_public: formData.get("is_public") === "on",
    created_by: profile.id,
    updated_by: profile.id,
  };

  const { data, error } = await admin
    .from("polls")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: "poll_created",
    entity_type: "poll",
    entity_id: data.id,
    new_data: payload,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/polls/${data.id}`);
}

export async function updatePoll(formData: FormData) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();
  const id = value(formData, "id");

  const { data: previous } = await admin.from("polls").select("*").eq("id", id).single();

  const payload = {
    title: value(formData, "title"),
    question: value(formData, "question"),
    description: value(formData, "description") || null,
    methodology: value(formData, "methodology") || null,
    status: value(formData, "status"),
    results_visibility: value(formData, "results_visibility"),
    is_public: formData.get("is_public") === "on",
    updated_by: profile.id,
  };

  const { error } = await admin.from("polls").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: "poll_updated",
    entity_type: "poll",
    entity_id: id,
    previous_data: previous,
    new_data: payload,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/polls/${id}`);
}

export async function addPollOption(formData: FormData) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();
  const pollId = value(formData, "poll_id");

  const { data: maxOrder } = await admin
    .from("poll_options")
    .select("display_order")
    .eq("poll_id", pollId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    poll_id: pollId,
    label: value(formData, "label"),
    short_label: value(formData, "short_label") || null,
    description: value(formData, "description") || null,
    logo_url: value(formData, "logo_url") || null,
    website_url: value(formData, "website_url") || null,
    display_order: (maxOrder?.display_order ?? -1) + 1,
    is_active: true,
  };

  const { data, error } = await admin.from("poll_options").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: "poll_option_added",
    entity_type: "poll_option",
    entity_id: data.id,
    new_data: payload,
  });

  revalidatePath(`/admin/polls/${pollId}`);
  revalidatePath("/");
}

export async function deletePollOption(formData: FormData) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();
  const optionId = value(formData, "option_id");
  const pollId = value(formData, "poll_id");

  const { data: option } = await admin.from("poll_options").select("*").eq("id", optionId).single();
  const { count } = await admin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("option_id", optionId);

  if ((count ?? 0) > 0) {
    throw new Error("This option already has votes and cannot be deleted. Deactivate it instead.");
  }

  const { error } = await admin.from("poll_options").delete().eq("id", optionId);
  if (error) throw new Error(error.message);

  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: "poll_option_deleted",
    entity_type: "poll_option",
    entity_id: optionId,
    previous_data: option,
  });

  revalidatePath(`/admin/polls/${pollId}`);
  revalidatePath("/");
}
