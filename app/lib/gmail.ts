import { decryptSecret, encryptSecret } from "./crypto";
import { requireEnv } from "./env";
import { getSupabaseAdmin, GmailConnection } from "./supabase";

const gmailScope = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleProfileResponse = {
  emailAddress?: string;
  error?: {
    message?: string;
  };
};

type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

type GmailMessageResponse = {
  id: string;
  threadId: string;
  internalDate?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    parts?: GmailMessageResponse["payload"][];
    body?: {
      data?: string;
    };
    mimeType?: string;
  };
  error?: {
    message?: string;
  };
};

type GmailThreadResponse = {
  id: string;
  messages?: GmailMessageResponse[];
  error?: {
    message?: string;
  };
};

type GmailDraftResponse = {
  id?: string;
  message?: {
    id?: string;
    threadId?: string;
  };
  error?: {
    message?: string;
  };
};

type GmailSendDraftResponse = {
  id?: string;
  threadId?: string;
  error?: {
    message?: string;
  };
};

export type GmailMessageSummary = {
  id: string;
  threadId: string;
  internalDate: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
};

export type GmailMessageList = {
  messages: GmailMessageSummary[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
};

export type GmailMessageDetail = GmailMessageSummary & {
  body: string;
};

export type GmailThreadMessage = GmailMessageDetail & {
  labelIds: string[];
};

export type GmailThreadDetail = {
  id: string;
  messages: GmailThreadMessage[];
};

export function getGmailAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: gmailScope,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Google OAuth failed.");
  }

  return payload;
}

export async function refreshAccessToken(connection: GmailConnection) {
  if (!connection.refresh_token_encrypted) {
    throw new Error("Gmail refresh token is missing. Please reconnect Gmail.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: decryptSecret(connection.refresh_token_encrypted),
      grant_type: "refresh_token",
    }),
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Could not refresh Gmail access.");
  }

  const expiresAt = new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString();

  await getSupabaseAdmin()
    .from("gmail_connections")
    .update({
      access_token_encrypted: encryptSecret(payload.access_token),
      expires_at: expiresAt,
      token_type: payload.token_type ?? connection.token_type,
      scope: payload.scope ?? connection.scope,
    })
    .eq("id", connection.id);

  return payload.access_token;
}

export async function getFreshAccessToken(connection: GmailConnection) {
  const expiresAt = connection.expires_at ? Date.parse(connection.expires_at) : 0;

  if (
    connection.access_token_encrypted &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now() + 60_000
  ) {
    return decryptSecret(connection.access_token_encrypted);
  }

  return refreshAccessToken(connection);
}

