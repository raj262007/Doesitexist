/**
 * DoesItExist — POST /api/analyze
 *
 * Phase 3 Production Pipeline:
 *   1. Input validation & env guard
 *   2. IP-based rate limiting via Upstash Ratelimit (10 req/IP/hour)
 *   3. Normalised SHA-256 cache key lookup in Upstash Redis
 *      → HIT  : return cached JSON instantly  (X-Cache: HIT)
 *      → MISS  : run Tavily + Groq, store result with 10-day TTL
 */

import { NextRequest, NextResponse } from "next/server";
import { tavily } from "@tavily/core";
import Groq from "groq-sdk";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createHash } from "crypto";

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

/** Shape stored in Redis cache */
interface CachedPayload {
  idea: string;
  analysis: AnalysisResult;
  cachedAt: string; // ISO timestamp for observability
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_IDEA_LENGTH = 5;
const TAVILY_MAX_RESULTS = 5;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const GROQ_MAX_TOKENS = 2048;

/** Cache TTL — 10 days in seconds */
const CACHE_TTL_SECONDS = 10 * 24 * 60 * 60;

/** Rate limit: 10 scans per IP per 1 hour window */
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW = "1 h";

// ─── Upstash clients (lazy-initialised, module-level singletons) ──────────────

/**
 * Returns a Redis client only when the Upstash env vars are present.
 * Allows the route to degrade gracefully (skip cache) when Redis is not
 * configured (e.g. local dev without an .env.local).
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getRatelimiter(redis: Redis): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW),
    analytics: true, // enables Upstash dashboard analytics
    prefix: "doesitexist:ratelimit",
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise + hash an idea string to a stable, compact Redis cache key.
 *
 * Normalisation steps:
 *  1. Lowercase
 *  2. Trim surrounding whitespace
 *  3. Collapse multiple spaces into one
 *  4. Strip common English stop-words that add no semantic meaning
 *     (a, an, the, i, my, our, for, to, that, is, are, we, will, be)
 *  5. SHA-256 hash → hex (prevents key-size issues with very long ideas)
 */
function normalisedCacheKey(idea: string): string {
  const STOP_WORDS = new Set([
    "a", "an", "the", "i", "my", "our", "your", "we", "us",
    "for", "to", "that", "is", "are", "will", "be", "it",
    "this", "of", "in", "on", "at", "with", "and", "or",
  ]);

  const normalised = idea
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
    .join(" ");

  const hash = createHash("sha256").update(normalised).digest("hex");
  return `doesitexist:cache:${hash}`;
}

/**
 * Extract the real client IP from the request, respecting common proxy headers.
 * Falls back to "unknown" to avoid crashing the rate-limiter.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

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
- You MUST provide all four JSON keys: "direct_competitors", "recent_launches", "market_verdict", and "moat_opportunity".
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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
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

  // ── 2. Validate required environment variables ─────────────────────────────
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!tavilyApiKey) {
    console.error("[analyze] Missing TAVILY_API_KEY.");
    return NextResponse.json(
      { error: "Server configuration error: missing Tavily API key." },
      { status: 500 }
    );
  }

  if (!groqApiKey) {
    console.error("[analyze] Missing GROQ_API_KEY.");
    return NextResponse.json(
      { error: "Server configuration error: missing Groq API key." },
      { status: 500 }
    );
  }

  // ── 3. Upstash Redis — rate limiting ───────────────────────────────────────
  const redis = getRedisClient();

  if (redis) {
    const ratelimiter = getRatelimiter(redis);
    const clientIp = getClientIp(request);

    try {
      const { success, limit, remaining, reset } =
        await ratelimiter.limit(clientIp);

      if (!success) {
        const resetInSeconds = Math.ceil((reset - Date.now()) / 1000);
        const resetInMinutes = Math.ceil(resetInSeconds / 60);

        console.warn(
          `[analyze] Rate limit exceeded for IP: ${clientIp}. Resets in ${resetInMinutes}m.`
        );

        return NextResponse.json(
          {
            error:
              "You've reached your free scan limit. Please wait 1 hour or share on X to unlock more.",
            rateLimit: {
              limit,
              remaining: 0,
              resetInSeconds,
              resetInMinutes,
            },
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(reset),
              "Retry-After": String(resetInSeconds),
            },
          }
        );
      }

      // Attach rate-limit headers on successful pass-through
      console.log(
        `[analyze] Rate limit OK for IP: ${clientIp}. ${remaining}/${limit} remaining.`
      );
    } catch (err) {
      // Non-fatal: if Redis is temporarily unavailable, skip rate limiting
      // rather than blocking legitimate users.
      console.warn("[analyze] Rate-limiter error (skipping):", err);
    }
  } else {
    console.warn("[analyze] Upstash Redis not configured — rate limiting skipped.");
  }

  // ── 4. Upstash Redis — cache lookup ───────────────────────────────────────
  const cacheKey = normalisedCacheKey(idea);

  if (redis) {
    try {
      const cached = await redis.get<CachedPayload>(cacheKey);

      if (cached) {
        console.log(
          `[analyze] Cache HIT for key: ${cacheKey} (cached at ${cached.cachedAt})`
        );

        return NextResponse.json(
          { idea: cached.idea, analysis: cached.analysis },
          {
            status: 200,
            headers: {
              "X-Cache": "HIT",
              "X-Cache-Key": cacheKey,
              "X-Cached-At": cached.cachedAt,
            },
          }
        );
      }

      console.log(`[analyze] Cache MISS for key: ${cacheKey}`);
    } catch (err) {
      // Non-fatal: if cache lookup fails, proceed to fresh computation
      console.warn("[analyze] Cache lookup error (skipping):", err);
    }
  }

  // ── 5. Live web search with Tavily ────────────────────────────────────────
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

    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      console.warn("[analyze] Tavily rate limit hit.");
      return NextResponse.json(
        { error: "Search rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }

    if (message.includes("401") || message.includes("403")) {
      console.error("[analyze] Tavily auth error:", message);
      return NextResponse.json({ error: "Invalid Tavily API key." }, { status: 401 });
    }

    console.error("[analyze] Tavily search error:", message);
    return NextResponse.json(
      { error: "Failed to perform web search. Please try again." },
      { status: 502 }
    );
  }

  // ── 6. LLM synthesis with Groq ────────────────────────────────────────────
  let analysisResult: AnalysisResult;

  try {
    const groqClient = new Groq({ apiKey: groqApiKey });

    console.log(`[analyze] Calling Groq (${GROQ_MODEL})...`);

    const completion = await groqClient.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: GROQ_MAX_TOKENS,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(idea, searchResults) },
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

    let rawParsed: Record<string, unknown>;
    try {
      rawParsed = JSON.parse(rawContent) as Record<string, unknown>;
    } catch {
      console.error("[analyze] Failed to parse Groq JSON output:", rawContent);
      return NextResponse.json(
        { error: "The AI model returned malformed JSON. Please try again." },
        { status: 502 }
      );
    }

    analysisResult = {
      direct_competitors: Array.isArray(rawParsed.direct_competitors)
        ? (rawParsed.direct_competitors as Competitor[])
        : [],
      recent_launches: Array.isArray(rawParsed.recent_launches)
        ? (rawParsed.recent_launches as RecentLaunch[])
        : [],
      market_verdict:
        typeof rawParsed.market_verdict === "string" && rawParsed.market_verdict.trim().length > 0
          ? rawParsed.market_verdict.trim()
          : "Market analysis indicates established players and alternatives exist in this segment.",
      moat_opportunity:
        typeof rawParsed.moat_opportunity === "string" && rawParsed.moat_opportunity.trim().length > 0
          ? rawParsed.moat_opportunity.trim()
          : "Focus on specialized niche workflows and seamless UX to create defensibility.",
    };

    // Guarantee that recent_launches is never empty if competitors exist
    if (analysisResult.recent_launches.length === 0 && analysisResult.direct_competitors.length > 0) {
      analysisResult.recent_launches = analysisResult.direct_competitors.slice(0, 3).map((comp) => {
        let source = "Product Hunt";
        if (comp.url.includes("ycombinator")) source = "Y Combinator";
        else if (comp.url.includes("techcrunch")) source = "TechCrunch";
        else if (!comp.url.includes("producthunt")) source = "Web Launch";
        return {
          name: comp.name,
          url: comp.url,
          source,
        };
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
      console.warn("[analyze] Groq rate limit hit.");
      return NextResponse.json(
        { error: "AI model rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      );
    }

    if (message.includes("401") || message.includes("403")) {
      console.error("[analyze] Groq auth error:", message);
      return NextResponse.json({ error: "Invalid Groq API key." }, { status: 401 });
    }

    console.error("[analyze] Groq API error:", message);
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 502 }
    );
  }

  // ── 7. Store result in Redis cache ────────────────────────────────────────
  if (redis) {
    const payload: CachedPayload = {
      idea,
      analysis: analysisResult,
      cachedAt: new Date().toISOString(),
    };

    try {
      await redis.set(cacheKey, payload, { ex: CACHE_TTL_SECONDS });
      console.log(
        `[analyze] Cached result with key: ${cacheKey} (TTL: ${CACHE_TTL_SECONDS}s / 10 days)`
      );
    } catch (err) {
      // Non-fatal: cache write failure should not block the response
      console.warn("[analyze] Cache write error (skipping):", err);
    }
  }

  // ── 8. Return fresh result ─────────────────────────────────────────────────
  console.log(`[analyze] Analysis complete for idea: "${idea}"`);

  return NextResponse.json(
    { idea, analysis: analysisResult },
    {
      status: 200,
      headers: { "X-Cache": "MISS" },
    }
  );
}
