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

export const defaultTriage: MessageTriage = {
  category: "general",
  urgency: "low",
  needsReply: true,
  reason: "General customer message.",
};

const patterns = {
  complaint: [
    "angry",
    "bad experience",
    "broken",
    "cancel",
    "complaint",
    "disappointed",
    "issue",
    "problem",
    "refund",
    "upset",
    "wrong",
  ],
  booking: [
    "appointment",
    "available",
    "availability",
    "book",
    "booking",
    "openings",
    "reservation",
    "reserve",
    "schedule",
    "table",
  ],
  pricing: [
    "cost",
    "estimate",
    "how much",
    "price",
    "pricing",
    "quote",
    "rate",
    "rates",
  ],
  follow_up: [
    "checking in",
    "circling back",
    "follow up",
    "following up",
    "heard back",
    "update",
  ],
  low_priority: [
    "newsletter",
    "no reply needed",
    "notification",
    "receipt",
    "statement",
    "unsubscribe",
  ],
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function triageMessage(message: GmailMessageSummary): MessageTriage {
  const text = `${message.from} ${message.subject} ${message.snippet}`.toLowerCase();

  if (includesAny(text, patterns.complaint)) {
    return {
      category: "complaint",
      urgency: "high",
      needsReply: true,
      reason: "Looks like an issue or unhappy customer.",
    };
  }

  if (includesAny(text, patterns.booking)) {
    return {
      category: "booking",
      urgency: "high",
      needsReply: true,
      reason: "Mentions booking, scheduling, or availability.",
    };
  }

  if (includesAny(text, patterns.pricing)) {
    return {
      category: "pricing",
      urgency: "medium",
      needsReply: true,
      reason: "Mentions price, quote, estimate, or cost.",
    };
  }

  if (includesAny(text, patterns.follow_up)) {
    return {
      category: "follow_up",
      urgency: "medium",
      needsReply: true,
      reason: "Looks like a follow-up or status check.",
    };
  }

  if (includesAny(text, patterns.low_priority)) {
    return {
      category: "low_priority",
      urgency: "low",
      needsReply: false,
      reason: "Looks informational or unlikely to need a reply.",
    };
  }

  return defaultTriage;
}

export function triageMessages(messages: GmailMessageSummary[]) {
  return new Map(messages.map((message) => [message.id, triageMessage(message)]));
}
