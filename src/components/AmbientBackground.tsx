"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { reducedMotion } from "@/lib/motion";

interface Orb {
  position: string;
  color: string;
  driftX: number;
  driftY: number;
  duration: number;
  parallax: number;
}

const ORBS: Orb[] = [
  { position: "-top-32 -left-20 h-96 w-96", color: "bg-indigo/25", driftX: 60, driftY: 40, duration: 14, parallax: 18 },
  { position: "top-1/3 -right-24 h-80 w-80", color: "bg-emerald/15", driftX: -50, driftY: 60, duration: 18, parallax: 12 },
  { position: "-bottom-32 left-1/4 h-96 w-96", color: "bg-amber/10", driftX: 40, driftY: -50, duration: 16, parallax: 15 },
];

/**
 * Shared ambient backdrop mounted once at the root layout — drifting blurred glow
 * orbs (GSAP infinite timelines) that also nudge toward the cursor (gsap.quickTo)
 * so the page feels alive/interactive rather than a static gradient. Every visual
 * effect here is decorative only (pointer-events-none, aria-hidden).
 *
 * Two nested elements per orb: the outer div owns the ambient drift tween, the
 * inner div owns the cursor-parallax tween. Both animate `x`/`y` via GSAP, and
 * GSAP writes those straight to `transform` — stacking both on one element would
 * have the two tweens overwrite each other's transform. Separate elements let the
 * transforms compose instead.
 */
export default function AmbientBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const driftRefs = useRef<(HTMLDivElement | null)[]>([]);
  const parallaxRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      if (reducedMotion()) return;

      driftRefs.current.forEach((el, i) => {
        if (!el) return;
        const orb = ORBS[i];
        gsap.to(el, {
          x: `+=${orb.driftX}`,
          y: `+=${orb.driftY}`,
          duration: orb.duration,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });

      const parallaxSetters = parallaxRefs.current.map((el, i) => {
        if (!el) return null;
        return {
          x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" }),
          parallax: ORBS[i].parallax,
        };
      });

      function onPointerMove(e: PointerEvent) {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        parallaxSetters.forEach((setter) => {
          if (!setter) return;
          setter.x(nx * setter.parallax);
          setter.y(ny * setter.parallax);
        });
      }

      window.addEventListener("pointermove", onPointerMove);
      return () => window.removeEventListener("pointermove", onPointerMove);
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {ORBS.map((orb, i) => (
        <div
          key={orb.position}
          ref={(el) => {
            driftRefs.current[i] = el;
          }}
          className={`absolute ${orb.position}`}
        >
          <div
            ref={(el) => {
              parallaxRefs.current[i] = el;
            }}
            className={`h-full w-full rounded-full blur-[100px] ${orb.color}`}
          />
        </div>
      ))}
    </div>
  );
}
