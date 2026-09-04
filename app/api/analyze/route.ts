/**
 * DoesItExist — POST /api/analyze
 *
 * Accepts { idea: string }, searches the live web with Tavily, and uses
 * Groq (llama-3.1-8b-instant) to produce a structured competitor analysis.
 */

import { NextRequest, NextResponse } from "next/server";
import { tavily } from "@tavily/core";
import Groq from "groq-sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Competitor {
  name: string;
  url: string;
  summary: string;
  strength: string;
}

export interface RecentLaunch {
  name: string;
  url: string;
  source: string;
}

export interface AnalysisResult {
  direct_competitors: Competitor[];
  recent_launches: RecentLaunch[];
  market_verdict: string;
  moat_opportunity: string;
}

interface AnalyzeRequestBody {
  idea: string;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_IDEA_LENGTH = 5;
const TAVILY_MAX_RESULTS = 5;
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_MAX_TOKENS = 1024;

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a ruthless startup market analyst. Your job is to determine if a startup idea already exists and identify its direct competitors.

You MUST respond with ONLY valid JSON that conforms exactly to this schema — no markdown, no explanation, no extra fields:

{
  "direct_competitors": [
    {
      "name": "string — company/product name",
      "url": "string — homepage or Product Hunt / YC URL",
      "summary": "string — 1–2 sentence description of what they do",
      "strength": "string — their single biggest competitive advantage"
    }
  ],
  "recent_launches": [
    {
      "name": "string — product name",
      "url": "string — launch URL",
      "source": "string — e.g. 'Product Hunt', 'Y Combinator', 'TechCrunch'"
    }
  ],
  "market_verdict": "string — brutal, honest 2–3 sentence reality check on how crowded this space is",
  "moat_opportunity": "string — 1 clear, specific angle the user could exploit to differentiate and win"
}

Rules:
- Use ONLY information from the provided search results.
- If no direct competitors are found, return an empty array for direct_competitors.
- If no recent launches are found, return an empty array for recent_launches.
- Be brutally honest — do not sugarcoat.`;
}

function buildUserPrompt(idea: string, searchResults: TavilySearchResult[]): string {
  const formattedResults = searchResults
    .map(
      (r, i) =>
        `[${i + 1}] Title: ${r.title}\n    URL: ${r.url}\n    Snippet: ${r.content}`
    )
    .join("\n\n");

  return `Startup Idea: "${idea}"

Live Web Search Results:
${formattedResults}

Analyze the above search results and return the structured JSON competitor analysis.`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Parse & validate request body ──────────────────────────────────────
  let body: AnalyzeRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const idea = typeof body?.idea === "string" ? body.idea.trim() : "";

  if (!idea || idea.length < MIN_IDEA_LENGTH) {
    return NextResponse.json(
      {
        error: `The "idea" field is required and must be at least ${MIN_IDEA_LENGTH} characters long.`,
      },
      { status: 400 }
    );
  }

  // ── 2. Validate environment variables ─────────────────────────────────────
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!tavilyApiKey) {
    console.error("[analyze] Missing TAVILY_API_KEY environment variable.");
    return NextResponse.json(
      { error: "Server configuration error: missing Tavily API key." },
      { status: 500 }
    );
  }

  if (!groqApiKey) {
    console.error("[analyze] Missing GROQ_API_KEY environment variable.");
    return NextResponse.json(
      { error: "Server configuration error: missing Groq API key." },
      { status: 500 }
    );
  }

  // ── 3. Live web search with Tavily ────────────────────────────────────────
  let searchResults: TavilySearchResult[];

  try {
    const tavilyClient = tavily({ apiKey: tavilyApiKey });

    const searchQuery = `${idea} startup competitors alternative site:producthunt.com OR site:ycombinator.com`;

    console.log(`[analyze] Tavily search: "${searchQuery}"`);

    const tavilyResponse = await tavilyClient.search(searchQuery, {
      maxResults: TAVILY_MAX_RESULTS,
      searchDepth: "advanced",
      includeAnswer: false,
    });

    // Map to our internal shape
    searchResults = (tavilyResponse.results ?? []).map((r) => ({
      title: r.title ?? "Untitled",
      url: r.url ?? "",
      content: r.content ?? "",
      score: r.score,
    }));

    console.log(`[analyze] Tavily returned ${searchResults.length} result(s).`);

    if (searchResults.length === 0) {
      return NextResponse.json(
        {
          error:
            "No relevant search results found for this idea. Try a more specific description.",
        },
        { status: 422 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Tavily rate limit
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      console.warn("[analyze] Tavily rate limit hit.");
      return NextResponse.json(
        { error: "Search rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }

    // Tavily auth error
    if (message.includes("401") || message.includes("403")) {
      console.error("[analyze] Tavily auth error:", message);
      return NextResponse.json(
        { error: "Invalid Tavily API key." },
        { status: 401 }
      );
    }

    console.error("[analyze] Tavily search error:", message);
    return NextResponse.json(
      { error: "Failed to perform web search. Please try again." },
      { status: 502 }
    );
  }

  // ── 4. LLM synthesis with Groq ────────────────────────────────────────────
  let analysisResult: AnalysisResult;

  try {
    const groqClient = new Groq({ apiKey: groqApiKey });

    console.log(`[analyze] Calling Groq (${GROQ_MODEL})...`);

    const completion = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: GROQ_MAX_TOKENS,
      temperature: 0.3, // Lower temp for factual, deterministic output
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: buildUserPrompt(idea, searchResults),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "";

    if (!rawContent) {
      console.error("[analyze] Groq returned an empty response.");
      return NextResponse.json(
        { error: "The AI model returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    // Parse the JSON — Groq with json_object mode should always be valid JSON,
    // but we still guard defensively.
    try {
      analysisResult = JSON.parse(rawContent) as AnalysisResult;
    } catch {
      console.error("[analyze] Failed to parse Groq JSON output:", rawContent);
      return NextResponse.json(
        { error: "The AI model returned malformed JSON. Please try again." },
        { status: 502 }
      );
    }

    // Validate required top-level fields exist
    if (
      !Array.isArray(analysisResult.direct_competitors) ||
      !Array.isArray(analysisResult.recent_launches) ||
      typeof analysisResult.market_verdict !== "string" ||
      typeof analysisResult.moat_opportunity !== "string"
    ) {
      console.error("[analyze] Groq output missing required fields:", analysisResult);
      return NextResponse.json(
        { error: "AI model response did not match the expected schema." },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Groq rate limit
    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      console.warn("[analyze] Groq rate limit hit.");
      return NextResponse.json(
        { error: "AI model rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }

    // Groq auth error
    if (message.includes("401") || message.includes("403")) {
      console.error("[analyze] Groq auth error:", message);
      return NextResponse.json(
        { error: "Invalid Groq API key." },
        { status: 401 }
      );
    }

    console.error("[analyze] Groq API error:", message);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 502 }
    );
  }

  // ── 5. Return the structured result ───────────────────────────────────────
  console.log(`[analyze] Analysis complete for idea: "${idea}"`);

  return NextResponse.json(
    {
      idea,
      analysis: analysisResult,
    },
    { status: 200 }
  );
}
