"use client";

import { useState, useRef, useCallback } from "react";
import {
  Radar,
  Search,
  AlertTriangle,
  ShieldCheck,
  Download,
  Sparkles,
  RefreshCw,
  Users,
  Rocket,
  Camera,
  Cpu,
  ShoppingBag,
  DollarSign,
  Mic,
  FileText,
} from "lucide-react";
import { toPng } from "html-to-image";
import confetti from "canvas-confetti";

import { CompetitorCard } from "@/app/components/CompetitorCard";
import { LaunchCard } from "@/app/components/LaunchCard";
import { ScanLoader } from "@/app/components/ScanLoader";
import { ShareableCard } from "@/app/components/ShareableCard";
import type { AnalysisResult, ScanState } from "@/app/types";

// ─── Suggestion pills with icons ─────────────────────────────────────────────

const PILLS = [
  { label: "AI Resume Bullet Optimizer", Icon: FileText },
  { label: "Hostel Laundry On-Demand",   Icon: ShoppingBag },
  { label: "SaaS Boilerplate for Doctors", Icon: Cpu },
  { label: "Rent Camera Gear Peer-to-Peer", Icon: Camera },
  { label: "Anonymous Salary Sharing App", Icon: DollarSign },
  { label: "AI Meeting Notes for Introverts", Icon: Mic },
] as const;

// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [idea, setIdea]             = useState("");
  const [scanState, setScanState]   = useState<ScanState>("idle");
  const [result, setResult]         = useState<{ idea: string; analysis: AnalysisResult } | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [shareFormat, setShareFormat] = useState<"9x16" | "16x9">("9x16");
  const [isDownloading, setIsDownloading] = useState(false);

  const cardRef    = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleScan = useCallback(async () => {
    const trimmed = idea.trim();
    if (trimmed.length < 5) return;

    setScanState("scanning");
    setResult(null);
    setErrorMsg(null);

    try {
      const res  = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ idea: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Unknown error");

      setResult(data as { idea: string; analysis: AnalysisResult });
      setScanState("done");

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      if ((data as { analysis: AnalysisResult }).analysis.direct_competitors.length === 0) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ["#e8b84b", "#f5d17a", "#1e2235", "#ffffff"],
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setScanState("error");
    }
  }, [idea]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleScan(); }
  };

  const handleReset = () => {
    setScanState("idle"); setResult(null); setErrorMsg(null); setIdea("");
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1, pixelRatio: 2, backgroundColor: "#0f172a",
      });
      const link = document.createElement("a");
      link.download = `doesitexist-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error("Download failed:", err); }
    finally { setIsDownloading(false); }
  };

  const canScan      = idea.trim().length >= 5 && scanState !== "scanning";
  const analysis     = result?.analysis;
  const competitorCount = analysis?.direct_competitors.length ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="page-bg min-h-screen w-full flex flex-col">

      {/* ══════════════════════ HERO ══════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-16 pb-10 sm:pt-24 sm:pb-14">

        {/* ── Badge ──────────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full"
          style={{
            background: "#1e2235",
            boxShadow: "0 2px 12px rgba(30,34,53,0.18)",
          }}
        >
          <Radar size={13} color="#e8b84b" aria-hidden="true" />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "#e8e3d8",
              textTransform: "uppercase",
            }}
          >
            AI Competitor Radar &amp; Moat Validator
          </span>
        </div>

        {/* ── Title ──────────────────────────────────────────────────────────── */}
        <h1
          className="text-center mb-4 tracking-tight"
          style={{
            fontSize: "clamp(52px, 10vw, 88px)",
            fontWeight: 900,
            color: "#1e2235",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          DoesItExist?
        </h1>

        {/* ── Tagline ────────────────────────────────────────────────────────── */}
        <p
          className="text-center max-w-lg mb-10"
          style={{ fontSize: "17px", color: "#6b6050", lineHeight: 1.6 }}
        >
          Find out if someone already built your startup{" "}
          <strong style={{ color: "#1e2235", fontWeight: 700 }}>
            before you spend 6 months on it.
          </strong>
        </p>

        {/* ── Search Card ────────────────────────────────────────────────────── */}
        <div className="input-card w-full max-w-2xl relative p-4 sm:p-5">
          {scanState === "scanning" && <div className="scan-beam" />}

          <label htmlFor="idea-input" className="sr-only">Describe your startup idea</label>
          <textarea
            id="idea-input"
            className="search-input w-full bg-transparent resize-none text-sm sm:text-base leading-relaxed outline-none"
            style={{ color: "#1e2235", minHeight: "76px" }}
            rows={3}
            placeholder="e.g., An app that lets college students rent out calculators and lab coats..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={scanState === "scanning"}
            aria-label="Startup idea input"
          />

          <div className="flex items-center justify-between mt-2 gap-3">
            <span style={{ fontSize: "12px", color: idea.length < 5 ? "#c4b99a" : "#9e9080" }}>
              {idea.length} chars · {idea.trim().length < 5 ? "min 5 to scan" : "ready"}
            </span>

            <button
              id="scan-button"
              onClick={handleScan}
              disabled={!canScan}
              className="btn-primary"
              aria-label="Scan market for competitors"
            >
              {scanState === "scanning" ? (
                <><RefreshCw size={14} className="animate-spin" aria-hidden="true" /> Scanning...</>
              ) : (
                <><Search size={14} aria-hidden="true" /> Scan Market</>
              )}
            </button>
          </div>
        </div>

        {/* ── Suggestion Pills ───────────────────────────────────────────────── */}
        {scanState === "idle" && (
          <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-2xl">
            {PILLS.map(({ label, Icon }) => (
              <button
                key={label}
                onClick={() => setIdea(label)}
                className="pill-btn"
                aria-label={`Try idea: ${label}`}
              >
                <Icon size={12} aria-hidden="true" style={{ color: "#9e9080" }} />
                {label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════ SCAN LOADER ═══════════════════════════════════ */}
      {scanState === "scanning" && (
        <section className="px-4 pb-8" aria-live="polite" aria-label="Scanning in progress">
          <div
            className="max-w-2xl mx-auto"
            style={{
              background: "#ffffff",
              border: "1.5px solid #e8e3d8",
              borderRadius: "18px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <ScanLoader />
          </div>
        </section>
      )}

      {/* ══════════════════════ ERROR STATE ═══════════════════════════════════ */}
      {scanState === "error" && errorMsg && (
        <section className="px-4 pb-8" aria-live="assertive">
          <div
            className="max-w-2xl mx-auto p-6 text-center"
            style={{
              background: "#fff5f5",
              border: "1.5px solid #f5c6c6",
              borderRadius: "18px",
            }}
          >
            <AlertTriangle size={32} style={{ color: "#e05252" }} className="mx-auto mb-3" aria-hidden="true" />
            <p style={{ color: "#c03030", fontWeight: 600 }} className="mb-1">Scan Failed</p>
            <p style={{ color: "#e05252", fontSize: "13px", opacity: 0.8 }} className="mb-4">{errorMsg}</p>
            <button
              onClick={handleReset}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                background: "#fee2e2",
                border: "1.5px solid #f5c6c6",
                color: "#c03030",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </section>
      )}

      {/* ══════════════════════ RESULTS DASHBOARD ═════════════════════════════ */}
      {scanState === "done" && result && analysis && (
        <section
          ref={resultsRef}
          className="px-4 pb-16 max-w-6xl mx-auto w-full"
          aria-label="Analysis results"
        >
          {/* ── Summary bar ──────────────────────────────────────────────────── */}
          <div
            className="flex flex-wrap items-center justify-between gap-4 mb-8 px-5 py-4"
            style={{
              background: "#ffffff",
              border: "1.5px solid #ede8df",
              borderRadius: "14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={16} style={{ color: "#e8b84b" }} aria-hidden="true" />
              <p style={{ fontSize: "13px", color: "#5a5240" }}>
                Scan complete for:{" "}
                <span style={{ fontWeight: 600, color: "#1e2235" }}>
                  &ldquo;{result.idea}&rdquo;
                </span>
              </p>
            </div>
            <button
              onClick={handleReset}
              id="scan-again-button"
              className="flex items-center gap-2"
              style={{ fontSize: "13px", color: "#9e9080", cursor: "pointer", background: "none", border: "none" }}
              aria-label="Scan a new idea"
            >
              <RefreshCw size={13} aria-hidden="true" />
              Scan New Idea
            </button>
          </div>

          {/* ── Main Grid ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* Left col — Competitors */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={15} style={{ color: "#e8b84b" }} aria-hidden="true" />
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#9e9080", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Direct Competitors Found
                </h2>
                <span
                  className="ml-auto px-2 py-0.5 rounded-full"
                  style={{ fontSize: "11px", fontWeight: 700, color: "#e8b84b", background: "rgba(232,184,75,0.12)", border: "1px solid rgba(232,184,75,0.3)" }}
                >
                  {competitorCount}
                </span>
              </div>

              {analysis.direct_competitors.length === 0 ? (
                <div
                  className="p-8 text-center"
                  style={{ background: "#f0faf4", border: "1.5px solid #a8dbb8", borderRadius: "16px" }}
                >
                  <ShieldCheck size={36} style={{ color: "#34a85a" }} className="mx-auto mb-3" aria-hidden="true" />
                  <p style={{ color: "#22783c", fontWeight: 600, fontSize: "15px" }} className="mb-1">
                    No direct competitors found!
                  </p>
                  <p style={{ color: "#34a85a", fontSize: "13px", opacity: 0.75 }}>
                    The market looks wide open. You might be early.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysis.direct_competitors.map((comp, i) => (
                    <CompetitorCard key={`${comp.name}-${i}`} competitor={comp} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Right col — Recent Launches */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Rocket size={15} style={{ color: "#e8b84b" }} aria-hidden="true" />
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#9e9080", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Recent Launches
                </h2>
                <span
                  className="ml-auto px-2 py-0.5 rounded-full"
                  style={{ fontSize: "11px", fontWeight: 700, color: "#e8b84b", background: "rgba(232,184,75,0.12)", border: "1px solid rgba(232,184,75,0.3)" }}
                >
                  {analysis.recent_launches.length}
                </span>
              </div>

              {analysis.recent_launches.length === 0 ? (
                <div
                  className="p-6 text-center"
                  style={{ background: "#faf7f2", border: "1.5px solid #ede8df", borderRadius: "14px" }}
                >
                  <p style={{ color: "#b5a98a", fontSize: "13px" }}>
                    No recent launches in our scan window.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {analysis.recent_launches.map((launch, i) => (
                    <LaunchCard key={`${launch.name}-${i}`} launch={launch} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Verdict & Moat ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            {/* Market Verdict */}
            <div
              id="market-verdict-card"
              className="card-in card-in-1 p-6"
              style={{ background: "#fff8f0", border: "1.5px solid #f5d0a0", borderRadius: "18px" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fee8c8", border: "1.5px solid #f5c878", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertTriangle size={15} style={{ color: "#d48a20" }} aria-hidden="true" />
                </div>
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#d48a20", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Market Verdict
                </h2>
              </div>
              <p style={{ fontSize: "13.5px", color: "#7a4f10", lineHeight: 1.7 }}>
                {analysis.market_verdict}
              </p>
            </div>

            {/* Moat Opportunity */}
            <div
              id="moat-opportunity-card"
              className="card-in card-in-2 p-6"
              style={{ background: "#f0faf4", border: "1.5px solid #a8dbb8", borderRadius: "18px" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#d4f0df", border: "1.5px solid #7ecf9a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ShieldCheck size={15} style={{ color: "#22783c" }} aria-hidden="true" />
                </div>
                <h2 style={{ fontSize: "11px", fontWeight: 700, color: "#22783c", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Your Moat / Pivot Opportunity
                </h2>
              </div>
              <p style={{ fontSize: "13.5px", color: "#165428", lineHeight: 1.7 }}>
                {analysis.moat_opportunity}
              </p>
            </div>
          </div>

          {/* ── Shareable Card ───────────────────────────────────────────────── */}
          <div
            id="share-section"
            className="p-6 sm:p-8"
            style={{ background: "#ffffff", border: "1.5px solid #ede8df", borderRadius: "20px", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="flex items-center gap-2" style={{ fontSize: "15px", fontWeight: 700, color: "#1e2235" }}>
                  <Download size={16} style={{ color: "#e8b84b" }} aria-hidden="true" />
                  Shareable Card
                </h2>
                <p style={{ fontSize: "12px", color: "#9e9080", marginTop: "3px" }}>
                  Download &amp; share your scan on Instagram or Twitter
                </p>
              </div>

              {/* Format toggle */}
              <div
                className="flex items-center gap-1 p-1"
                style={{ background: "#f5f0e8", border: "1.5px solid #e2dbd0", borderRadius: "10px" }}
              >
                {(["9x16", "16x9"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    id={`format-${fmt}`}
                    onClick={() => setShareFormat(fmt)}
                    aria-pressed={shareFormat === fmt}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                      transition: "all 0.18s",
                      background: shareFormat === fmt ? "#e8b84b" : "transparent",
                      color:      shareFormat === fmt ? "#1e2235" : "#9e9080",
                    }}
                  >
                    {fmt === "9x16" ? "9:16 Story" : "16:9 Post"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="w-full overflow-x-auto">
                <div className="flex justify-center">
                  <div style={{ borderRadius: "14px", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}>
                    <ShareableCard
                      ref={cardRef}
                      idea={result.idea}
                      analysis={analysis}
                      format={shareFormat}
                    />
                  </div>
                </div>
              </div>

              <button
                id="download-card-button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="btn-primary"
                aria-label="Download shareable card as PNG"
              >
                {isDownloading ? (
                  <><RefreshCw size={14} className="animate-spin" aria-hidden="true" /> Generating PNG...</>
                ) : (
                  <><Download size={14} aria-hidden="true" /> Download Card / Share</>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════ FOOTER ════════════════════════════════════════ */}
      <footer
        className="mt-auto py-6 text-center"
        style={{ borderTop: "1px solid #ede8df" }}
      >
        <p style={{ fontSize: "12px", color: "#b5a98a", letterSpacing: "0.02em" }}>
          DoesItExist.app &mdash; Validate before you code &nbsp;·&nbsp;
          <span style={{ color: "#e8b84b", fontWeight: 500 }}>Powered by Tavily + Groq</span>
        </p>
      </footer>
    </main>
  );
}
