import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";

import { planResponseSchema } from "@/lib/schema";
import {
  applyTemplateUpdates,
  buildClarifications,
  type TemplateUpdate,
  serializeTemplateForPrompt,
} from "@/lib/template-helpers";
import type { TemplateSet } from "@/lib/types";

// Fallback models if API fetch fails
const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
  "qwen/qwen3-32b",
] as const;

// Cache for fetched models
let cachedModels: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

type GroqModel = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

/**
 * Fetches available models from Groq API, prioritizing preview models
 */
async function fetchAvailableModels(): Promise<string[]> {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("GROQ_API_KEY not configured, using fallback models");
      return [...FALLBACK_MODELS];
    }

    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models: GroqModel[] = data.data || [];

    // Filter for preview models first, then production models
    // Preview models from https://console.groq.com/docs/models include:
    // - meta-llama/llama-4-maverick-17b-128e-instruct
    // - meta-llama/llama-4-scout-17b-16e-instruct
    // - moonshotai/kimi-k2-instruct-0905
    // - qwen/qwen3-32b
    // - playai-tts (TTS models, skip for text generation)
    // - openai/gpt-oss-safeguard-20b
    const previewModels = models
      .filter((model) => {
        const id = model.id.toLowerCase();
        // Skip TTS models for text generation
        if (id.includes("tts")) return false;
        return (
          id.includes("meta-llama/llama-4") ||
          id.includes("moonshotai/kimi-k2") ||
          id.includes("qwen/qwen3") ||
          id.includes("gpt-oss-safeguard")
        );
      })
      .map((m) => m.id)
      .sort(); // Sort for consistent ordering

    // Production models as fallback (exclude preview models already captured)
    const previewModelIds = new Set(previewModels.map((id) => id.toLowerCase()));
    const productionModels = models
      .filter((model) => {
        const id = model.id.toLowerCase();
        // Skip if already in preview models
        if (previewModelIds.has(id)) return false;
        // Skip TTS and audio models
        if (id.includes("tts") || id.includes("whisper")) return false;
        // Production text generation models
        return (
          id.includes("llama-3") ||
          (id.includes("gpt-oss") && !id.includes("safeguard"))
        );
      })
      .map((m) => m.id)
      .sort();

    // Combine: preview first, then production, then fallback
    const allModels = [
      ...previewModels,
      ...productionModels,
      ...FALLBACK_MODELS,
    ];

    // Remove duplicates while preserving order
    const uniqueModels = Array.from(new Set(allModels));

    // Always start with llama-3.3-70b-versatile if available
    const primaryModel = "llama-3.3-70b-versatile";
    const orderedModels = uniqueModels.includes(primaryModel)
      ? [
          primaryModel,
          ...uniqueModels.filter((m) => m !== primaryModel),
        ]
      : uniqueModels;

    return orderedModels;
  } catch (error) {
    console.error("Failed to fetch models from Groq API:", error);
    return [...FALLBACK_MODELS];
  }
}

/**
 * Gets available models, using cache if valid, otherwise fetching fresh
 */
