import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../lib/api";
import {
  cleanPlaybookText,
  isPlaybookCategory,
  ReplyPlaybook,
} from "../../lib/playbooks";
import { getSupabaseAdmin, requireApprovedUser } from "../../lib/supabase";

type PlaybookBody = {
  title?: unknown;
  category?: unknown;
  guidance?: unknown;
  defaultCta?: unknown;
  enabled?: unknown;
};

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const { data, error } = await getSupabaseAdmin()
    .from("reply_playbooks")
    .select("id,user_id,user_email,title,category,guidance,default_cta,enabled,created_at,updated_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })
    .returns<ReplyPlaybook[]>();

  if (error) {
    if (error.message.toLowerCase().includes("reply_playbooks")) {
      return NextResponse.json({ playbooks: [] });
    }

    console.error("Reply playbook lookup failed", error);
    return jsonError("Could not load reply playbooks.", 500);
  }

  return NextResponse.json({ playbooks: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
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
    .insert({
      user_id: auth.user.id,
      user_email: auth.user.email,
      title,
      category: body.category,
      guidance,
      default_cta: defaultCta || null,
      enabled,
    })
    .select("id,user_id,user_email,title,category,guidance,default_cta,enabled,created_at,updated_at")
    .single<ReplyPlaybook>();

  if (error) {
    console.error("Reply playbook create failed", error);
    return jsonError("Could not save reply playbook.", 500);
  }

  return NextResponse.json({ playbook: data });
}
