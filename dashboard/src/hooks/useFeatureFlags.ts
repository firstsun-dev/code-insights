import { useState, useCallback } from 'react';

const STORAGE_KEY = 'code-insights:feature-flags';

interface FeatureFlags {
  personalityEnabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  personalityEnabled: true,
};

function readStorage(): FeatureFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLAGS;
    return { ...DEFAULT_FLAGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FLAGS;
  }
}

function writeStorage(flags: FeatureFlags): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
}

/**
 * localStorage-backed feature flags (e.g. toggling the Personality feature off).
 * Uses a version counter to trigger re-renders after writes (same pattern as useUserProfile).
 */
export function useFeatureFlags() {
  const [, setVersion] = useState(0);
  const forceUpdate = useCallback(() => setVersion((v) => v + 1), []);

  const flags = readStorage();

  const setPersonalityEnabled = useCallback(
    (enabled: boolean) => {
      writeStorage({ ...readStorage(), personalityEnabled: enabled });
      forceUpdate();
    },
    [forceUpdate]
  );

  return { flags, setPersonalityEnabled };
}