async function getAvailableModels(): Promise<string[]> {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < CACHE_TTL) {
    return cachedModels;
  }

  const models = await fetchAvailableModels();
  cachedModels = models;
  cacheTimestamp = now;
  return models;
}

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        images: z
          .array(
            z.object({
              url: z.string(),
              type: z.string(),
              name: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .min(1, "At least one message is required."),
  template: z.custom<TemplateSet>(),
  vibeScore: z.number().min(0).max(100),
  paletteSummary: z
    .object({
      dominant: z.string(),
      accents: z.array(z.string()),
      descriptiveTone: z.string(),
    })
    .nullable()
    .optional(),
});

const getGroqClient = (() => {
  let client: Groq | null = null;
  return () => {
    if (client) return client;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured.");
    }
    client = new Groq({
      apiKey,
    });
    return client;
  };
})();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, template, vibeScore, paletteSummary } = requestSchema.parse(body);

    if (process.env.APPBLUEPRINTS_USE_GROQ_STUB === "true") {
      return NextResponse.json(stubPlanResponse(template));
    }

    const prompt = buildPrompt({
      template,
      vibeScore,
      paletteSummary: paletteSummary ?? null,
    });

    const client = getGroqClient();
    
    // Limit conversation history to reduce token usage
    // Keep the most recent 10 messages (5 user + 5 assistant pairs) plus system prompt
    // This prevents the request from growing too large while preserving recent context
    const MAX_HISTORY_MESSAGES = 10;
    const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    
    // Format messages for Groq API - support images in user messages
    const formatMessageForGroq = (msg: { role: string; content: string; images?: Array<{ url: string; type: string }> }): 
      | { role: "user"; content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> }
      | { role: "user"; content: string }
      | { role: "assistant"; content: string }
      | { role: "system"; content: string } => {
      if (msg.role === "user" && msg.images && msg.images.length > 0) {
        // For messages with images, use content array format
        const contentParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
          { type: "text", text: msg.content },
        ];
        msg.images.forEach((img) => {
          contentParts.push({
            type: "image_url",
            image_url: { url: img.url },
          });
        });
        return {
          role: "user" as const,
          content: contentParts,
        };
      }
      // Handle each role type explicitly
      if (msg.role === "user") {
        return {
          role: "user" as const,
          content: msg.content,
        };
      }
      if (msg.role === "assistant") {
        return {
          role: "assistant" as const,
          content: msg.content,
        };
      }
      // Default to system (shouldn't happen, but TypeScript needs this)
      return {
        role: "system" as const,
        content: msg.content,
      };
    };
    
    const messagesPayload = [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT,
      },
      ...recentMessages.map(formatMessageForGroq),
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    // Fetch available models (prioritizing preview models)
    const availableModels = await getAvailableModels();

    // Try models in sequence until one works
    let lastError: unknown = null;
    let usedModel: string | null = null;

    for (const model of availableModels) {
      try {
        usedModel = model;
        const response = await client.chat.completions.create({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: messagesPayload,
        });

        const assistantContent = response.choices[0]?.message?.content;

        if (!assistantContent) {
          throw new Error("Groq returned an empty response.");
        }

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(assistantContent);
        } catch (parseError) {
          console.error("Failed to parse Groq JSON response:", assistantContent);
          throw new Error(`Invalid JSON from Groq: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
        }

        const parsed = planResponseSchema.safeParse(parsedJson);

        if (!parsed.success) {
          console.error("Schema validation failed:", parsed.error.flatten());
          console.error("Received data:", JSON.stringify(parsedJson, null, 2));
          throw new Error(`Unable to parse Groq response: ${parsed.error.message}`);
        }

        // Count empty fields before update
        let emptyBeforeCount = 0;
        Object.values(template).forEach((sections) => {
          sections.forEach((section) => {
            section.fields.forEach((field) => {
              if (!field.value.trim()) {
                emptyBeforeCount++;
              }
            });
          });
        });

        // Log how many fields were filled
        const filledCount = parsed.data.filled_fields.length;
        console.log(`Model ${model} filled ${filledCount} fields (${emptyBeforeCount} were empty)`);
        
        if (filledCount === 0) {
          console.warn("⚠️ Groq returned empty filled_fields array. Assistant message:", parsed.data.assistant_message?.substring(0, 100));
        } else if (filledCount < emptyBeforeCount) {
          console.warn(`⚠️ Groq only filled ${filledCount} of ${emptyBeforeCount} empty fields. Missing ${emptyBeforeCount - filledCount} fields.`);
          console.log("Fields filled:", parsed.data.filled_fields.map(f => `${f.document}/${f.section_id}/${f.field_id}`).join(", "));
        } else {
          console.log("✅ All empty fields filled:", parsed.data.filled_fields.map(f => `${f.document}/${f.section_id}/${f.field_id}`).join(", "));
        }

        const updates: TemplateUpdate[] = parsed.data.filled_fields.map((field) => ({
          document: field.document,
          sectionId: field.section_id,
          fieldId: field.field_id,
          value: field.value,
        }));

        const nextTemplate = applyTemplateUpdates(template, updates);
        
        // Verify updates were applied
        let actuallyUpdated = 0;
        updates.forEach(update => {
          const section = nextTemplate[update.document]?.find(s => s.id === update.sectionId);
          const field = section?.fields.find(f => f.id === update.fieldId);
          if (field && field.value.trim() === update.value.trim()) {
            actuallyUpdated++;
          }
        });
        console.log(`Applied ${actuallyUpdated} of ${updates.length} updates`);
        
        const clarifications = buildClarifications(nextTemplate);

        return NextResponse.json({
          assistantMessage: parsed.data.assistant_message,
          template: nextTemplate,
          clarifications,
          model: usedModel,
        });
      } catch (error) {
        lastError = error;
        const groqError = error as {
          error?: { message?: string; code?: string; type?: string };
          message?: string;
          status?: number;
        };

        // Check if it's a retriable error that we should retry with next model
        const isRateLimit =
          groqError?.error?.code === "rate_limit_exceeded" ||
          groqError?.error?.type === "tokens" ||
          groqError?.status === 429;
        const isRequestTooLarge =
          groqError?.status === 413 ||
          (groqError?.error?.code === "rate_limit_exceeded" &&
            groqError?.error?.message?.toLowerCase().includes("request too large")) ||
          groqError?.error?.message?.toLowerCase().includes("tokens per minute");
        const isModelError =
          groqError?.error?.code === "model_decommissioned" ||
          groqError?.error?.code === "model_not_found";

        // If it's a rate limit, request too large, or model error, try next model
        // Otherwise, break and return the error
        if (!isRateLimit && !isRequestTooLarge && !isModelError) {
          break;
        }

        // Log the attempt for debugging
        const errorType = isRequestTooLarge
          ? "request too large"
          : isRateLimit
            ? "rate limit"
            : isModelError
              ? "model error"
              : "unknown";
        console.warn(`Model ${model} failed (${errorType}), trying next...`);
      }
    }

    // If we get here, all models failed
    const allModelsFailedError = new Error(
      `All ${availableModels.length} models failed. Last error: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
    );
    if (lastError instanceof Error) {
      allModelsFailedError.cause = lastError;
    }
    throw allModelsFailedError;
  } catch (error) {
    console.error("Groq plan error", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    // Extract Groq API error message if available
    // Groq SDK errors typically have error.error.message structure
    const groqError = error as {
      error?: { message?: string; code?: string; type?: string };
      message?: string;
      status?: number;
    };
    const errorMessage =
      groqError?.error?.message ||
      groqError?.message ||
      (error instanceof Error ? error.message : "Unknown error");
    
    // Check if it's a request too large error
    const isRequestTooLarge =
      groqError?.status === 413 ||
      errorMessage.toLowerCase().includes("request too large") ||
      errorMessage.toLowerCase().includes("tokens per minute");
    
    let statusCode = 500;
    if (groqError?.status) {
      statusCode = groqError.status;
    } else if (groqError?.error?.code === "model_decommissioned") {
      statusCode = 400;
    } else if (isRequestTooLarge) {
      statusCode = 413;
    }
    
    // Provide helpful error message for request too large
    const friendlyMessage = isRequestTooLarge
      ? "Your request is too large for the available models. Try shortening your message or reducing the template context."
      : "Failed to generate plan from Groq.";
    
    return NextResponse.json(
      {
        error: friendlyMessage,
        details: errorMessage,
      },
      { status: statusCode },
    );
  }
}

const SYSTEM_PROMPT = `You are AppBlueprints, a friendly and helpful product strategist who turns rough app ideas into concrete plans. You're conversational, natural, and human—not robotic or overly formal.

Your communication style:
- Talk like a real person having a conversation, not a corporate bot
- Be warm, friendly, and encouraging—like you're helping a friend
- Keep responses natural and conversational, even when filling fields
- If someone says "thank you" or "thanks", respond naturally like a human would
- Don't list out technical details unless asked—just acknowledge and move forward
- Use casual language when appropriate ("got it", "sure thing", "no problem")
- Be concise but personable

Your job:
- Fill as many template fields as possible based on the conversation and context
- Make reasonable inferences from user input—don't wait for perfect information
- For simple apps, fill most fields with sensible defaults based on the core idea
- Keep field values concise but descriptive (2-4 sentences per field when applicable)
- If a field can be reasonably inferred, fill it. Only leave fields empty if truly impossible to determine

Return **strict JSON** matching the schema:
{
  "assistant_message": string,
  "filled_fields": [
    {
      "document": "instructions" | "cursorRules" | "todo",
      "section_id": string,
      "field_id": string,
      "value": string
    }
  ],
  "reasoning": string | undefined
}

IMPORTANT: 
- Fill as many fields as you can reasonably determine
- Your assistant_message should sound natural and human—not like a status report
- If the user is just saying thanks or being casual, respond naturally without listing technical details
- Only mention what you filled if it's relevant to the conversation`;

type PromptOptions = {
  template: TemplateSet;
  vibeScore: number;
  paletteSummary: {
    dominant: string;
    accents: string[];
    descriptiveTone: string;
  } | null;
};

const buildPrompt = ({
  template,
  vibeScore,
  paletteSummary,
}: PromptOptions) => {
  const vibeDescriptor =
    vibeScore < 30
      ? "Keep the tone calm and reflective."
      : vibeScore < 60
        ? "Keep the tone balanced and practical."
        : vibeScore < 85
          ? "Lean into energetic, motivating language."
          : "Embrace bold, high-energy language with vivid imagery.";

  const paletteBlock = paletteSummary
    ? `Palette insights: dominant color ${paletteSummary.dominant}, accents ${paletteSummary.accents.join(
        ", ",
      )}. Tone guidance: ${paletteSummary.descriptiveTone}.`
    : "No palette provided. Ask the user if they want to share visuals.";

  // Count empty fields to make the prompt more explicit
  let emptyFieldCount = 0;
  Object.entries(template).forEach(([documentKey, sections]) => {
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (!field.value.trim()) {
          emptyFieldCount++;
        }
      });
    });
  });

  return [
    "You are receiving the current session context.",
    vibeDescriptor,
    paletteBlock,
    "",
    "Template state:",
    serializeTemplateForPrompt(template),
    "",
    `CRITICAL TASK: There are ${emptyFieldCount} empty fields that need to be filled.`,
    "",
    "Your job:",
    `- Fill ALL ${emptyFieldCount} empty fields (marked with ⚠️) based on the conversation context.`,
    "- For a simple app like 'bluebird app' or 'bird app', you MUST fill EVERY field with reasonable values:",
    "  * Instructions: app name, problem, magic moment, must-have features, future features, user roles, capabilities, restrictions, integrations, notifications, data storage, privacy, compliance, uploads, AI features, unique requirements, design vision, theme, about note, about extra",
    "  * Cursor Rules: languages, frontend, styling, state management, backend, APIs, testing, security, performance, file structure, commit conventions",
    "  * TODO: project init, env setup, database schema, authentication, admin panel, theming, feature flows, notifications, user profiles, integrations, additional features, statistics, about page, guest support, testing",
    "- Make reasonable inferences: if user says 'bluebird app', infer:",
    "  * Simple viewing app, no auth needed, static site, minimal features, just displays bird image",
    "  * Use reasonable defaults for everything else",
    "- For TODO items, describe concrete actions based on what you've learned about the project.",
    "- Fill fields even if information is partial—use your best judgment and reasonable defaults.",
    "",
    "CRITICAL REQUIREMENTS:",
    `- Your filled_fields array MUST contain exactly ${emptyFieldCount} items (one for each empty field).`,
    "- You MUST include EVERY field you fill in the filled_fields array. Do NOT just mention them in assistant_message.",
    "- Each item in filled_fields must have: document, section_id, field_id, and value.",
    "- The section_id must match the section.id (like 'core-idea', 'features', 'rules-languages', etc.).",
    "- Double-check that you're filling ALL empty fields, not just a few.",
    "",
    "Response format:",
    "- Keep assistant_message concise and natural; don't list what you filled unless asked.",
    "- Respond in JSON only with filled_fields array containing ALL fields you can reasonably fill.",
  ].join("\n");
};

const stubPlanResponse = (template: TemplateSet) => {
  const updates: TemplateUpdate[] = [
    {
      document: "instructions",
      sectionId: "core-idea",
      fieldId: "core-name",
      value: "VibeScaffolder",
    },
    {
      document: "instructions",
      sectionId: "core-idea",
      fieldId: "core-problem",
      value:
        "Helps a solo creator describe an app idea by voice or chat and instantly receives a scoped plan ready for Cursor.",
    },
    {
      document: "cursorRules",
      sectionId: "rules",
      fieldId: "rules-languages",
      value: "TypeScript for both Next.js front end and server routes.",
    },
    {
      document: "todo",
      sectionId: "todo-list",
      fieldId: "todo-1",
      value:
        "Scaffold Next.js App Router project with Tailwind 4, Zustand, and essential layout components.",
    },
  ];

  const nextTemplate = applyTemplateUpdates(template, updates);
  const clarifications = buildClarifications(nextTemplate);

  return {
    assistantMessage:
      "Here’s a quick pass based on the stub generator. I filled in core positioning and a few rules so you can see the format—toggle off stub mode to hit Groq for real content.",
    template: nextTemplate,
    clarifications,
  };
};