export async function getGoogleProfile(accessToken: string) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json()) as GoogleProfileResponse;

  if (!response.ok || !payload.emailAddress) {
    throw new Error(payload.error?.message ?? "Could not read Gmail profile.");
  }

  return payload.emailAddress.toLowerCase();
}

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function getHeader(message: GmailMessageResponse, name: string) {
  return (
    message.payload?.headers?.find(
      (header) => header.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

function getPlainText(payload: GmailMessageResponse["payload"]): string {
  if (!payload) {
    return "";
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  for (const part of payload.parts ?? []) {
    const text = getPlainText(part);

    if (text) {
      return text;
    }
  }

  return payload.body?.data ? decodeBase64Url(payload.body.data) : "";
}

function summarizeMessage(message: GmailMessageResponse): GmailMessageSummary {
  return {
    id: message.id,
    threadId: message.threadId,
    internalDate: message.internalDate ?? "",
    from: getHeader(message, "From") || "Unknown sender",
    subject: getHeader(message, "Subject") || "(No subject)",
    date: getHeader(message, "Date"),
    snippet: message.snippet ?? "",
  };
}

export async function listRecentMessages(
  accessToken: string,
  {
    query = "",
    pageToken = "",
  }: {
    query?: string;
    pageToken?: string;
  } = {},
): Promise<GmailMessageList> {
  const params = new URLSearchParams({
    maxResults: "50",
    q: query.trim() || "newer_than:30d -category:promotions -category:social",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const listPayload = (await listResponse.json()) as GmailListResponse;

  if (!listResponse.ok) {
    throw new Error("Could not load Gmail messages.");
  }

  const messageResults = await Promise.allSettled(
    (listPayload.messages ?? []).map(async (message) => {
      const detail = await fetchGmailMessage(accessToken, message.id, "metadata");
      return summarizeMessage(detail);
    }),
  );
  const skippedCount = messageResults.filter((result) => result.status === "rejected").length;

  if (skippedCount > 0) {
    console.warn(`Skipped ${skippedCount} Gmail message(s) that could not be read.`);
  }

  const listedMessages = messageResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const threadIds = Array.from(new Set(listedMessages.map((message) => message.threadId).filter(Boolean)));
  const threadResults = await Promise.allSettled(
    threadIds.map(async (threadId) => [threadId, await getThreadDetail(accessToken, threadId)] as const),
  );
  const latestByThreadId = new Map(
    threadResults.flatMap((result) => {
      if (result.status !== "fulfilled") {
        return [];
      }

      const [threadId, thread] = result.value;
      const latest = selectLatestCustomerMessage(thread.messages);

      return latest ? [[threadId, latest] as const] : [];
    }),
  );
  const seenMessageIds = new Set<string>();
  const messages = listedMessages.flatMap((message) => {
    const latest = latestByThreadId.get(message.threadId) ?? message;

    if (seenMessageIds.has(latest.id)) {
      return [];
    }

    seenMessageIds.add(latest.id);
    return [latest];
  });

  return {
    messages,
    nextPageToken: listPayload.nextPageToken ?? null,
    resultSizeEstimate: listPayload.resultSizeEstimate ?? listedMessages.length,
  };
}

export async function listSentMessages(accessToken: string) {
  const listResponse = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?" +
      new URLSearchParams({
        maxResults: "15",
        q: "in:sent newer_than:180d",
      }).toString(),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const listPayload = (await listResponse.json()) as GmailListResponse;

  if (!listResponse.ok) {
    throw new Error("Could not load sent Gmail messages.");
  }

  const messages = await Promise.all(
    (listPayload.messages ?? []).map(async (message) => {
      const detail = await getMessageDetail(accessToken, message.id);

      return {
        ...detail,
        body: detail.body.slice(0, 1200),
      };
    }),
  );

  return messages.filter((message) => message.body.trim().length > 40);
}

export async function getMessageDetail(accessToken: string, messageId: string) {
  const message = await fetchGmailMessage(accessToken, messageId, "full");

  return summarizeMessageDetail(message);
}

export async function getThreadDetail(accessToken: string, threadId: string) {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(
      threadId,
    )}?${new URLSearchParams({ format: "full" }).toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const payload = (await response.json()) as GmailThreadResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Could not read that Gmail thread.");
  }

  return {
    id: payload.id,
    messages: (payload.messages ?? []).map((message) => ({
      ...summarizeMessageDetail(message),
      labelIds: message.labelIds ?? [],
    })),
  };
}

export function selectLatestCustomerMessage<T extends GmailMessageDetail & { labelIds?: string[] }>(
  messages: T[],
) {
  const sorted = [...messages].sort((a, b) => messageTimestamp(b) - messageTimestamp(a));

  return sorted.find((message) => !message.labelIds?.includes("SENT")) ?? sorted[0] ?? null;
}

function messageTimestamp(message: Pick<GmailMessageDetail, "internalDate" | "date">) {
  const internalDate = Number(message.internalDate);

  if (Number.isFinite(internalDate) && internalDate > 0) {
    return internalDate;
  }

  const date = Date.parse(message.date);

  return Number.isFinite(date) ? date : 0;
}

function summarizeMessageDetail(message: GmailMessageResponse): GmailMessageDetail {
  return {
    ...summarizeMessage(message),
    body: getPlainText(message.payload).slice(0, 6000),
  };
}

async function fetchGmailMessage(
  accessToken: string,
  messageId: string,
  format: "metadata" | "full",
) {
  const params = new URLSearchParams({ format });
  params.append("metadataHeaders", "From");
  params.append("metadataHeaders", "Subject");
  params.append("metadataHeaders", "Date");

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
      messageId,
    )}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const payload = (await response.json()) as GmailMessageResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Could not read that Gmail message.");
  }

  return payload;
}

function encodeRawEmail(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function createReplyDraft({
  accessToken,
  threadId,
  to,
  subject,
  body,
}: {
  accessToken: string;
  threadId: string;
  to: string;
  subject: string;
  body: string;
}) {
  const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
  const raw = [
    `To: ${to}`,
    `Subject: ${replySubject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        threadId,
        raw: encodeRawEmail(raw),
      },
    }),
  });
  const payload = (await response.json()) as GmailDraftResponse;

  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message ?? "Could not create Gmail draft.");
  }

  return payload;
}

export async function sendDraft({
  accessToken,
  draftId,
}: {
  accessToken: string;
  draftId: string;
}) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: draftId,
    }),
  });
  const payload = (await response.json()) as GmailSendDraftResponse;

  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message ?? "Could not send Gmail draft.");
  }

  return payload;
}
