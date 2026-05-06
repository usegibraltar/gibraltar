import { NextResponse } from "next/server";
import { getSiteUrl } from "../../../lib/env";
import { isValidEmail, normalizeEmail } from "../../../lib/email";
import { jsonError } from "../../../lib/api";
import {
  getSupabaseAdmin,
  getSupabasePublic,
  isAdminEmail,
} from "../../../lib/supabase";

type RequestLoginBody = {
  email?: unknown;
};

export async function POST(request: Request) {
  let body: RequestLoginBody;

  try {
    body = (await request.json()) as RequestLoginBody;
  } catch {
    return jsonError("Please enter a valid email address.");
  }

  const email = normalizeEmail(body.email);

  if (!isValidEmail(email)) {
    return jsonError("Please enter a valid email address.");
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("early_access_signups")
    .select("status")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Early access login lookup failed", error);
    return jsonError("We could not check your early access status just now.", 500);
  }

  if (data?.status !== "approved" && !isAdminEmail(email)) {
    return jsonError("That email is not approved for early access yet.", 403);
  }

  const supabase = getSupabasePublic();
  const { error: loginError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      shouldCreateUser: true,
    },
  });

  if (loginError) {
    console.error("Early access login request failed", loginError);

    if (loginError.status === 429 || loginError.code === "over_email_send_rate_limit") {
      return jsonError(
        "Supabase is rate-limiting login emails for this address. Wait a minute, then try again.",
        429,
      );
    }

    return jsonError(
      "We could not send a login email. Please check your Supabase Auth email settings.",
      500,
    );
  }

  return NextResponse.json({ ok: true });
}
