import { NextResponse } from "next/server";
import { logAuditEvent } from "../../../../../lib/audit";
import { getSiteUrl } from "../../../../../lib/env";
import { getBearerToken, jsonError } from "../../../../../lib/api";
import { getSupabaseAdmin, getSupabasePublic, requireAdminUser } from "../../../../../lib/supabase";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdminUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: signup, error: lookupError } = await supabase
    .from("early_access_signups")
    .select("email")
    .eq("id", id)
    .maybeSingle();

  if (lookupError || !signup?.email) {
    return jsonError("Could not find that signup.", 404);
  }

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Supabase auth user list failed", listError);
    return jsonError("Could not check Supabase Auth users.", 500);
  }

  const existingUser = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === signup.email.toLowerCase(),
  );

  if (!existingUser) {
    const { error: createError } = await supabase.auth.admin.createUser({
      email: signup.email,
      email_confirm: true,
    });

    if (createError) {
      console.error("Supabase auth user creation failed", createError);
      return jsonError("Could not create the approved Supabase Auth user.", 500);
    }
  }

  const { error } = await supabase
    .from("early_access_signups")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: auth.user.email,
      rejected_at: null,
    })
    .eq("id", id);

  if (error) {
    console.error("Approve signup failed", error);
    return jsonError("Could not approve that signup.", 500);
  }

  await logAuditEvent({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    eventType: "admin_approved_user",
    targetEmail: signup.email,
    metadata: { signupId: id },
  });

  const { error: notifyError } = await getSupabasePublic().auth.signInWithOtp({
    email: signup.email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      shouldCreateUser: true,
    },
  });

  if (notifyError) {
    console.warn("Approval notification email failed", notifyError);
  }

  return NextResponse.json({ ok: true, notificationSent: !notifyError });
}
