"use client";

const HEARTBEAT_UNIT = "L40,50 L52,50 L60,30 L68,72 L76,8 L84,88 L92,50 L104,50 ";

function buildPath(repeats: number): string {
  let d = "M-20,50 L20,50 ";
  for (let i = 0; i < repeats; i++) {
    d += HEARTBEAT_UNIT;
  }
  d += "L820,50";
  return d;
}

interface PulseWaveProps {
  className?: string;
  animated?: boolean;
  color?: string;
  height?: number;
  repeats?: number;
}

/** The signature ECG-style waveform motif used in the hero and as section dividers. */
export default function PulseWave({
  className = "",
  animated = true,
  color = "var(--indigo-glow)",
  height = 100,
  repeats = 7,
}: PulseWaveProps) {
  const path = buildPath(repeats);

  return (
    <svg
      viewBox="0 0 800 100"
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={className}
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.35}
      />
      {animated && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="60 900"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
          className="animate-pulse-sweep"
        />
      )}
    </svg>
  );
}
