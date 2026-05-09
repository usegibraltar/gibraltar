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
  if (playbookId) {
    const explicit = playbooks.find((playbook) => playbook.id === playbookId);

    if (explicit) {
      return explicit;
    }
  }

  const normalizedCategory = category === "complaint" ? "complaint" : category;

  return (
    playbooks.find((playbook) => playbook.category === normalizedCategory) ??
    playbooks.find((playbook) => playbook.category === "general") ??
    null
  );
}
