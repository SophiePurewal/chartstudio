import type { NumberFormat } from "@/figma/types";

export type ChartNumberFormat = NumberFormat;

export type NumberFormatConfig = {
  numberFormat: ChartNumberFormat;
  thousands: boolean;
};

export function formatChartValue(
  value: number,
  config: NumberFormatConfig,
): string {
  const rounded = Math.round(value);

  if (config.numberFormat === "currency") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
      useGrouping: config.thousands,
    }).format(rounded);
  }

  const base = new Intl.NumberFormat("en-GB", {
    useGrouping: config.thousands,
    maximumFractionDigits: 0,
  }).format(rounded);

  if (config.numberFormat === "percent") return `${base}%`;
  return base;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
