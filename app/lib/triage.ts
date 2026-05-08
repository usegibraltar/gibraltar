import OpenAI from "openai";
import { GmailMessageSummary } from "./gmail";

export type TriageCategory =
  | "booking"
  | "pricing"
  | "complaint"
  | "follow_up"
  | "general"
  | "low_priority";

export type TriageUrgency = "high" | "medium" | "low";

export type MessageTriage = {
  category: TriageCategory;
  urgency: TriageUrgency;
  needsReply: boolean;
  reason: string;
};

export type TriageSource = "ai" | "cache" | "fallback";

export type TriageMessagesResult = {
  triage: Map<string, MessageTriage>;
  sources: Map<string, TriageSource>;
  model: string | null;
};

export const defaultTriage: MessageTriage = {
  category: "general",
  urgency: "low",
  needsReply: true,
  reason: "Looks like a direct customer message.",
};

const categories: TriageCategory[] = [
  "booking",
  "pricing",
  "complaint",
  "follow_up",
  "general",
  "low_priority",
];
const urgencies: TriageUrgency[] = ["high", "medium", "low"];

const triageSchema = {
  type: "object",
  properties: {
    messages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          category: { type: "string", enum: categories },
          urgency: { type: "string", enum: urgencies },
          needsReply: { type: "boolean" },
          reason: {
            type: "string",
            description: "A short, specific explanation under 12 words.",
          },
        },
        required: ["id", "category", "urgency", "needsReply", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["messages"],
  additionalProperties: false,
} as const;

type TriageResponse = {
  messages: Array<{ id: string } & MessageTriage>;
};

const triageCache = new Map<string, { triage: MessageTriage; model: string | null }>();
const maxCacheEntries = 500;

function compactMessage(message: GmailMessageSummary) {
  return {
    id: message.id,
    from: message.from.slice(0, 160),
    subject: message.subject.slice(0, 180),
    snippet: message.snippet.replace(/\s+/g, " ").trim().slice(0, 500),
  };
}

function cacheKey(message: GmailMessageSummary) {
  const compact = compactMessage(message);

  return [compact.id, compact.from, compact.subject, compact.snippet].join("|");
}

function cacheTriage(key: string, triage: MessageTriage, model: string | null) {
  triageCache.set(key, { triage, model });

  if (triageCache.size > maxCacheEntries) {
    const oldestKey = triageCache.keys().next().value;

    if (oldestKey) {
      triageCache.delete(oldestKey);
    }
  }
}

export function normalizeTriage(
  value:
    | {
        category?: unknown;
        urgency?: unknown;
        needsReply?: unknown;
        reason?: unknown;
      }
    | undefined,
): MessageTriage {
  return {
    category: categories.includes(value?.category as TriageCategory)
      ? (value?.category as TriageCategory)
      : defaultTriage.category,
    urgency: urgencies.includes(value?.urgency as TriageUrgency)
      ? (value?.urgency as TriageUrgency)
      : defaultTriage.urgency,
    needsReply: typeof value?.needsReply === "boolean" ? value.needsReply : defaultTriage.needsReply,
    reason: typeof value?.reason === "string" && value.reason.trim()
      ? value.reason.trim().slice(0, 120)
      : defaultTriage.reason,
  };
}

function getTriageModel() {
  return process.env.OPENAI_TRIAGE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
}

export async function triageMessagesWithMetadata(
  messages: GmailMessageSummary[],
): Promise<TriageMessagesResult> {
  const fallbackTriage = new Map(messages.map((message) => [message.id, defaultTriage]));
  const fallbackSources = new Map(messages.map((message) => [message.id, "fallback" as TriageSource]));
  const cached = new Map<string, MessageTriage>();
  const sources = new Map<string, TriageSource>();
  let model: string | null = null;
  const uncached = messages.filter((message) => {
    const existing = triageCache.get(cacheKey(message));

    if (existing) {
      cached.set(message.id, existing.triage);
      sources.set(message.id, "cache");
      model = model ?? existing.model;
      return false;
    }

    return true;
  });

  if (!uncached.length) {
    return {
      triage: new Map(messages.map((message) => [message.id, cached.get(message.id) ?? defaultTriage])),
      sources,
      model,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { triage: fallbackTriage, sources: fallbackSources, model: null };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const requestedModel = getTriageModel();

  try {
    const response = await client.responses.create({
      model: requestedModel,
      input: [
        {
          role: "system",
          content:
            "You triage Gmail messages for a small local business owner. Decide whether the owner likely needs to personally reply. Be conservative: automated notifications, newsletters, receipts, promotions, calendar/system alerts, and FYI messages usually do not need a reply. Direct customer questions, booking requests, quote/pricing asks, complaints, and follow-ups usually need a reply.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instructions:
              "Classify every message. Use low_priority and needsReply=false for messages that are not actionable customer conversations.",
            messages: uncached.map(compactMessage),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gibraltar_email_triage",
          strict: true,
          schema: triageSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as TriageResponse;
    const byId = new Map(parsed.messages.map((message) => [message.id, normalizeTriage(message)]));
    const scanned = new Map(
      uncached.map((message) => {
        const triage = byId.get(message.id);

        if (!triage) {
          sources.set(message.id, "fallback");
          return [message.id, defaultTriage] as const;
        }

        cacheTriage(cacheKey(message), triage, requestedModel);
        sources.set(message.id, "ai");

        return [message.id, triage] as const;
      }),
    );

    return {
      triage: new Map(
        messages.map((message) => [
          message.id,
          cached.get(message.id) ?? scanned.get(message.id) ?? defaultTriage,
        ]),
      ),
      sources,
      model: requestedModel,
    };
  } catch (error) {
    console.error("AI email triage failed", error);
    return { triage: fallbackTriage, sources: fallbackSources, model: null };
  }
}

export async function triageMessages(messages: GmailMessageSummary[]) {
  const result = await triageMessagesWithMetadata(messages);
  return result.triage;
}

export async function triageMessage(message: GmailMessageSummary) {
  const triage = await triageMessages([message]);
  return triage.get(message.id) ?? defaultTriage;
}
