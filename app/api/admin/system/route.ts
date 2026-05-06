import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getSupabaseAdmin, requireAdminUser } from "../../../lib/supabase";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
  group: "environment" | "database" | "oauth" | "security" | "release";
};

function envCheck(name: string, publicSafe = false, group: Check["group"] = "environment"): Check {
  const value = process.env[name];

  return {
    name,
    ok: Boolean(value),
    group,
    detail: value
      ? publicSafe
        ? value
        : "Configured"
      : "Missing",
  };
}

export async function GET(request: Request) {
  const auth = await requireAdminUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const checks: Check[] = [
    envCheck("SUPABASE_URL", true),
    envCheck("NEXT_PUBLIC_SUPABASE_URL", true),
    envCheck("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    envCheck("SUPABASE_SERVICE_ROLE_KEY"),
    envCheck("ADMIN_EMAILS", true, "security"),
    envCheck("GOOGLE_CLIENT_ID", true, "oauth"),
    envCheck("GOOGLE_CLIENT_SECRET", false, "oauth"),
    envCheck("GOOGLE_REDIRECT_URI", true, "oauth"),
    envCheck("GMAIL_TOKEN_ENCRYPTION_KEY", false, "security"),
    envCheck("OPENAI_API_KEY"),
    envCheck("OPENAI_MODEL", true),
  ];

  const encryptionKey = process.env.GMAIL_TOKEN_ENCRYPTION_KEY ?? "";
  checks.push({
    name: "GMAIL_TOKEN_ENCRYPTION_KEY length",
    ok: encryptionKey.length >= 32,
    group: "security",
    detail: encryptionKey ? `${encryptionKey.length} characters` : "Missing",
  });

  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "";
  checks.push({
    name: "Google redirect route",
    ok: redirectUri.endsWith("/api/gmail/callback"),
    group: "oauth",
    detail: redirectUri || "Missing",
  });
  checks.push({
    name: "Privacy policy page",
    ok: true,
    group: "release",
    detail: "/privacy",
  });
  checks.push({
    name: "Terms page",
    ok: true,
    group: "release",
    detail: "/terms",
  });
  checks.push({
    name: "Google OAuth dashboard",
    ok: false,
    group: "release",
    detail: "Confirm app name, logo, support email, authorized domain, privacy URL, terms URL, and production publishing status in Google Cloud.",
  });
  checks.push({
    name: "Supabase custom auth domain optional",
    ok: true,
    group: "release",
    detail: "Optional paid upgrade for later. Current early access can keep the Supabase auth domain.",
  });

  const supabase = getSupabaseAdmin();
  const tables = [
    "early_access_signups",
    "gmail_connections",
    "gmail_draft_events",
    "business_profiles",
    "follow_up_reminders",
    "audit_events",
    "user_onboarding_events",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    checks.push({
      name: `table:${table}`,
      ok: !error,
      group: "database",
      detail: error?.message ?? "Reachable",
    });
  }

  return NextResponse.json({ checks });
}
