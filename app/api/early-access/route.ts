import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "../../lib/email";

type EarlyAccessRequest = {
  email?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: EarlyAccessRequest;

  try {
    body = (await request.json()) as EarlyAccessRequest;
  } catch {
    return jsonError("Please enter a valid email address.");
  }

  const email = normalizeEmail(body.email);

  if (!isValidEmail(email)) {
    return jsonError("Please enter a valid email address.");
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError(
      "Early access is not connected yet. Add your Supabase environment variables and restart the server.",
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const { error } = await supabase.from("early_access_signups").insert({
    email,
    source: "landing_page",
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }

    console.error("Early access signup failed", error);

    if (error.code === "42P01") {
      return jsonError(
        "Supabase is connected, but the early_access_signups table does not exist yet. Run supabase/early-access.sql in your Supabase SQL editor.",
        500,
      );
    }

    if (error.code === "42501") {
      return jsonError(
        "Supabase blocked the signup save. Make sure SUPABASE_SERVICE_ROLE_KEY is your service role key, not the anon key.",
        500,
      );
    }

    return jsonError(
      "We could not save that email just now. Please check your Supabase project settings and try again.",
      500,
    );
  }

  return NextResponse.json({ ok: true });
}
