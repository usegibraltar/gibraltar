import { getSupabaseAdmin } from "./supabase";

type AuditEvent = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  eventType: string;
  targetUserId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(event: AuditEvent) {
  const { error } = await getSupabaseAdmin().from("audit_events").insert({
    actor_user_id: event.actorUserId ?? null,
    actor_email: event.actorEmail ?? null,
    event_type: event.eventType,
    target_user_id: event.targetUserId ?? null,
    target_email: event.targetEmail ?? null,
    metadata: event.metadata ?? null,
  });

  if (error) {
    console.warn("Audit event write failed", error.message);
  }
}
