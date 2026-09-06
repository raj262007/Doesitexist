/**
 * Shared TypeScript interfaces for DoesItExist
 * Mirrors the exact output schema from POST /api/analyze
 */

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

export interface AnalyzeApiResponse {
  idea: string;
  analysis: AnalysisResult;
}

export interface AnalyzeApiError {
  error: string;
}

export type ScanState = "idle" | "scanning" | "done" | "error";

export const SCAN_STEPS = [
  "Step 1/3: Scanning Product Hunt & YC Directory...",
  "Step 2/3: Crawling live competitor domains...",
  "Step 3/3: Synthesizing market verdict & moat...",
] as const;

export const SUGGESTION_PILLS = [
  "AI Resume Bullet Optimizer",
  "Hostel Laundry On-Demand",
  "SaaS Boilerplate for Doctors",
  "Rent Camera Gear Peer-to-Peer",
  "Anonymous Salary Sharing App",
  "AI Meeting Notes for Introverts",
] as const;
