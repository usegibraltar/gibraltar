import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../lib/api";
import { getSupabaseAdmin, requireApprovedUser } from "../../lib/supabase";

type ProfileBody = {
  businessName?: unknown;
  businessType?: unknown;
  replyTone?: unknown;
  services?: unknown;
  bookingLink?: unknown;
  phone?: unknown;
  hours?: unknown;
  neverPromise?: unknown;
  voiceProfile?: unknown;
};

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("business_profiles")
    .select("business_name,business_type,reply_tone,services,booking_link,phone,hours,never_promise,voice_profile,voice_sample_count,voice_learned_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("Business profile lookup failed", error);
    return jsonError("Could not load business profile.", 500);
  }

  return NextResponse.json({
    profile: {
      businessName: data?.business_name ?? "",
      businessType: data?.business_type ?? "",
      replyTone: data?.reply_tone ?? "Friendly",
      services: data?.services ?? "",
      bookingLink: data?.booking_link ?? "",
      phone: data?.phone ?? "",
      hours: data?.hours ?? "",
      neverPromise: data?.never_promise ?? "",
      voiceProfile: data?.voice_profile ?? "",
      voiceSampleCount: data?.voice_sample_count ?? 0,
      voiceLearnedAt: data?.voice_learned_at ?? null,
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  let body: ProfileBody;

  try {
    body = (await request.json()) as ProfileBody;
  } catch {
    return jsonError("Please send a valid business profile.");
  }

  const { error } = await getSupabaseAdmin().from("business_profiles").upsert(
    {
      user_id: auth.user.id,
      user_email: auth.user.email,
      business_name: cleanText(body.businessName, 120),
      business_type: cleanText(body.businessType, 80),
      reply_tone: cleanText(body.replyTone, 40) || "Friendly",
      services: cleanText(body.services, 1000),
      booking_link: cleanText(body.bookingLink, 240),
      phone: cleanText(body.phone, 80),
      hours: cleanText(body.hours, 240),
      never_promise: cleanText(body.neverPromise, 600),
      voice_profile: cleanText(body.voiceProfile, 1400),
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    console.error("Business profile save failed", error);
    return jsonError("Could not save business profile.", 500);
  }

  return NextResponse.json({ ok: true });
}
