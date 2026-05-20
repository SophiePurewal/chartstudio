import type { NumberFormat } from "@/figma/types";

export type ChartNumberFormat = NumberFormat;

export type NumberFormatConfig = {
  numberFormat: ChartNumberFormat;
  thousands: boolean;
};

export function getNumberFormatConfig(
  config: NumberFormatConfig,
): NumberFormatConfig {
  return {
    numberFormat: config.numberFormat,
    thousands: config.thousands,
  };
}

export function formatNumberWithSeparators(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const sign = value < 0 ? "-" : "";
  const absoluteAsString = String(Math.abs(value));
  const [integerPart, decimalPart] = absoluteAsString.split(".");
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (!decimalPart) return `${sign}${groupedInteger}`;
  return `${sign}${groupedInteger}.${decimalPart}`;
}

export function formatChartValue(
  value: number,
  config: NumberFormatConfig,
): string {
  const rounded = Math.round(value);
  const base = config.thousands
    ? formatNumberWithSeparators(rounded)
    : String(rounded);

  if (config.numberFormat === "currency") return `£${base}`;
  if (config.numberFormat === "percent") return `${base}%`;
  return base;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
