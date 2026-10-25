const AGE_CEILING_DAYS = 365;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function referenceComponent(referenceCount: number): number {
  if (referenceCount === 0) return 55;
  if (referenceCount === 1) return 30;
  if (referenceCount <= 3) return 10;
  return 0;
}

function ageComponent(daysAgo: number | null): number {
  const factor = daysAgo === null ? 0.5 : clamp(daysAgo / AGE_CEILING_DAYS, 0, 1);
  return factor * 30;
}

export function obsoleteScore(params: {
  referenceCount: number;
  lastModifiedDaysAgo: number | null;
  hasDocumentation: boolean;
  dependentCount: number;
}): number {
  let score = referenceComponent(params.referenceCount) + ageComponent(params.lastModifiedDaysAgo);
  if (params.hasDocumentation) score -= 15;
  if (params.dependentCount === 0) score += 15;
  return Math.round(clamp(score, 0, 100));
}
