import gsap from "gsap";

/**
 * Shared easing tokens so motion feels consistent across the app rather than each
 * component picking its own curve. Avoid overshoot (back.out) on informational/data
 * surfaces — it reads as sloppy on numbers people are trying to read accurately;
 * reserve it for low-stakes, playful UI (onboarding pills, not stat tiles).
 */
export const EASE = {
  standard: "power2.out",
  settle: "power3.out",
  overshoot: "back.out(1.4)",
} as const;

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tweens a number from 0 to `target`, calling onUpdate with the rounded intermediate
 * value every frame — for stat tiles reporting a real value, not decorative counters.
 * Respects prefers-reduced-motion by jumping straight to the target.
 */
export function countUp(
  target: number,
  onUpdate: (value: number) => void,
  opts: { duration?: number; decimals?: number; delay?: number } = {}
): gsap.core.Tween {
  const { duration = 0.8, decimals = 0, delay = 0 } = opts;
  const obj = { value: 0 };
  return gsap.to(obj, {
    value: target,
    duration: reducedMotion() ? 0 : duration,
    delay: reducedMotion() ? 0 : delay,
    ease: EASE.standard,
    onUpdate: () => onUpdate(Number(obj.value.toFixed(decimals))),
  });
}
