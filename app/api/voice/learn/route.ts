import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "../../../lib/api";
import { getSupabaseAdmin, requireApprovedUser } from "../../../lib/supabase";

type VoiceSample = {
  subject?: unknown;
  body?: unknown;
};

type LearnVoiceBody = {
  samples?: unknown;
};

const voiceSchema = {
  type: "object",
  properties: {
    voiceProfile: {
      type: "string",
      description:
        "A concise practical writing style guide for future customer email replies.",
    },
  },
  required: ["voiceProfile"],
  additionalProperties: false,
} as const;

function cleanSample(sample: VoiceSample) {
  const subject = typeof sample.subject === "string" ? sample.subject.trim().slice(0, 200) : "";
  const body = typeof sample.body === "string" ? sample.body.trim().slice(0, 1800) : "";

  return { subject, body };
}

export async function POST(request: Request) {
  const auth = await requireApprovedUser(getBearerToken(request));

  if (!auth.user) {
    return jsonError(auth.error, auth.status);
  }

  let body: LearnVoiceBody;

  try {
    body = (await request.json()) as LearnVoiceBody;
  } catch {
    return jsonError("Please choose sent email examples first.");
  }

  const samples = Array.isArray(body.samples)
    ? body.samples.map((sample) => cleanSample(sample as VoiceSample))
    : [];
  const usableSamples = samples.filter((sample) => sample.body.length > 40).slice(0, 12);

  if (usableSamples.length < 3) {
    return jsonError("Choose at least three sent replies so Gibraltar can learn a useful voice profile.");
  }

  if (!process.env.OPENAI_API_KEY) {
    return jsonError("Gibraltar needs an OpenAI API key before it can learn voice.", 500);
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content:
            "You analyze sent customer emails from a business owner and produce a compact writing style guide. Do not include private customer details, names, emails, phone numbers, addresses, or exact quoted messages. Capture reusable style patterns only.",
        },
        {
          role: "user",
          content: [
            "Create a voice profile for future customer reply drafts.",
            "Include greeting/sign-off style, formality, sentence length, common phrasing, how next steps are phrased, and what to avoid.",
            "Keep it under 220 words and make it directly usable as prompt context.",
            "",
            ...usableSamples.map((sample, index) =>
              [
                `Sample ${index + 1}`,
                `Subject: ${sample.subject || "(No subject)"}`,
                sample.body,
              ].join("\n"),
            ),
          ].join("\n\n"),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "gibraltar_voice_profile",
          strict: true,
          schema: voiceSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as { voiceProfile: string };

    const { error } = await getSupabaseAdmin().from("business_profiles").upsert(
      {
        user_id: auth.user.id,
        user_email: auth.user.email,
        voice_profile: parsed.voiceProfile,
        voice_sample_count: usableSamples.length,
        voice_learned_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      console.error("Voice profile save failed", error);
      return jsonError("Could not save voice profile.", 500);
    }

    return NextResponse.json({
      ok: true,
      voiceProfile: parsed.voiceProfile,
      voiceSampleCount: usableSamples.length,
      voiceLearnedAt: new Date().toISOString(),
    });
  } catch (learnError) {
    console.error("Voice learning failed", learnError);
    return jsonError(
      learnError instanceof Error ? learnError.message : "Could not learn owner voice.",
      500,
    );
  }
}
