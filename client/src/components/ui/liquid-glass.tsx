"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   GlassFilter — SVG filter for distortion
   Must be mounted in the DOM for the effect to work.
   ───────────────────────────────────────────── */
export function GlassFilter() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <filter id="glass-distortion">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015"
            numOctaves="3"
            seed="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   GlassEffect — wraps any content in a liquid glass pill
   Tuned for dark backgrounds (lower opacity, subtler highlights)
   ───────────────────────────────────────────── */
export function GlassEffect({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        className
      )}
      style={{
        ...style,
        filter: "url(#glass-distortion)",
      }}
    >
      {/* Background blur layer */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          backdropFilter: "blur(12px) saturate(1.4)",
          WebkitBackdropFilter: "blur(12px) saturate(1.4)",
        }}
      />

      {/* Glass tint — tuned for dark bg */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
        }}
      />

      {/* Inner highlights — subtle for dark theme */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{
          boxShadow:
            "inset 1px 1px 1px 0 rgba(255,255,255,0.2), inset -1px -1px 1px 1px rgba(255,255,255,0.1)",
        }}
      />

      {/* Specular highlight */}
      <div
        className="absolute top-0 left-[10%] right-[10%] h-[45%] rounded-[inherit] pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)",
          borderRadius: "inherit",
        }}
      />

      {/* Content */}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   GlassButton — convenience wrapper for CTA buttons
   ───────────────────────────────────────────── */
export function GlassButton({
  children,
  className,
  onClick,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <GlassEffect
      className={cn("cursor-pointer", className)}
      style={style}
    >
      <div className="relative z-30" onClick={onClick}>
        {children}
      </div>
    </GlassEffect>
  );
}
