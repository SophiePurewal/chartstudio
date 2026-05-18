export type ChartType = "line" | "bar" | "doughnut";
export type NumberFormat = "currency" | "percent" | "plain";
export type PaletteName = "finance" | "neutral" | "vibrant" | "data";

export type ChartRow = {
  label: string;
  values: string[];
};

export type ChartPayload = {
  type: ChartType | null;
  rows: ChartRow[];
  seriesNames: string[];
  title: string;
  xLabel: string;
  yLabel: string;
  numberFormat: NumberFormat;
  thousands: boolean;
  showLegend: boolean;
  showValues: boolean;
  showGrid: boolean;
  showAxisLabels: boolean;
  barRadius: number;
  barSpacing: "compact" | "default" | "wide";
  barLayout: "grouped" | "stacked";
  lineWeight: number;
  smooth: boolean;
  showPoints: boolean;
  showPercent: boolean;
  innerRadius: number;
  legendPos: "right" | "bottom";
  segmentBorders: boolean;
  palette: PaletteName;
};

export type BarChartPayload = ChartPayload;

export type UiToFigmaMessage =
  | { type: "create-chart"; payload: ChartPayload }
  | { type: "create-bar-chart"; payload: ChartPayload }
  | { type: "cancel" };

export type FigmaToUiMessage =
  | { type: "chart-created" }
  | { type: "chart-error"; message: string };
