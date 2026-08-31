import { describe, expect, test } from "bun:test";

import {
  DOUGHNUT_PATTERN_TYPES,
  getDoughnutPatternType,
} from "./doughnut-patterns";

describe("doughnut pattern selection", () => {
  test("cycles through every available pattern", () => {
    DOUGHNUT_PATTERN_TYPES.forEach((pattern, index) => {
      expect(getDoughnutPatternType(index)).toBe(pattern);
    });

    expect(getDoughnutPatternType(DOUGHNUT_PATTERN_TYPES.length)).toBe(
      DOUGHNUT_PATTERN_TYPES[0],
    );
  });

  test("normalises negative indexes", () => {
    expect(getDoughnutPatternType(-1)).toBe(
      DOUGHNUT_PATTERN_TYPES[DOUGHNUT_PATTERN_TYPES.length - 1],
    );
  });

  test("truncates fractional indexes predictably", () => {
    expect(getDoughnutPatternType(2.9)).toBe(DOUGHNUT_PATTERN_TYPES[2]);
  });
});
