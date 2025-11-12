import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const MODEL = "whisper-large-v3-turbo";

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
    const formData = await request.formData();
    const file = formData.get("audio");

    if (process.env.APPBLUEPRINTS_USE_GROQ_STUB === "true") {
      return NextResponse.json({
        text: "This is a stub transcription. Swap APPBLUEPRINTS_USE_GROQ_STUB to false to hit Groq.",
      });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const client = getGroqClient();

    const result = await client.audio.transcriptions.create({
      file,
      model: MODEL,
      response_format: "json",
      temperature: 0.2,
    });

    return NextResponse.json({
      text: result.text,
    });
  } catch (error) {
    console.error("Groq transcription error", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
