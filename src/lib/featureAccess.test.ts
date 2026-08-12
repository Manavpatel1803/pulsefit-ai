import { describe, expect, it } from "vitest";
import { canAccess, FEATURE_TIER, requiredTierFor } from "./featureAccess";
import { tierMeetsMinimum, TIER_RANK } from "./types";
import type { Tier } from "./types";

describe("tierMeetsMinimum", () => {
  it("orders tiers as free < plus < pro", () => {
    expect(TIER_RANK.free).toBeLessThan(TIER_RANK.plus);
    expect(TIER_RANK.plus).toBeLessThan(TIER_RANK.pro);
  });

  it("a higher tier meets a lower minimum, but not vice versa", () => {
    expect(tierMeetsMinimum("pro", "plus")).toBe(true);
    expect(tierMeetsMinimum("free", "plus")).toBe(false);
    expect(tierMeetsMinimum("plus", "plus")).toBe(true);
  });
});

describe("canAccess", () => {
  it("free tier can access free features but not plus/pro ones", () => {
    expect(canAccess("free", "basic_workout_tracking")).toBe(true);
    expect(canAccess("free", "adaptive_workouts")).toBe(false);
    expect(canAccess("free", "advanced_ai_coach")).toBe(false);
  });

  it("plus tier can access free+plus features but not pro-only ones", () => {
    expect(canAccess("plus", "adaptive_workouts")).toBe(true);
    expect(canAccess("plus", "wearable_integration")).toBe(false);
  });

  it("pro tier can access everything in the registry", () => {
    for (const feature of Object.keys(FEATURE_TIER) as (keyof typeof FEATURE_TIER)[]) {
      expect(canAccess("pro", feature)).toBe(true);
    }
  });

  it("every feature maps to a valid tier value", () => {
    const validTiers: Tier[] = ["free", "plus", "pro"];
    for (const tier of Object.values(FEATURE_TIER)) {
      expect(validTiers).toContain(tier);
    }
  });
});

describe("requiredTierFor", () => {
  it("returns the exact tier the registry declares", () => {
    expect(requiredTierFor("challenge_create")).toBe("pro");
    expect(requiredTierFor("community_browse")).toBe("free");
    expect(requiredTierFor("community_post")).toBe("plus");
    expect(requiredTierFor("progress_sharing")).toBe("free");
  });
});
