"use client";

import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { SCAN_STEPS } from "@/app/types";

export function ScanLoader() {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress,  setProgress]  = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIndex((i) => (i < SCAN_STEPS.length - 1 ? i + 1 : i));
    }, 2500);

    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 95 ? 95 : p + 1));
    }, 75);

    return () => { clearInterval(stepInterval); clearInterval(progressInterval); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-7 py-14 px-6">
      {/* Radar */}
      <div className="relative w-24 h-24">
        <div
          className="absolute inset-0 rounded-full radar-ping"
          style={{ border: "1.5px solid rgba(232,184,75,0.25)" }}
        />
        <div
          className="absolute inset-0 rounded-full radar-ping-delay"
          style={{ border: "1.5px solid rgba(232,184,75,0.15)" }}
        />
        <div
          className="absolute inset-4 rounded-full"
          style={{ background: "rgba(232,184,75,0.06)", border: "1.5px solid rgba(232,184,75,0.2)" }}
        />
        <div className="absolute inset-0 flex items-center justify-center radar-spin">
          <Radar size={36} style={{ color: "#e8b84b" }} aria-hidden="true" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#e8b84b", boxShadow: "0 0 8px rgba(232,184,75,0.7)" }}
          />
        </div>
      </div>

      {/* Step text */}
      <div className="text-center space-y-1.5">
        <p style={{ color: "#c49030", fontWeight: 600, fontSize: "13px", letterSpacing: "0.01em" }}>
          {SCAN_STEPS[stepIndex]}
        </p>
        <p style={{ color: "#b5a98a", fontSize: "12px" }}>
          Live web search in progress — ~5–10 seconds
        </p>
      </div>

      {/* Step dots */}
      <div className="flex gap-2">
        {SCAN_STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              height: "5px",
              borderRadius: "999px",
              background: i <= stepIndex ? "#e8b84b" : "#e2dbd0",
              width: i === stepIndex ? "32px" : i < stepIndex ? "20px" : "14px",
              transition: "all 0.4s ease",
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: "280px" }}>
        <div
          style={{
            width: "100%", height: "4px",
            background: "#ede8df",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #d4a843, #f5d17a)",
              borderRadius: "999px",
              transition: "width 0.12s linear",
            }}
          />
        </div>
        <p style={{ textAlign: "right", fontSize: "11px", color: "#c4b99a", marginTop: "4px" }}>
          {progress}%
        </p>
      </div>
    </div>
  );
}
