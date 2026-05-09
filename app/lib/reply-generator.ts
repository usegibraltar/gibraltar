import OpenAI from "openai";
import { getMessageDetail, getThreadDetail, GmailMessageDetail, GmailThreadDetail, selectLatestCustomerMessage } from "./gmail";
import { choosePlaybookMatch, loadEnabledPlaybooks, ReplyPlaybook } from "./playbooks";
import { getSupabaseAdmin } from "./supabase";

type BusinessProfile = {
  business_name: string | null;
  business_type: string | null;
  reply_tone: string | null;
  services: string | null;
  booking_link: string | null;
  phone: string | null;
  hours: string | null;
  never_promise: string | null;
  voice_profile: string | null;
};

const responseSchema = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "A concise, natural email reply with a clear next step.",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How confident Gibraltar is that the reply is ready for owner review.",
    },
    riskFlags: {
      type: "array",
      items: { type: "string" },
      description: "Short, actionable warnings the business owner should verify before sending. Leave empty when there is no meaningful risk.",
    },
    recommendedAction: {
      type: "string",
      description: "A short action label for the owner, such as Reply now, Verify pricing, Confirm availability, Handle carefully, or No reply needed.",
    },
    missingContext: {
      type: "array",
      items: { type: "string" },
      description: "Business details that would make this reply safer or more useful.",
    },
  },
  required: ["reply", "confidence", "riskFlags", "recommendedAction", "missingContext"],
  additionalProperties: false,
} as const;

export async function loadBusinessProfile(userId: string) {
  const { data } = await getSupabaseAdmin()
    .from("business_profiles")
    .select(
      "business_name,business_type,reply_tone,services,booking_link,phone,hours,never_promise,voice_profile",
    )
    .eq("user_id", userId)
    .maybeSingle<BusinessProfile>();

  return data;
}

export async function generateGmailReply({
  accessToken,
  userId,
  messageId,
  instruction,
  triageCategory,
  playbookId,
}: {
  accessToken: string;
  userId: string;
  messageId: string;
  instruction?: string;
  triageCategory?: string;
  playbookId?: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Gibraltar needs an OpenAI API key before it can draft replies.");
  }

  const [message, profile, playbooks] = await Promise.all([
    getMessageDetail(accessToken, messageId),
    loadBusinessProfile(userId),
    loadEnabledPlaybooks(userId),
  ]);
  const thread = await getThreadDetail(accessToken, message.threadId);
  const selectedMessage = selectLatestCustomerMessage(thread.messages) ?? message;
  const playbookMatch = choosePlaybookMatch({ playbooks, playbookId, category: triageCategory });
  const playbook = playbookMatch.playbook;

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const aiResponse = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    input: [
      {
        role: "system",
        content:
          "You are Gibraltar, an email reply assistant for small local businesses. Draft concise, natural, useful replies that sound human and include a clear next step. Use the business context when available. Do not overpromise, invent availability, invent prices, or claim work can be done unless the business context says so. Return advisory guidance with honest confidence: high only when the reply is straightforward and well-supported, medium when the owner should quickly review, and low when important business context is missing or the customer situation is sensitive.",
      },
      {
        role: "user",
        content: [
          "Business context:",
          `Business name: ${profile?.business_name || "Not provided"}`,
          `Business type: ${profile?.business_type || "Not provided"}`,
          `Preferred tone: ${profile?.reply_tone || "Friendly"}`,
          `Services/products: ${profile?.services || "Not provided"}`,
          `Booking link: ${profile?.booking_link || "Not provided"}`,
          `Phone: ${profile?.phone || "Not provided"}`,
          `Hours: ${profile?.hours || "Not provided"}`,
          `Never promise: ${profile?.never_promise || "Not provided"}`,
          `Owner voice profile: ${profile?.voice_profile || "Not learned yet"}`,
          "",
          "Reply playbook:",
          formatPlaybook(playbook),
          "",
          instruction ? `Revision instruction: ${instruction}` : "Revision instruction: None",
          `AI triage category: ${triageCategory || "Not provided"}`,
          "",
          "Selected customer email:",
          `From: ${selectedMessage.from}`,
          `Subject: ${selectedMessage.subject}`,
          `Snippet: ${selectedMessage.snippet}`,
          "",
          "Email body:",
          selectedMessage.body,
          "",
          "Conversation thread context:",
          formatThreadContext(thread, selectedMessage.id),
          "",
          "Write a reply draft the business owner can review in Gmail. Also return concise confidence, advisory risk flags, a recommended owner action, and any missing business context. Risk flags should be specific and useful, not generic. Do not block sending; flags are advisory.",
        ].join("\n"),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "gibraltar_gmail_reply",
        strict: true,
        schema: responseSchema,
      },
    },
  });

  const parsed = JSON.parse(aiResponse.output_text) as ReplyGenerationBody;
  const guidance = buildReplyGuidance({
    parsed,
    profile,
    selectedMessage,
    triageCategory,
  });

  return {
    message: selectedMessage,
    reply: parsed.reply,
    confidence: guidance.confidence,
    riskFlags: guidance.riskFlags,
    recommendedAction: guidance.recommendedAction,
    missingContext: guidance.missingContext,
    playbook: playbook
      ? {
          id: playbook.id,
          title: playbook.title,
          category: playbook.category,
        }
      : null,
    playbookReason: playbookMatch.reason,
    sources: {
      businessContext: Boolean(
        profile?.business_name ||
          profile?.business_type ||
          profile?.services ||
          profile?.booking_link ||
          profile?.phone ||
          profile?.hours,
      ),
      voiceProfile: Boolean(profile?.voice_profile),
      threadMessages: thread.messages.length,
      playbook: Boolean(playbook),
    },
  };
}

