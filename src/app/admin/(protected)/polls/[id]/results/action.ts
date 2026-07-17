"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reviewVote(formData: FormData) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const voteId = String(formData.get("vote_id") || "");
  const pollId = String(formData.get("poll_id") || "");
  const newStatus = String(formData.get("status") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!voteId || !pollId) {
    throw new Error("Missing vote information.");
  }

  if (!["valid", "flagged", "excluded"].includes(newStatus)) {
    throw new Error("Invalid vote status.");
  }

  const { data: previousVote, error: previousError } = await admin
    .from("votes")
    .select("*")
    .eq("id", voteId)
    .eq("poll_id", pollId)
    .single();

  if (previousError || !previousVote) {
    throw new Error("Vote not found.");
  }

  const updateData =
    newStatus === "excluded"
      ? {
          status: "excluded",
          exclusion_reason: reason || "Excluded during manual review",
          excluded_at: new Date().toISOString(),
          excluded_by: profile.id,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
        }
      : {
          status: newStatus,
          exclusion_reason: null,
          excluded_at: null,
          excluded_by: null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
        };

  const { error } = await admin
    .from("votes")
    .update(updateData)
    .eq("id", voteId);

  if (error) {
    throw new Error(error.message);
  }

  await admin.from("audit_logs").insert({
    actor_id: profile.id,
    actor_email: profile.email,
    action: "vote_reviewed",
    entity_type: "vote",
    entity_id: voteId,
    previous_data: previousVote,
    new_data: updateData,
    reason: reason || null,
  });

  revalidatePath(`/admin/polls/${pollId}`);
  revalidatePath(`/admin/polls/${pollId}/results`);
}