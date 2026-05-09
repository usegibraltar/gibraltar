import OpenAI from "openai";
import { getMessageDetail, getThreadDetail, GmailMessageDetail, GmailThreadDetail } from "./gmail";
import { choosePlaybook, loadEnabledPlaybooks, ReplyPlaybook } from "./playbooks";
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
      description: "Short warnings the business owner should verify before sending.",
    },
    recommendedAction: {
      type: "string",
      description: "A short action label for the owner, such as Reply now or Verify pricing.",
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
  const playbook = choosePlaybook({ playbooks, playbookId, category: triageCategory });

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const aiResponse = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    input: [
      {
        role: "system",
        content:
          "You are Gibraltar, an email reply assistant for small local businesses. Draft concise, natural, useful replies that sound human and include a clear next step. Use the business context when available. Do not overpromise, invent availability, invent prices, or claim work can be done unless the business context says so.",
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
          "",
          "Selected customer email:",
          `From: ${message.from}`,
          `Subject: ${message.subject}`,
          `Snippet: ${message.snippet}`,
          "",
          "Email body:",
          message.body,
          "",
          "Conversation thread context:",
          formatThreadContext(thread, message.id),
          "",
          "Write a reply draft the business owner can review in Gmail. Also return concise confidence, advisory risk flags, a recommended owner action, and any missing business context. Do not block sending; flags are advisory.",
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

  return {
    message,
    reply: parsed.reply,
    confidence: normalizeConfidence(parsed.confidence),
    riskFlags: cleanList(parsed.riskFlags, 4),
    recommendedAction: cleanText(parsed.recommendedAction, "Review reply"),
    missingContext: cleanList(parsed.missingContext, 4),
    playbook: playbook
      ? {
          id: playbook.id,
          title: playbook.title,
          category: playbook.category,
        }
      : null,
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
  sources: {
    businessContext: boolean;
    voiceProfile: boolean;
    threadMessages: number;
    playbook: boolean;
  };
};