type ReplyGenerationBody = {
  reply: string;
  confidence: string;
  riskFlags: string[];
  recommendedAction: string;
  missingContext: string[];
};

function buildReplyGuidance({
  parsed,
  profile,
  selectedMessage,
  triageCategory,
}: {
  parsed: ReplyGenerationBody;
  profile: BusinessProfile | null;
  selectedMessage: GmailMessageDetail;
  triageCategory?: string;
}) {
  const riskFlags = cleanList(parsed.riskFlags, 4);
  const missingContext = cleanList(parsed.missingContext, 4);
  const combinedText = `${selectedMessage.subject} ${selectedMessage.snippet} ${selectedMessage.body} ${parsed.reply}`.toLowerCase();
  const category = triageCategory?.toLowerCase() ?? "";

  const mentionsPricing =
    category === "pricing" ||
    /\b(price|pricing|cost|quote|estimate|rate|fee|\$|discount)\b/.test(combinedText);
  const mentionsBooking =
    category === "booking" ||
    /\b(book|booking|schedule|appointment|availability|available|calendar)\b/.test(combinedText);
  const soundsSensitive =
    category === "complaint" ||
    /\b(upset|angry|frustrated|complaint|issue|problem|refund|cancel|bad experience)\b/.test(combinedText);

  if (mentionsPricing && !profile?.services?.trim()) {
    appendUnique(riskFlags, "Mentions pricing or quotes; verify details before sending.", 4);
    appendUnique(missingContext, "Pricing or service guidance", 4);
  }

  if (mentionsBooking && !profile?.booking_link?.trim() && !profile?.phone?.trim()) {
    appendUnique(riskFlags, "Booking path is not saved; confirm the next step before sending.", 4);
    appendUnique(missingContext, "Booking link or phone number", 4);
  }

  if (soundsSensitive) {
    appendUnique(riskFlags, "Customer may be frustrated; review tone carefully.", 4);
  }

  if (!profile?.never_promise?.trim()) {
    appendUnique(missingContext, "Guardrails for what Gibraltar should never promise", 4);
  }

  let confidence = normalizeConfidence(parsed.confidence);
  if (riskFlags.length >= 2 || missingContext.length >= 3) {
    confidence = "low";
  } else if ((riskFlags.length || missingContext.length) && confidence === "high") {
    confidence = "medium";
  }

  const recommendedAction = recommendAction({
    parsedAction: parsed.recommendedAction,
    riskFlags,
    mentionsPricing,
    mentionsBooking,
    soundsSensitive,
    confidence,
  });

  return {
    confidence,
    riskFlags,
    recommendedAction,
    missingContext,
  };
}

function appendUnique(items: string[], value: string, maxItems: number) {
  if (!items.some((item) => item.toLowerCase() === value.toLowerCase()) && items.length < maxItems) {
    items.push(value);
  }
}

function recommendAction({
  parsedAction,
  riskFlags,
  mentionsPricing,
  mentionsBooking,
  soundsSensitive,
  confidence,
}: {
  parsedAction: string;
  riskFlags: string[];
  mentionsPricing: boolean;
  mentionsBooking: boolean;
  soundsSensitive: boolean;
  confidence: "high" | "medium" | "low";
}) {
  if (mentionsPricing && riskFlags.length) {
    return "Verify pricing";
  }

  if (mentionsBooking && riskFlags.length) {
    return "Confirm booking path";
  }

  if (soundsSensitive) {
    return "Handle carefully";
  }

  if (confidence === "high" && !riskFlags.length) {
    return "Reply now";
  }

  return cleanText(parsedAction, "Review reply");
}

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : fallback;
}

function cleanList(values: unknown, maxItems: number) {
  return Array.isArray(values)
    ? values
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        .map((value) => value.trim().slice(0, 120))
        .slice(0, maxItems)
    : [];
}

function normalizeConfidence(value: unknown): "high" | "medium" | "low" {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function formatPlaybook(playbook: ReplyPlaybook | null) {
  if (!playbook) {
    return "No matching playbook selected.";
  }

  return [
    `Title: ${playbook.title}`,
    `Category: ${playbook.category}`,
    `Guidance: ${playbook.guidance}`,
    `Default CTA: ${playbook.default_cta || "Not provided"}`,
  ].join("\n");
}

function formatThreadContext(thread: GmailThreadDetail, selectedMessageId: string) {
  const messages = thread.messages.slice(-8);

  if (!messages.length) {
    return "No thread context available.";
  }

  return messages
    .map((message, index) => {
      const direction = message.labelIds.includes("SENT") ? "Business owner" : "Customer/contact";
      const selected = message.id === selectedMessageId ? " selected message" : "";
      const body = (message.body || message.snippet || "No readable body.")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1400);

      return [
        `Message ${index + 1}${selected}: ${direction}`,
        `From: ${message.from}`,
        `Date: ${message.date || "Unknown"}`,
        `Body: ${body}`,
      ].join("\n");
    })
    .join("\n\n");
}

export type GeneratedReply = {
  message: GmailMessageDetail;
  reply: string;
  confidence: "high" | "medium" | "low";
  riskFlags: string[];
  recommendedAction: string;
  missingContext: string[];
  playbook: {
    id: string;
    title: string;
    category: string;
  } | null;
  playbookReason: string;
  sources: {
    businessContext: boolean;
    voiceProfile: boolean;
    threadMessages: number;
    playbook: boolean;
  };
};
