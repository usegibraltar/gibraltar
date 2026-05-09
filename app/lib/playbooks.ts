import { getSupabaseAdmin } from "./supabase";

export const playbookCategories = [
  "pricing",
  "booking",
  "cancellation",
  "complaint",
  "follow_up",
  "general",
] as const;

export type PlaybookCategory = (typeof playbookCategories)[number];

export type ReplyPlaybook = {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  category: PlaybookCategory;
  guidance: string;
  default_cta: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PlaybookMatch = {
  playbook: ReplyPlaybook | null;
  reason: string;
  selection: "auto" | "explicit" | "none" | "fallback" | "unavailable";
};

export function isPlaybookCategory(value: unknown): value is PlaybookCategory {
  return typeof value === "string" && playbookCategories.includes(value as PlaybookCategory);
}

export function cleanPlaybookText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function loadEnabledPlaybooks(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("reply_playbooks")
    .select("id,user_id,user_email,title,category,guidance,default_cta,enabled,created_at,updated_at")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("created_at", { ascending: true })
    .returns<ReplyPlaybook[]>();

  if (error) {
    if (error.message.toLowerCase().includes("reply_playbooks")) {
      return [];
    }

    console.error("Reply playbook lookup failed", error);
    return [];
  }

  return data ?? [];
}

export function choosePlaybook({
  playbooks,
  playbookId,
  category,
}: {
  playbooks: ReplyPlaybook[];
  playbookId?: string;
  category?: string;
}) {
  return choosePlaybookMatch({ playbooks, playbookId, category }).playbook;
}

export function choosePlaybookMatch({
  playbooks,
  playbookId,
  category,
}: {
  playbooks: ReplyPlaybook[];
  playbookId?: string;
  category?: string;
}): PlaybookMatch {
  if (playbookId === "__none") {
    return {
      playbook: null,
      reason: "No playbook used because you selected no playbook for this draft.",
      selection: "none",
    };
  }

  if (playbookId) {
    const explicit = playbooks.find((playbook) => playbook.id === playbookId);

    if (explicit) {
      return {
        playbook: explicit,
        reason: `Manually selected ${explicit.title} for this draft.`,
        selection: "explicit",
      };
    }
  }

  const normalizedCategory = category === "complaint" ? "complaint" : category;
  const categoryMatch = playbooks.find((playbook) => playbook.category === normalizedCategory);

  if (categoryMatch) {
    return {
      playbook: categoryMatch,
      reason: `Matched because AI triage classified this email as ${playbookCategoryLabel(categoryMatch.category).toLowerCase()}.`,
      selection: "auto",
    };
  }

  const general = playbooks.find((playbook) => playbook.category === "general");

  if (general) {
    return {
      playbook: general,
      reason: "Used the general question playbook because no category-specific playbook matched.",
      selection: "fallback",
    };
  }

  return {
    playbook: null,
    reason: "No enabled playbook was available for this draft.",
    selection: "unavailable",
  };
}

export function playbookCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    pricing: "Pricing inquiry",
    booking: "Booking request",
    cancellation: "Cancellation/reschedule",
    complaint: "Complaint",
    follow_up: "Follow-up",
    general: "General question",
  };

  return labels[category] ?? "General question";
}
