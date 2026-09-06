"use client";

import { forwardRef } from "react";
import { Radar, Users, AlertTriangle, ShieldCheck } from "lucide-react";
import type { AnalysisResult } from "@/app/types";

interface ShareableCardProps {
  idea: string;
  analysis: AnalysisResult;
  format?: "9x16" | "16x9";
}

/**
 * A visually rich card designed for export via html-to-image.
 * Uses only inline styles + Tailwind classes for maximum screenshot fidelity.
 * Forwarded ref is required so the parent can capture this DOM node.
 */
export const ShareableCard = forwardRef<HTMLDivElement, ShareableCardProps>(
  function ShareableCard({ idea, analysis, format = "9x16" }, ref) {
    const competitorCount = analysis.direct_competitors.length;

    const containerClass =
      format === "9x16" ? "share-card-9x16" : "share-card-16x9";

    const verdictShort =
      analysis.market_verdict.length > 160
        ? analysis.market_verdict.slice(0, 157) + "..."
        : analysis.market_verdict;

    const ideaShort =
      idea.length > 80 ? idea.slice(0, 77) + "..." : idea;

    const crowdLevel =
      competitorCount === 0
        ? "🟢 WIDE OPEN"
        : competitorCount <= 2
        ? "🟡 EMERGING"
        : competitorCount <= 4
        ? "🟠 COMPETITIVE"
        : "🔴 SATURATED";

    return (
      <div
        ref={ref}
        className={`${containerClass} relative overflow-hidden flex flex-col`}
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #0c1a2e 40%, #0d1f3c 100%)",
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Cyan glow orb top-right */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                background: "rgba(6,182,212,0.15)",
                border: "1px solid rgba(6,182,212,0.3)",
              }}
            >
              <Radar size={16} style={{ color: "#06b6d4" }} />
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#06b6d4",
                textTransform: "uppercase",
              }}
            >
              DoesItExist — AI Radar
            </span>
          </div>

          {/* Idea */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: "#64748b",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              Idea Scanned
            </p>
            <p
              style={{
                fontSize: format === "9x16" ? "15px" : "13px",
                fontWeight: 600,
                color: "#e2e8f0",
                lineHeight: 1.5,
              }}
            >
              {ideaShort}
            </p>
          </div>

          {/* Competitor count */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "rgba(6,182,212,0.1)",
                border: "1px solid rgba(6,182,212,0.25)",
              }}
            >
              <Users size={14} style={{ color: "#06b6d4" }} />
              <span style={{ fontSize: "22px", fontWeight: 800, color: "#06b6d4" }}>
                {competitorCount}
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                competitor{competitorCount !== 1 ? "s" : ""} found
              </span>
            </div>
            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0" }}>
                {crowdLevel}
              </span>
            </div>
          </div>

          {/* Verdict */}
          <div
            className="rounded-xl p-4 mb-4 flex-1"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} style={{ color: "#f87171" }} />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#f87171",
                  textTransform: "uppercase",
                }}
              >
                Market Verdict
              </span>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "#fca5a5",
                lineHeight: 1.6,
              }}
            >
              {verdictShort}
            </p>
          </div>

          {/* Moat teaser */}
          <div
            className="rounded-xl p-3 mb-5"
            style={{
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={12} style={{ color: "#06b6d4" }} />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#06b6d4",
                  textTransform: "uppercase",
                }}
              >
                Your Moat
              </span>
            </div>
            <p
              style={{
                fontSize: "11px",
                color: "#67e8f9",
                lineHeight: 1.5,
              }}
            >
              {analysis.moat_opportunity.length > 100
                ? analysis.moat_opportunity.slice(0, 97) + "..."
                : analysis.moat_opportunity}
            </p>
          </div>

          {/* Watermark footer */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                color: "#475569",
                letterSpacing: "0.04em",
              }}
            >
              Scanned on DoesItExist.app
            </span>
            <span
              style={{
                fontSize: "9px",
                color: "#475569",
                letterSpacing: "0.04em",
              }}
            >
              Validate before you code ✦
            </span>
          </div>
        </div>
      </div>
    );
  }
);
