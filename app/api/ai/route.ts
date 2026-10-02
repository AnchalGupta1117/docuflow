import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const MAX_DOCUMENT_CHARS = 100000;
const MAX_PROMPT_CHARS = 8000;
const MAX_REQUEST_BYTES = 1_500_000;
const GEMINI_TIMEOUT_MS = 45_000;

// Simple in-memory rate limiter.
// This protects the API during a single server instance lifetime.
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const requestLog = new Map<
  string,
  { count: number; startedAt: number }
>();

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("user-agent") ||
    "unknown-client"
  );
}

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const existing = requestLog.get(identifier);

  if (!existing) {
    requestLog.set(identifier, {
      count: 1,
      startedAt: now,
    });

    return false;
  }

  if (now - existing.startedAt >= RATE_LIMIT_WINDOW_MS) {
    requestLog.set(identifier, {
      count: 1,
      startedAt: now,
    });

    return false;
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  existing.count += 1;

  return false;
}

function cleanupRateLimitLog() {
  const now = Date.now();

  for (const [key, value] of requestLog.entries()) {
    if (now - value.startedAt >= RATE_LIMIT_WINDOW_MS) {
      requestLog.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    /*
     * ---------------------------------------------------------
     * BASIC REQUEST VALIDATION
     * ---------------------------------------------------------
     */

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        {
          error: "This endpoint only accepts JSON requests.",
        },
        { status: 415 }
      );
    }

    const contentLength = request.headers.get("content-length");

    if (
      contentLength &&
      Number(contentLength) > MAX_REQUEST_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "The request is too large. Please use a smaller document.",
        },
        { status: 413 }
      );
    }

    /*
     * ---------------------------------------------------------
     * API KEY
     * ---------------------------------------------------------
     *
     * GEMINI_API_KEY is read only on the server.
     * It is never returned to the client.
     */

    const apiKey = process.env.GEMINI_API_KEY;
    const model =
      process.env.GEMINI_MODEL ||
      "gemini-3.5-flash-lite";

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is not configured."
      );

      return NextResponse.json(
        {
          error:
            "The AI service is currently unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    /*
     * ---------------------------------------------------------
     * RATE LIMITING
     * ---------------------------------------------------------
     */

    cleanupRateLimitLog();

    const clientIdentifier =
      getClientIdentifier(request);

    if (isRateLimited(clientIdentifier)) {
      return NextResponse.json(
        {
          error:
            "Too many AI requests. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * REQUEST BODY
     * ---------------------------------------------------------
     */

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request.",
        },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const requestBody = body as {
      prompt?: unknown;
      question?: unknown;
      documentText?: unknown;
    };

    /*
     * Support both:
     *   prompt
     * and
     *   question
     *
     * so existing DocuFlow AI features continue working.
     */

    const rawPrompt =
      typeof requestBody.prompt === "string"
        ? requestBody.prompt
        : typeof requestBody.question === "string"
          ? requestBody.question
          : "";

    const prompt = rawPrompt.trim();

    const documentText =
      typeof requestBody.documentText === "string"
        ? requestBody.documentText.trim()
        : "";

    /*
     * ---------------------------------------------------------
     * INPUT VALIDATION
     * ---------------------------------------------------------
     */

    if (!prompt) {
      return NextResponse.json(
        {
          error: "A prompt is required.",
        },
        { status: 400 }
      );
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        {
          error:
            "Your request is too long. Please keep it under 8,000 characters.",
        },
        { status: 413 }
      );
    }

    if (!documentText) {
      return NextResponse.json(
        {
          error: "Document text is required.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * DOCUMENT SIZE PROTECTION
     * ---------------------------------------------------------
     */

    const trimmedDocument =
      documentText.length > MAX_DOCUMENT_CHARS
        ? documentText.slice(
            0,
            MAX_DOCUMENT_CHARS
          )
        : documentText;

    /*
     * ---------------------------------------------------------
     * GEMINI PROMPT
     * ---------------------------------------------------------
     */

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

    /*
     * ---------------------------------------------------------
     * GEMINI REQUEST WITH TIMEOUT
     * ---------------------------------------------------------
     */

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, GEMINI_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(
        `${GEMINI_API_URL}/${encodeURIComponent(
          model
        )}:generateContent`,
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
          signal: controller.signal,
        }
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return NextResponse.json(
          {
            error:
              "The AI request took too long. Please try again.",
          },
          { status: 504 }
        );
      }

      console.error(
        "Gemini network request failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to connect to the AI service. Please try again.",
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    /*
     * ---------------------------------------------------------
     * GEMINI RESPONSE
     * ---------------------------------------------------------
     */

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      console.error(
        "Gemini returned an invalid response."
      );

      return NextResponse.json(
        {
          error:
            "The AI service returned an invalid response.",
        },
        { status: 502 }
      );
    }

    /*
     * Do NOT send the complete Gemini response to the
     * browser. It may contain internal API information.
     */

    if (!response.ok) {
      const errorData = data as {
        error?: {
          message?: unknown;
          status?: unknown;
        };
      };

      console.error(
        "Gemini API error:",
        response.status,
        errorData?.error?.message
      );

      if (response.status === 429) {
        return NextResponse.json(
          {
            error:
              "The AI service is temporarily busy. Please try again in a moment.",
          },
          { status: 429 }
        );
      }

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        return NextResponse.json(
          {
            error:
              "The AI service could not authenticate this request.",
          },
          { status: 502 }
        );
      }

      if (response.status === 404) {
        return NextResponse.json(
          {
            error:
              "The configured AI model is unavailable. Please check the Gemini model configuration.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          error:
            "The AI service could not process your request. Please try again.",
        },
        { status: 502 }
      );
    }

    /*
     * ---------------------------------------------------------
     * EXTRACT AI ANSWER
     * ---------------------------------------------------------
     */

    const responseData = data as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: unknown;
          }>;
        };
        finishReason?: string;
      }>;
    };

    const parts =
      responseData?.candidates?.[0]?.content
        ?.parts ?? [];

    const answer = parts
      .filter(
        (part) =>
          typeof part.text === "string"
      )
      .map(
        (part) => part.text as string
      )
      .join("")
      .trim();

    if (!answer) {
      console.error(
        "Gemini returned no usable text."
      );

      return NextResponse.json(
        {
          error:
            "The AI service did not return a usable answer. Please try again.",
        },
        { status: 502 }
      );
    }

    /*
     * ---------------------------------------------------------
     * SUCCESS
     * ---------------------------------------------------------
     */

    return NextResponse.json({
      answer,
      model,
    });
  } catch (error) {
    /*
     * Never expose internal server errors directly
     * to the browser.
     */

    console.error(
      "Gemini AI route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while processing your AI request. Please try again.",
      },
      { status: 500 }
    );
  }
}