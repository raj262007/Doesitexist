"use client";

import { ExternalLink } from "lucide-react";
import type { RecentLaunch } from "@/app/types";

interface LaunchCardProps {
  launch: RecentLaunch;
  index: number;
}

const SOURCE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  "Product Hunt":  { bg: "#fff3ec", color: "#d45a10", border: "#f5c0a0" },
  "Y Combinator": { bg: "#fff3ec", color: "#c84b00", border: "#f5b890" },
  TechCrunch:     { bg: "#f0faf4", color: "#22783c", border: "#a8dbb8" },
  IndieHackers:   { bg: "#f3f0ff", color: "#5b3fc0", border: "#c5b8f5" },
};

function getSourceStyle(source: string) {
  return SOURCE_STYLES[source] ?? { bg: "#f5f0e8", color: "#7a6850", border: "#e2dbd0" };
}

export function LaunchCard({ launch, index }: LaunchCardProps) {
  const staggerClass = ["card-in-1", "card-in-2", "card-in-3", "card-in-4"][Math.min(index, 3)];
  const s = getSourceStyle(launch.source);

  return (
    <div
      className={`card-in ${staggerClass} result-card flex items-center gap-3 px-4 py-3`}
    >
      {/* Source badge */}
      <span
        style={{
          flexShrink: 0,
          fontSize: "11px",
          fontWeight: 700,
          padding: "3px 9px",
          borderRadius: "999px",
          background: s.bg,
          color: s.color,
          border: `1.5px solid ${s.border}`,
          whiteSpace: "nowrap",
        }}
      >
        {launch.source}
      </span>

      {/* Name */}
      <p style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: "#1e2235", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {launch.name}
      </p>

      {/* Link */}
      <a
        href={launch.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${launch.name}`}
        style={{ flexShrink: 0, color: "#c4b99a", transition: "color 0.18s" }}
      >
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
