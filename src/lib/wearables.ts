/**
 * Wearable integration abstraction (Pro). Real providers (Apple Health, Google Health
 * Connect, Fitbit, Garmin, Oura) plug in behind this same interface later — each needs
 * its own OAuth app registration, which requires the product owner's developer account
 * credentials for that provider. Until those are wired up, SimulatedProvider is "the
 * cleanest provider for now," per the integration order: internal loop first, real
 * providers after. The decision engine and fitness state never depend on a specific
 * provider directly — they only ever see the WearableReading shape below.
 */
export interface WearableReading {
  hrvMs: number;
  restingHr: number;
  sleepHours: number;
  sleepQualityPct: number;
  steps: number;
}

export interface WearableProvider {
  id: string;
  name: string;
  connected: boolean;
  fetchReading: () => Promise<WearableReading>;
}

class SimulatedProvider implements WearableProvider {
  id = "simulated";
  name = "Simulated wearable feed";
  connected = true;

  async fetchReading(): Promise<WearableReading> {
    const hrvBaseline = 55;
    const rhrBaseline = 58;
    return {
      hrvMs: Math.round(hrvBaseline + (Math.random() - 0.5) * 24),
      restingHr: Math.round(rhrBaseline + (Math.random() - 0.5) * 10),
      sleepHours: Math.round((5.5 + Math.random() * 3) * 10) / 10,
      sleepQualityPct: Math.round(55 + Math.random() * 40),
      steps: Math.round(3000 + Math.random() * 9000),
    };
  }
}

export const WEARABLE_PROVIDERS: WearableProvider[] = [new SimulatedProvider()];

export function getActiveWearableProvider(): WearableProvider {
  return WEARABLE_PROVIDERS[0];
}
