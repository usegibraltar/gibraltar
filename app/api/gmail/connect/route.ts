import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { signState } from "../../../lib/crypto";
import { getGmailAuthUrl } from "../../../lib/gmail";
import { requireApprovedUser } from "../../../lib/supabase";

export async function GET(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  const state = signState({
    userId: auth.user.id,
    email: auth.user.email,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return NextResponse.json({ url: getGmailAuthUrl(state) });
}
