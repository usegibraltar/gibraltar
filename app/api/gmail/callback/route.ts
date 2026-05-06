import { NextResponse } from "next/server";
import { logAuditEvent } from "../../../lib/audit";
import { encryptSecret, verifyState } from "../../../lib/crypto";
import { exchangeGoogleCode, getGoogleProfile } from "../../../lib/gmail";
import { getSupabaseAdmin } from "../../../lib/supabase";

type GmailOAuthState = {
  userId: string;
  email: string;
  expiresAt: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/app?gmail=error&message=${encodeURIComponent(error)}`, url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/app?gmail=error&message=Missing%20OAuth%20code", url));
  }

  try {
    const verified = verifyState<GmailOAuthState>(state);

    if (verified.expiresAt < Date.now()) {
      throw new Error("OAuth state expired.");
    }

    const tokens = await exchangeGoogleCode(code);
    const gmailEmail = await getGoogleProfile(tokens.access_token ?? "");
    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

    const connectionUpdate: Record<string, string | null> = {
      user_id: verified.userId,
      user_email: verified.email,
      gmail_email: gmailEmail,
      access_token_encrypted: tokens.access_token
        ? encryptSecret(tokens.access_token)
        : null,
      scope: tokens.scope ?? null,
      token_type: tokens.token_type ?? null,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    };

    if (tokens.refresh_token) {
      connectionUpdate.refresh_token_encrypted = encryptSecret(tokens.refresh_token);
    }

    const { error: upsertError } = await getSupabaseAdmin()
      .from("gmail_connections")
      .upsert(connectionUpdate, {
        onConflict: "user_id",
      });

    if (upsertError) {
      throw new Error(`Could not save Gmail connection: ${upsertError.message}`);
    }

    await logAuditEvent({
      actorUserId: verified.userId,
      actorEmail: verified.email,
      eventType: "gmail_connected",
      metadata: { gmailEmail },
    });

    return NextResponse.redirect(new URL("/app?gmail=connected", url));
  } catch (callbackError) {
    console.error("Gmail OAuth callback failed", callbackError);
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Could not connect Gmail.";

    return NextResponse.redirect(
      new URL(`/app?gmail=error&message=${encodeURIComponent(message)}`, url),
    );
  }
}
