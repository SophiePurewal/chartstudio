export const DOUGHNUT_PATTERN_TYPES = [
  "solid",
  "hatch",
  "hatch-reverse",
  "dot",
  "cross-hatch",
  "grid",
  "dot-condensed",
] as const;

export type DoughnutPatternType = (typeof DOUGHNUT_PATTERN_TYPES)[number];

export function getDoughnutPatternType(
  segmentIndex: number,
): DoughnutPatternType {
  const normalizedIndex =
    ((Math.trunc(segmentIndex) % DOUGHNUT_PATTERN_TYPES.length) +
      DOUGHNUT_PATTERN_TYPES.length) %
    DOUGHNUT_PATTERN_TYPES.length;
  return DOUGHNUT_PATTERN_TYPES[normalizedIndex];
}
