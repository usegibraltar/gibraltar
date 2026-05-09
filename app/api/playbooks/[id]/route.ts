import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import {
  cleanPlaybookText,
  isPlaybookCategory,
  ReplyPlaybook,
} from "../../../lib/playbooks";
import { getSupabaseAdmin, requireApprovedUser } from "../../../lib/supabase";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type PlaybookBody = {
  title?: unknown;
  category?: unknown;
  guidance?: unknown;
  defaultCta?: unknown;
  enabled?: unknown;
};

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;

  if (!id) {
    return jsonError("Choose a reply playbook first.");
  }

  let body: PlaybookBody;

  try {
    body = (await request.json()) as PlaybookBody;
  } catch {
    return jsonError("Please send a valid reply playbook.");
  }

  const title = cleanPlaybookText(body.title, 80);
  const guidance = cleanPlaybookText(body.guidance, 1400);
  const defaultCta = cleanPlaybookText(body.defaultCta, 240);
  const enabled = body.enabled !== false;

  if (!title || !guidance || !isPlaybookCategory(body.category)) {
    return jsonError("Add a title, category, and guidance for this playbook.");
  }

  const { data, error } = await getSupabaseAdmin()
    .from("reply_playbooks")
    .update({
      title,
      category: body.category,
      guidance,
      default_cta: defaultCta || null,
      enabled,
    })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id,user_id,user_email,title,category,guidance,default_cta,enabled,created_at,updated_at")
    .maybeSingle<ReplyPlaybook>();

  if (error) {
    console.error("Reply playbook update failed", error);
    return jsonError("Could not update reply playbook.", 500);
  }

  if (!data) {
    return jsonError("Reply playbook not found.", 404);
  }

  return NextResponse.json({ playbook: data });
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;

  if (!id) {
    return jsonError("Choose a reply playbook first.");
  }

  const { error } = await getSupabaseAdmin()
    .from("reply_playbooks")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("Reply playbook delete failed", error);
    return jsonError("Could not delete reply playbook.", 500);
  }

  return NextResponse.json({ ok: true });
}
