"use client";

import { ExternalLink, Zap } from "lucide-react";
import type { Competitor } from "@/app/types";

interface CompetitorCardProps {
  competitor: Competitor;
  index: number;
}

export function CompetitorCard({ competitor, index }: CompetitorCardProps) {
  const staggerClass = ["card-in-1", "card-in-2", "card-in-3", "card-in-4"][Math.min(index, 3)];

  return (
    <div
      className={`card-in ${staggerClass} result-card p-5`}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Amber top accent line on hover (CSS handles hover via result-card) */}
      <div
        style={{
          position: "absolute", inset: "0 0 auto 0", height: "3px",
          background: "linear-gradient(90deg, #e8b84b, #f5d17a)",
          borderRadius: "16px 16px 0 0",
          opacity: 0.7,
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2 mt-1">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Index badge */}
          <span
            style={{
              flexShrink: 0,
              width: 24, height: 24,
              borderRadius: "50%",
              background: "rgba(232,184,75,0.12)",
              border: "1.5px solid rgba(232,184,75,0.35)",
              color: "#c49030",
              fontSize: "11px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {index + 1}
          </span>
          <h3 style={{ fontWeight: 600, color: "#1e2235", fontSize: "14px", lineHeight: 1.3 }}>
            {competitor.name}
          </h3>
        </div>

        <a
          href={competitor.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${competitor.name}`}
          className="flex items-center gap-1"
          style={{
            flexShrink: 0,
            fontSize: "11px",
            fontWeight: 600,
            color: "#c49030",
            background: "rgba(232,184,75,0.1)",
            border: "1.5px solid rgba(232,184,75,0.25)",
            padding: "4px 10px",
            borderRadius: "8px",
            transition: "all 0.18s",
            textDecoration: "none",
          }}
        >
          Visit <ExternalLink size={11} />
        </a>
      </div>

      {/* URL */}
      <p style={{ fontSize: "11px", color: "#b5a98a", marginBottom: "10px", fontFamily: "monospace" }}>
        {competitor.url.replace(/^https?:\/\//, "")}
      </p>

      {/* Summary */}
      <p style={{ fontSize: "13px", color: "#5a5240", lineHeight: 1.65, marginBottom: "14px" }}>
        {competitor.summary}
      </p>

      {/* Strength */}
      <div className="flex items-start gap-2">
        <Zap size={13} style={{ color: "#e8a020", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
        <div>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#c47a18", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Their Strength
          </span>
          <p style={{ fontSize: "12px", color: "#9e6810", marginTop: "2px", lineHeight: 1.55 }}>
            {competitor.strength}
          </p>
        </div>
      </div>
    </div>
  );
}
