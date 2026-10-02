import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Add it to your .env.local file.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const prompt =
      typeof body.prompt === "string" ? body.prompt.trim() : "";

    const documentText =
      typeof body.documentText === "string"
        ? body.documentText.trim()
        : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "A prompt is required." },
        { status: 400 }
      );
    }

    if (!documentText) {
      return NextResponse.json(
        { error: "Document text is required." },
        { status: 400 }
      );
    }

    const MAX_DOCUMENT_CHARS = 100000;

    const trimmedDocument =
      documentText.length > MAX_DOCUMENT_CHARS
        ? documentText.slice(0, MAX_DOCUMENT_CHARS)
        : documentText;

    const systemInstruction = `
You are DocuFlow AI, an intelligent document assistant.

Your job is to help the user understand the document provided below.

Rules:
- Base your answer primarily on the document.
- Do not invent facts that are not supported by the document.
- If the requested information is not present, clearly say that it is not available in the document.
- Keep answers clear, useful, and well structured.
- Use headings or bullet points when useful.
- For summaries, focus on the most important information.
- For explanations, use simple language.
- When answering questions, answer the user's question directly.
`;

    const userInput = `
DOCUMENT:
--------------------
${trimmedDocument}
--------------------

USER REQUEST:
${prompt}
`;

    const response = await fetch(
      `${GEMINI_API_URL}/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstruction,
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: userInput,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    const data = await response.json();

    console.log("Gemini response status:", response.status);
    console.log("Gemini response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            "The Gemini AI service could not process your request.",
        },
        { status: response.status }
      );
    }

    const parts =
      data?.candidates?.[0]?.content?.parts ?? [];

    const answer = parts
      .filter(
        (part: { text?: unknown }) =>
          typeof part.text === "string"
      )
      .map(
        (part: { text: string }) => part.text
      )
      .join("")
      .trim();

    if (!answer) {
      return NextResponse.json(
        {
          error:
            "Gemini completed the request but did not return any text.",
          details: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      answer,
      model,
    });
  } catch (error) {
    console.error("Gemini AI route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while processing the AI request.",
      },
      { status: 500 }
    );
  }
}