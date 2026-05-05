import OpenAI from "openai";
import { NextResponse } from "next/server";

const businessTypes = [
  "Restaurant",
  "Barber / Salon",
  "Fitness / Trainer",
  "Home Service",
  "Retail Shop",
  "Other",
] as const;

const tones = ["Friendly", "Professional", "Confident", "Casual"] as const;

type BusinessType = (typeof businessTypes)[number];
type Tone = (typeof tones)[number];

type GenerateReplyRequest = {
  customerMessage?: unknown;
  businessType?: unknown;
  tone?: unknown;
};

type GenerateReplyResponse = {
  recommendedReply: string;
  whyThisWorks: string;
  followUpMessage: string;
  upsellSuggestion: string;
};

const systemPrompt =
  "You are Gibraltar, a customer reply assistant for small local businesses. Your job is to help business owners turn customer messages into clear, friendly, high-converting replies. Your replies should sound natural, concise, and helpful. Always include a clear next step. Never sound spammy, fake, or overly corporate.";

const responseSchema = {
  type: "object",
  properties: {
    recommendedReply: {
      type: "string",
      description:
        "A concise, natural customer-facing reply with a clear next step.",
    },
    whyThisWorks: {
      type: "string",
      description:
        "A short practical explanation of why the reply helps move the lead forward.",
    },
    followUpMessage: {
      type: "string",
      description:
        "A short follow-up message to send if the customer does not respond.",
    },
    upsellSuggestion: {
      type: "string",
      description:
        "A natural upsell suggestion, or a brief note that no upsell is needed.",
    },
  },
  required: [
    "recommendedReply",
    "whyThisWorks",
    "followUpMessage",
    "upsellSuggestion",
  ],
  additionalProperties: false,
} as const;

function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && businessTypes.includes(value as BusinessType);
}

function isTone(value: unknown): value is Tone {
  return typeof value === "string" && tones.includes(value as Tone);
}

function friendlyError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: GenerateReplyRequest;

  try {
    body = (await request.json()) as GenerateReplyRequest;
  } catch {
    return friendlyError("Please send a valid customer message to generate a reply.");
  }

  const customerMessage =
    typeof body.customerMessage === "string" ? body.customerMessage.trim() : "";

  if (!customerMessage) {
    return friendlyError("Paste a customer message first, then try again.");
  }

  if (!isBusinessType(body.businessType)) {
    return friendlyError("Choose a valid business type before generating a reply.");
  }

  if (!isTone(body.tone)) {
    return friendlyError("Choose a valid tone before generating a reply.");
  }

  if (!process.env.OPENAI_API_KEY) {
    return friendlyError(
      "Gibraltar needs an OpenAI API key. Add OPENAI_API_KEY to .env.local and restart the dev server.",
      500,
    );
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            `Business type: ${body.businessType}`,
            `Tone: ${body.tone}`,
            `Customer message: ${customerMessage}`,
            "",
            "Create practical text/DM/email-ready sales assistance. Keep the customer-facing reply concise, helpful, and natural. Include an upsell only when it fits naturally.",
          ].join("\n"),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gibraltar_reply",
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as GenerateReplyResponse;

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gibraltar generation failed", error);

    return friendlyError(
      "We couldn't generate a reply just now. Please check your API key and try again.",
      500,
    );
  }
}
