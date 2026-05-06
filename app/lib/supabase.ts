import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

export type EarlyAccessStatus = "pending" | "approved" | "rejected";

export type EarlyAccessSignup = {
  id: string;
  email: string;
  source: string;
  status: EarlyAccessStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type GmailConnection = {
  id: string;
  user_id: string;
  user_email: string;
  gmail_email: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  scope: string | null;
  token_type: string | null;
  expires_at: string | null;
  connected_at: string;
  updated_at: string;
};

export function getSupabaseAdmin() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function getSupabasePublic() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

export async function getUserFromBearer(token: string): Promise<AuthenticatedUser | null> {
  if (!token) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user?.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email.toLowerCase(),
  };
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  return getAdminEmails().includes(email.toLowerCase());
}

export async function requireApprovedUser(token: string) {
  const user = await getUserFromBearer(token);

  if (!user) {
    return { user: null, error: "Please sign in first.", status: 401 };
  }

  if (isAdminEmail(user.email)) {
    return { user, error: null, status: 200 };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("early_access_signups")
    .select("status")
    .eq("email", user.email)
    .maybeSingle();

  if (error || data?.status !== "approved") {
    return {
      user: null,
      error: "Your early access invite is not approved yet.",
      status: 403,
    };
  }

  return { user, error: null, status: 200 };
}

export async function requireAdminUser(token: string) {
  const user = await getUserFromBearer(token);

  if (!user) {
    return { user: null, error: "Please sign in first.", status: 401 };
  }

  if (!isAdminEmail(user.email)) {
    return {
      user: null,
      error: "You do not have admin access.",
      status: 403,
    };
  }

  return { user, error: null, status: 200 };
}
