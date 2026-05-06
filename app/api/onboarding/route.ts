import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../lib/api";
import { getSupabaseAdmin, requireApprovedUser } from "../../lib/supabase";

type OnboardingBody = {
  eventKey?: unknown;
};

const allowedEvents = new Set(["first_reply_generated", "first_email_created"]);

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("user_onboarding_events")
    .select("event_key,created_at")
    .eq("user_id", auth.user.id);

  if (error) {
    if (error.message.toLowerCase().includes("user_onboarding_events")) {
      return NextResponse.json({ events: [] });
    }

    console.error("Onboarding event lookup failed", error);
    return jsonError("Could not load onboarding progress.", 500);
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  let body: OnboardingBody;

  try {
    body = (await request.json()) as OnboardingBody;
  } catch {
    return jsonError("Could not save onboarding progress.");
  }

  const eventKey = typeof body.eventKey === "string" ? body.eventKey : "";

  if (!allowedEvents.has(eventKey)) {
    return jsonError("Unknown onboarding event.");
  }

  const { error } = await getSupabaseAdmin().from("user_onboarding_events").upsert(
    {
      user_id: auth.user.id,
      user_email: auth.user.email,
      event_key: eventKey,
    },
    { onConflict: "user_id,event_key" },
  );

  if (error) {
    if (error.message.toLowerCase().includes("user_onboarding_events")) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    console.error("Onboarding event save failed", error);
    return jsonError("Could not save onboarding progress.", 500);
  }

  return NextResponse.json({ ok: true });
}
