export function friendlyErrorMessage(value: unknown, fallback = "Something went wrong. Please try again.") {
  const message = value instanceof Error ? value.message : typeof value === "string" ? value : fallback;
  const lower = message.toLowerCase();

  if (lower.includes("redirect_uri_mismatch")) {
    return "Google rejected the connection because the redirect URL does not match the Google OAuth settings.";
  }

  if (lower.includes("invalid_grant") || lower.includes("refresh token")) {
    return "The Gmail connection expired. Reconnect Gmail in Settings, then try again.";
  }

  if (lower.includes("insufficient") || lower.includes("scope") || lower.includes("permission")) {
    return "Gmail needs permission to read messages and create drafts. Reconnect Gmail and approve the requested access.";
  }

  if (lower.includes("rate") || lower.includes("429")) {
    return "That action is being rate-limited. Wait a minute, then try again.";
  }

  if (lower.includes("supabase") || lower.includes("relation") || lower.includes("table")) {
    return "The database setup is not complete yet. Check the Admin system status or run the latest Supabase SQL.";
  }

  if (lower.includes("openai") || lower.includes("api key")) {
    return "AI drafting is not fully configured yet. Check the OpenAI settings in the environment.";
  }

  return message || fallback;
}
