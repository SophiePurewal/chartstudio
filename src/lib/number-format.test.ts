import { describe, expect, test } from "bun:test";

import {
  formatChartValue,
  formatNumberWithSeparators,
  formatPercent,
  getNumberFormatConfig,
} from "./number-format";

describe("number formatting", () => {
  test("adds thousands separators without losing decimals", () => {
    expect(formatNumberWithSeparators(1_234_567.89)).toBe("1,234,567.89");
    expect(formatNumberWithSeparators(-12_345.6)).toBe("-12,345.6");
  });

  test("handles non-finite values defensively", () => {
    expect(formatNumberWithSeparators(Number.NaN)).toBe("0");
    expect(formatNumberWithSeparators(Number.POSITIVE_INFINITY)).toBe("0");
  });

  test("formats chart values consistently", () => {
    expect(
      formatChartValue(12_345.6, {
        numberFormat: "currency",
        thousands: true,
      }),
    ).toBe("£12,346");

    expect(
      formatChartValue(73.6, {
        numberFormat: "percent",
        thousands: false,
      }),
    ).toBe("74%");

    expect(
      formatChartValue(-1_500.4, {
        numberFormat: "plain",
        thousands: true,
      }),
    ).toBe("-1,500");
  });

  test("returns a stable number-format config", () => {
    expect(
      getNumberFormatConfig({
        numberFormat: "plain",
        thousands: false,
      }),
    ).toEqual({
      numberFormat: "plain",
      thousands: false,
    });
  });

  test("formats standalone percentages", () => {
    expect(formatPercent(49.5)).toBe("50%");
  });
});
