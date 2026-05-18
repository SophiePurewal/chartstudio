import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  Donut,
  LineChart as LineChartIcon,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  createPatternLegendSwatchSvg,
  createPatternedDoughnutSvg,
} from "@/lib/doughnut-pattern-svg";
import { getDoughnutPatternType } from "@/lib/doughnut-patterns";
import { cn } from "@/lib/utils";
import type {
  ChartOutputSize,
  ChartPayload,
  ChartSizePreset,
  FigmaToUiMessage,
  LineStyleName,
} from "@/figma/types";

type ChartType = "line" | "bar" | "doughnut";
type DataMode = "paste" | "manual";
type CustomSizeField = "width" | "height";

// A row = one category with N parallel values (one per series)
type Row = { label: string; values: string[] };

type Config = {
  type: ChartType | null;
  mode: DataMode;
  paste: string;
  rows: Row[];
  seriesNames: string[];
  // labels
  xLabel: string;
  yLabel: string;
  title: string;
  // formatting
  numberFormat: "currency" | "percent" | "plain";
  thousands: boolean;
  showLegend: boolean;
  showPercent: boolean;
  showValues: boolean;
  // line
  lineWeight: number;
  smooth: boolean;
  showPoints: boolean;
  showGrid: boolean;
  showAxisLabels: boolean;
  // bar
  barRadius: number;
  barSpacing: "compact" | "default" | "wide";
  barLayout: "grouped" | "stacked";
  // shared palette (also used for multi-series colors)
  palette: "standard" | "neutral" | "pattern-fill" | "data";
  // doughnut
  innerRadius: number;
  legendPos: "right" | "bottom";
  segmentBorders: boolean;
  chartSizePreset: ChartSizePreset;
  customWidth: string;
  customHeight: string;
  lockAspectRatio: boolean;
};

const CHART_SIZE_OPTIONS: {
  id: ChartSizePreset;
  label: string;
  width: number;
  height: number;
}[] = [
  { id: "desktop-12", label: "Desktop 12 column", width: 1064, height: 608 },
  { id: "desktop-10", label: "Desktop 10 column", width: 872, height: 496 },
  { id: "desktop-8", label: "Desktop 8 column", width: 680, height: 392 },
  { id: "tablet-12", label: "Tablet 12 column", width: 632, height: 360 },
  { id: "mobile-4", label: "Mobile 4 column", width: 351, height: 200 },
  { id: "custom", label: "Custom size", width: 680, height: 392 },
];
const DEFAULT_CHART_SIZE = CHART_SIZE_OPTIONS.find(
  (size) => size.id === "desktop-8",
)!;
const MIN_CUSTOM_WIDTH = 320;
const MIN_CUSTOM_HEIGHT = 180;
const LOCKED_ASPECT_RATIO = 1.75;

const SAMPLE: Record<ChartType, string> = {
  line: "Month, Revenue, Costs\nJan, 12400, 8200\nFeb, 13800, 8900\nMar, 15200, 9400\nApr, 14600, 9100\nMay, 16100, 9800\nJun, 17500, 10200",
  bar: "Quarter, 2024, 2025\nQ1, 48200, 52100\nQ2, 52900, 58700\nQ3, 61300, 64400\nQ4, 67400, 71200",
  doughnut:
    "Category, Spend\nSalaries, 42000\nOps, 18500\nMarketing, 12300\nR&D, 9400\nOther, 4800",
};

const PALETTES: Record<Config["palette"], string[]> = {
  standard: [
    "#278904",
    "#24550C",
    "#D648DD",
    "#9E06A1",
    "#6F6B66",
    "#4E4C49",
    "#187AC9",
    "#0C4F73",
    "#6045B1",
    "#38179E",
  ],
  neutral: [
    "#281805",
    "#4A4742",
    "#6B6761",
    "#8D8982",
    "#B0ACA5",
    "#CAC8C2",
    "#E6E3DC",
  ],
  "pattern-fill": [
    "#281805",
    "#4A4742",
    "#6B6761",
    "#8D8982",
    "#B0ACA5",
    "#CAC8C2",
    "#E6E3DC",
  ],
  data: [
    "#278004", // seq-1.500 green
    "#860DA8", // seq-2.600 purple
    "#005873", // seq-3.700 dark teal
    "#D5648D", // seq-2.400 pink
    "#959898", // seq-8.500 grey
    "#386500", // seq-1.700 dark green
    "#5840DC", // seq-4.400 violet
    "#449DC4", // seq-3.400 sky blue
    "#4A4C48", // seq-6.700 dark grey
    "#4307D2", // seq-4.500 indigo
  ],
};

// Accessible dash patterns applied per-series when multi-series line charts are used.
// Order follows the brand spec: Default solid, Default underline (double), Dotted, Dash 01, Dash 02.
type LineStyle = {
  id: LineStyleName;
  name: string;
  dash?: string; // strokeDasharray
  double?: boolean; // render two parallel strokes 1px apart
  linecap?: "round" | "butt";
};
const LINE_STYLES: LineStyle[] = [
  { id: "default", name: "Default", linecap: "round" },
  {
    id: "default-underline",
    name: "Default underline",
    double: true,
    linecap: "round",
  },
  { id: "dotted", name: "Dotted", dash: "1 8", linecap: "round" },
  { id: "dash-01", name: "Dash 01", dash: "8 8", linecap: "butt" },
  { id: "dash-02", name: "Dash 02", dash: "24 12", linecap: "butt" },
];

const SERIES_LIMIT: Record<ChartType, number> = {
  line: 4,
  bar: 6,
  doughnut: 1,
};

const initial: Config = {
  type: null,
  mode: "paste",
  paste: "",
  rows: [
    { label: "", values: [""] },
    { label: "", values: [""] },
  ],
  seriesNames: ["Series 1"],
  xLabel: "",
  yLabel: "",
  title: "",
  numberFormat: "currency",
  thousands: true,
  showLegend: true,
  showPercent: true,
  showValues: false,
  lineWeight: 2,
  smooth: false,
  showPoints: true,
  showGrid: true,
  showAxisLabels: true,
  barRadius: 3,
  barSpacing: "default",
  barLayout: "grouped",
  palette: "standard",
  innerRadius: 55,
  legendPos: "right",
  segmentBorders: true,
  chartSizePreset: "desktop-8",
  customWidth: String(DEFAULT_CHART_SIZE.width),
  customHeight: String(DEFAULT_CHART_SIZE.height),
  lockAspectRatio: true,
};

function getSelectedChartSize(config: Config): ChartOutputSize {
  if (config.chartSizePreset !== "custom") {
    const preset =
      CHART_SIZE_OPTIONS.find((size) => size.id === config.chartSizePreset) ??
      DEFAULT_CHART_SIZE;
    return { preset: preset.id, width: preset.width, height: preset.height };
  }

  return {
    preset: "custom",
    width: Number(config.customWidth),
    height: Number(config.customHeight),
  };
}

function getChartSizeSummary(config: Config): string {
  const size = getSelectedChartSize(config);
  const label =
    CHART_SIZE_OPTIONS.find((option) => option.id === size.preset)?.label ??
    "Custom";
  return `${label.replace(" size", "")} · ${Math.round(size.width)} × ${Math.round(size.height)}`;
}

function getChartSizeValidation(config: Config): string | null {
  if (config.chartSizePreset !== "custom") return null;
  const width = Number(config.customWidth);
  const height = Number(config.customHeight);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return "Enter a positive width and height for your custom chart size.";
  }
  if (width < MIN_CUSTOM_WIDTH || height < MIN_CUSTOM_HEIGHT) {
    return `Custom charts must be at least ${MIN_CUSTOM_WIDTH}px wide and ${MIN_CUSTOM_HEIGHT}px tall.`;
  }
  return null;
}

function updateCustomChartSize(
  config: Config,
  field: CustomSizeField,
  value: string,
): Partial<Config> {
  const patch: Partial<Config> =
    field === "width" ? { customWidth: value } : { customHeight: value };
  if (!config.lockAspectRatio) return patch;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return patch;
  if (field === "width") {
    patch.customHeight = String(
      Math.max(
        MIN_CUSTOM_HEIGHT,
        Math.round(numberValue / LOCKED_ASPECT_RATIO),
      ),
    );
  } else {
    patch.customWidth = String(
      Math.max(MIN_CUSTOM_WIDTH, Math.round(numberValue * LOCKED_ASPECT_RATIO)),
    );
  }
  return patch;
}

/** Parse pasted CSV/TSV → rows + series names. First line treated as header if its
 * value columns aren't numeric. */
function parseData(
  text: string,
  maxSeries: number,
): { rows: Row[]; seriesNames: string[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], seriesNames: [], errors };

  const split = (l: string) => l.split(/[,\t]/).map((p) => p.trim());
  const num = (s: string) => Number(s.replace(/[£$€,\s]/g, ""));

  let seriesNames: string[] = [];
  let bodyStart = 0;
  const first = split(lines[0]);
  const firstHasHeader = first.slice(1).some((c) => isNaN(num(c)));
  if (firstHasHeader) {
    seriesNames = first.slice(1, 1 + maxSeries);
    bodyStart = 1;
  }

  const rows: Row[] = [];
  for (let i = bodyStart; i < lines.length; i++) {
    const parts = split(lines[i]);
    if (parts.length < 2) {
      errors.push(`Row ${i + 1}: needs at least 2 columns.`);
      continue;
    }
    const values: string[] = [];
    const cols = Math.min(parts.length - 1, maxSeries);
    let bad = false;
    for (let c = 0; c < cols; c++) {
      const v = parts[1 + c];
      if (v === "" || v === undefined) {
        values.push("");
        continue;
      }
      const n = num(v);
      if (isNaN(n)) {
        errors.push(`Row ${i + 1}, col ${c + 2}: "${v}" must be a number.`);
        bad = true;
        break;
      }
      values.push(String(n));
    }
    if (bad) continue;
    rows.push({ label: parts[0], values });
  }

  // Fill series names if missing
  const numSeries = rows.reduce((m, r) => Math.max(m, r.values.length), 0);
  while (seriesNames.length < numSeries)
    seriesNames.push(`Series ${seriesNames.length + 1}`);
  seriesNames = seriesNames.slice(0, Math.min(numSeries, maxSeries));

  return { rows, seriesNames, errors };
}

function fmt(n: number, c: Config) {
  const opts: Intl.NumberFormatOptions = { useGrouping: c.thousands };
  if (c.numberFormat === "currency") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
      ...opts,
    }).format(n);
  }
  if (c.numberFormat === "percent") return `${n}%`;
  return new Intl.NumberFormat("en-GB", opts).format(n);
}

export function ChartStudioApp() {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<Config>(initial);
  const [inserted, setInserted] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);

  const update = (patch: Partial<Config>) =>
    setConfig((c) => ({ ...c, ...patch }));

  const limit = config.type ? SERIES_LIMIT[config.type] : 1;

  // Effective rows + series names
  const parsed = useMemo(() => {
    if (config.mode === "paste") return parseData(config.paste, limit);
    // manual mode
    const rows = config.rows
      .filter(
        (r) =>
          r.label.trim() && r.values.some((v) => v.trim() && !isNaN(Number(v))),
      )
      .map((r) => ({
        label: r.label.trim(),
        values: r.values.slice(0, limit).map((v) => v.trim()),
      }));
    const names = config.seriesNames.slice(0, limit);
    while (names.length < (rows[0]?.values.length ?? 1))
      names.push(`Series ${names.length + 1}`);
    return { rows, seriesNames: names, errors: [] as string[] };
  }, [config.mode, config.paste, config.rows, config.seriesNames, limit]);

  const dataPoints = parsed.rows;
  const seriesNames = parsed.seriesNames;
  const parseErrors = config.mode === "paste" ? parsed.errors : [];

  const numSeries = Math.max(1, seriesNames.length);

  const doughnutWarnings = useMemo(() => {
    if (config.type !== "doughnut") return [];
    const w: string[] = [];
    const nums = dataPoints.map((d) => Number(d.values[0] ?? 0));
    if (nums.some((n) => n < 0))
      w.push("Doughnut charts need positive values.");
    if (nums.length && nums.reduce((a, b) => a + b, 0) === 0)
      w.push("Total is zero — nothing to show.");
    if (nums.length > 8)
      w.push("Too many segments. Consider grouping small ones into 'Other'.");
    return w;
  }, [dataPoints, config.type]);

  const stepLabels =
    config.type === "doughnut"
      ? ["Type", "Data", "Labels & Legend", "Style", "Insert"]
      : ["Type", "Data", "Labels", "Style", "Insert"];

  const sizeValidationMessage = getChartSizeValidation(config);

  const canNext = () => {
    if (step === 1) return !!config.type;
    if (step === 2) return dataPoints.length >= 2;
    if (step === 4) return !sizeValidationMessage;
    return true;
  };

  const reset = () => {
    setConfig(initial);
    setStep(1);
    setInserted(false);
  };

  const editInsertedChart = () => {
    setInserted(false);
    setInsertError(null);
    setStep(4);
  };

  useEffect(() => {
    const handleMessage = (
      event: MessageEvent<{ pluginMessage?: FigmaToUiMessage }>,
    ) => {
      const pluginMessage = event.data.pluginMessage;
      if (!pluginMessage) return;

      if (pluginMessage.type === "chart-created") {
        setInserting(false);
        setInserted(true);
        setInsertError(null);
      }

      if (pluginMessage.type === "chart-error") {
        setInserting(false);
        setInsertError(pluginMessage.message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const insert = () => {
    if (!config.type) {
      setInsertError("Choose a chart type before creating a chart.");
      return;
    }

    const sizeValidation = getChartSizeValidation(config);
    if (sizeValidation) {
      setInsertError(sizeValidation);
      return;
    }

    const payload: ChartPayload = {
      type: config.type,
      rows: dataPoints,
      seriesNames,
      title: config.title,
      xLabel: config.xLabel,
      yLabel: config.yLabel,
      numberFormat: config.numberFormat,
      thousands: config.thousands,
      showLegend: config.showLegend,
      showValues: config.showValues,
      showGrid: config.showGrid,
      showAxisLabels: config.showAxisLabels,
      barRadius: config.barRadius,
      barSpacing: config.barSpacing,
      barLayout: config.barLayout,
      lineWeight: config.lineWeight,
      lineStyles:
        config.type === "line"
          ? Array.from({ length: numSeries }, (_, index) =>
              numSeries > 1
                ? LINE_STYLES[index % LINE_STYLES.length].id
                : LINE_STYLES[0].id,
            )
          : [],
      smooth: config.smooth,
      showPoints: config.showPoints,
      showPercent: config.showPercent,
      innerRadius: config.innerRadius,
      legendPos: config.legendPos,
      segmentBorders: config.segmentBorders,
      palette: config.palette,
      chartSize: getSelectedChartSize(config),
    };

    setInserting(true);
    setInsertError(null);
    parent.postMessage(
      { pluginMessage: { type: "create-chart", payload } },
      "*",
    );
  };

  return (
    <div className="min-h-screen w-full bg-[oklch(0.94_0.005_260)] dark:bg-[oklch(0.12_0.005_260)] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.7 0.01 260 / 0.35) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" />
          <span>ChartStudio · Plugin preview</span>
        </div>

        <div
          className={cn(
            "plugin-shell rounded-xl bg-surface border border-border-strong overflow-hidden flex flex-col",
            previewExpanded ? "w-[420px] h-[760px]" : "w-[400px] h-[700px]",
          )}
        >
          <header className="shrink-0 border-b border-border bg-surface">
            <div className="h-11 px-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-primary/10 grid place-items-center">
                  <BarChart3 className="size-3.5 text-primary" />
                </div>
                <span className="text-[13px] font-semibold tracking-tight">
                  ChartStudio
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={reset}
                  title="Reset"
                  className="size-7 grid place-items-center rounded hover:bg-muted text-muted-foreground"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <button
                  onClick={() => setHelpOpen(true)}
                  title="Help"
                  className="size-7 grid place-items-center rounded hover:bg-muted text-muted-foreground"
                >
                  <CircleHelp className="size-3.5" />
                </button>
              </div>
            </div>
            <Stepper
              step={step}
              labels={stepLabels}
              onJump={(s) => s < step && setStep(s)}
            />
          </header>

          <main className="flex-1 overflow-y-auto bg-surface">
            {step === 1 && (
              <Screen1
                config={config}
                update={update}
                onPick={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <Screen2
                config={config}
                update={update}
                dataPoints={dataPoints}
                seriesNames={seriesNames}
                parseErrors={parseErrors}
                limit={limit}
              />
            )}
            {step === 3 && <Screen3 config={config} update={update} />}
            {step === 4 && (
              <Screen4
                config={config}
                update={update}
                numSeries={numSeries}
                sizeValidationMessage={sizeValidationMessage}
              />
            )}
            {step === 5 && (
              <Screen5
                config={config}
                dataPoints={dataPoints}
                seriesNames={seriesNames}
                inserted={inserted}
                inserting={inserting}
                insertError={insertError}
                onEdit={editInsertedChart}
                onAnother={reset}
                sizeValidationMessage={sizeValidationMessage}
              />
            )}
          </main>

          <PreviewPanel
            config={config}
            data={dataPoints}
            seriesNames={seriesNames}
            warnings={doughnutWarnings}
            hasErrors={parseErrors.length > 0}
            expanded={previewExpanded}
            onToggle={() => setPreviewExpanded((v) => !v)}
          />

          {!inserted && (
            <footer className="shrink-0 border-t border-border bg-surface px-3 py-2.5 flex items-center justify-between gap-2">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
              {step < 5 ? (
                <button
                  onClick={() => canNext() && setStep((s) => s + 1)}
                  disabled={!canNext()}
                  className="h-8 px-3.5 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  Continue <ArrowRight className="size-3.5" />
                </button>
              ) : (
                <button
                  onClick={insert}
                  disabled={inserting || !!sizeValidationMessage}
                  className="h-8 px-3.5 inline-flex items-center gap-1.5 text-[12px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {inserting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Inserting…
                    </>
                  ) : (
                    <>
                      Create Chart <Check className="size-3.5" />
                    </>
                  )}
                </button>
              )}
            </footer>
          )}

          {helpOpen && <HelpDrawer onClose={() => setHelpOpen(false)} />}
        </div>

        <div className="text-[11px] text-muted-foreground">
          ⌘↵ Insert · Esc Close · Live preview updates as you edit
        </div>
      </div>
    </div>
  );
}

/* ---------- STEPPER ---------- */
function Stepper({
  step,
  labels,
  onJump,
}: {
  step: number;
  labels: string[];
  onJump: (s: number) => void;
}) {
  return (
    <div className="px-3 pb-2.5 pt-1">
      <div className="flex items-center gap-1">
        {labels.map((l, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <button
              key={l}
              onClick={() => onJump(n)}
              className="flex-1 group flex flex-col items-start gap-1"
            >
              <div
                className={cn(
                  "h-1 w-full rounded-full transition-colors",
                  done && "bg-primary",
                  active && "bg-primary",
                  !done && !active && "bg-border",
                )}
              />
              <div className="flex items-center gap-1 text-[10.5px]">
                <span
                  className={cn(
                    "tabular-nums font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {n}
                </span>
                <span
                  className={cn(
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {l}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- SCREEN 1 ---------- */
function Screen1({
  config,
  update,
  onPick,
}: {
  config: Config;
  update: (p: Partial<Config>) => void;
  onPick: () => void;
}) {
  const items: {
    id: ChartType;
    label: string;
    sub: string;
    icon: typeof LineChartIcon;
  }[] = [
    { id: "line", label: "Line", sub: "Up to 4 series", icon: LineChartIcon },
    {
      id: "bar",
      label: "Bar",
      sub: "Up to 6 series, grouped or stacked",
      icon: BarChart3,
    },
    { id: "doughnut", label: "Doughnut", sub: "Parts of a whole", icon: Donut },
  ];
  return (
    <Section
      title="Create a chart"
      subtitle="Pick a chart type — options will adapt automatically."
    >
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => {
          const active = config.type === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => {
                update({ type: it.id });
                onPick();
              }}
              className={cn(
                "group text-left p-3 rounded-lg border transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border-strong hover:bg-muted/50",
              )}
            >
              <div className="aspect-[4/3] rounded-md bg-muted/60 mb-2.5 grid place-items-center">
                <ChartThumb type={it.id} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] font-semibold flex items-center gap-1.5">
                    <Icon className="size-3.5" /> {it.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {it.sub}
                  </div>
                </div>
                {active && <Check className="size-3.5 text-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function ChartThumb({ type }: { type: ChartType }) {
  if (type === "line")
    return (
      <svg viewBox="0 0 80 50" className="w-3/4">
        <polyline
          points="4,40 18,28 32,32 46,18 60,22 76,8"
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (type === "bar")
    return (
      <svg viewBox="0 0 80 50" className="w-3/4">
        {[28, 18, 36, 22, 30].map((h, i) => (
          <rect
            key={i}
            x={6 + i * 14}
            y={44 - h}
            width="9"
            height={h}
            rx="1.5"
            className="fill-primary"
          />
        ))}
      </svg>
    );
  return (
    <svg viewBox="0 0 50 50" className="w-2/3">
      <circle
        cx="25"
        cy="25"
        r="18"
        fill="none"
        strokeWidth="10"
        className="stroke-muted-foreground/30"
      />
      <circle
        cx="25"
        cy="25"
        r="18"
        fill="none"
        strokeWidth="10"
        className="stroke-primary"
        strokeDasharray="70 113"
        strokeDashoffset="0"
        transform="rotate(-90 25 25)"
      />
    </svg>
  );
}

/* ---------- SCREEN 2 ---------- */
function Screen2({
  config,
  update,
  dataPoints,
  seriesNames,
  parseErrors,
  limit,
}: {
  config: Config;
  update: (p: Partial<Config>) => void;
  dataPoints: Row[];
  seriesNames: string[];
  parseErrors: string[];
  limit: number;
}) {
  const isDoughnut = config.type === "doughnut";
  const catLabel = isDoughnut
    ? "Segment"
    : config.type === "bar"
      ? "Category"
      : "X label";

  const useSample = () => {
    update({ paste: SAMPLE[config.type ?? "line"], mode: "paste" });
  };

  // Manual mode helpers
  const currentSeriesCount = Math.max(
    1,
    Math.min(
      limit,
      config.rows[0]?.values.length ?? config.seriesNames.length ?? 1,
    ),
  );

  const setSeriesCount = (n: number) => {
    const next = Math.max(1, Math.min(limit, n));
    const rows = config.rows.map((r) => {
      const values = r.values.slice(0, next);
      while (values.length < next) values.push("");
      return { ...r, values };
    });
    const names = config.seriesNames.slice(0, next);
    while (names.length < next) names.push(`Series ${names.length + 1}`);
    update({ rows, seriesNames: names });
  };

  return (
    <Section
      title="Add your data"
      subtitle={
        isDoughnut
          ? "One value per segment."
          : `Up to ${limit} series. Paste columns from Sheets or enter manually.`
      }
    >
      <Segmented
        value={config.mode}
        onChange={(v) => update({ mode: v as DataMode })}
        options={[
          { value: "paste", label: "Paste data" },
          { value: "manual", label: "Manual input" },
        ]}
      />

      {config.mode === "paste" ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={config.paste}
            onChange={(e) => update({ paste: e.target.value })}
            placeholder={
              isDoughnut
                ? "Example:\nCategory, Spend\nSalaries, 42000\nOps, 18500"
                : "Example:\nMonth, Revenue, Costs\nJan, 12400, 8200\nFeb, 13800, 8900"
            }
            className="w-full h-36 px-2.5 py-2 text-[12px] font-mono rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
          />
          <p className="text-[11px] text-muted-foreground">
            {isDoughnut
              ? "2 columns: segment, value."
              : `Column 1 = categories. Columns 2–${limit + 1} = series. First row can be header names.`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={useSample}
              className="text-[11.5px] text-primary hover:underline"
            >
              Use sample data
            </button>
            {config.paste && (
              <button
                onClick={() => update({ paste: "" })}
                className="text-[11.5px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {/* Series controls */}
          {!isDoughnut && (
            <div className="rounded-md border border-border bg-muted/30 p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-medium">
                  Series ({currentSeriesCount}/{limit})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSeriesCount(currentSeriesCount - 1)}
                    disabled={currentSeriesCount <= 1}
                    className="size-6 grid place-items-center rounded border border-border bg-surface hover:bg-muted disabled:opacity-40"
                  >
                    <Minus className="size-3" />
                  </button>
                  <button
                    onClick={() => setSeriesCount(currentSeriesCount + 1)}
                    disabled={currentSeriesCount >= limit}
                    className="size-6 grid place-items-center rounded border border-border bg-surface hover:bg-muted disabled:opacity-40"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Array.from({ length: currentSeriesCount }).map((_, i) => (
                  <Input
                    key={i}
                    value={config.seriesNames[i] ?? `Series ${i + 1}`}
                    onChange={(v) => {
                      const names = [...config.seriesNames];
                      while (names.length <= i)
                        names.push(`Series ${names.length + 1}`);
                      names[i] = v;
                      update({ seriesNames: names });
                    }}
                    placeholder={`Series ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Header row */}
          <div
            className="grid gap-1.5 px-1 text-[10.5px] font-medium text-muted-foreground uppercase tracking-wide"
            style={{
              gridTemplateColumns: `1fr repeat(${currentSeriesCount}, 1fr) auto`,
            }}
          >
            <div>{catLabel}</div>
            {Array.from({ length: currentSeriesCount }).map((_, i) => (
              <div key={i} className="truncate">
                {config.seriesNames[i] || `S${i + 1}`}
              </div>
            ))}
            <div className="w-6" />
          </div>

          <div className="space-y-1">
            {config.rows.map((r, i) => {
              // ensure row has the right number of value cells
              const values = [...r.values];
              while (values.length < currentSeriesCount) values.push("");
              return (
                <div
                  key={i}
                  className="grid gap-1.5"
                  style={{
                    gridTemplateColumns: `1fr repeat(${currentSeriesCount}, 1fr) auto`,
                  }}
                >
                  <Input
                    value={r.label}
                    onChange={(v) => {
                      const rows = [...config.rows];
                      rows[i] = { ...rows[i], label: v };
                      update({ rows });
                    }}
                    placeholder={catLabel}
                  />
                  {Array.from({ length: currentSeriesCount }).map((_, c) => (
                    <Input
                      key={c}
                      value={values[c]}
                      onChange={(v) => {
                        const rows = [...config.rows];
                        const newValues = [...values];
                        newValues[c] = v;
                        rows[i] = { ...rows[i], values: newValues };
                        update({ rows });
                      }}
                      placeholder="0"
                    />
                  ))}
                  <button
                    onClick={() =>
                      update({ rows: config.rows.filter((_, j) => j !== i) })
                    }
                    className="size-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() =>
                update({
                  rows: [
                    ...config.rows,
                    { label: "", values: Array(currentSeriesCount).fill("") },
                  ],
                })
              }
              className="h-7 px-2 inline-flex items-center gap-1 text-[11.5px] rounded hover:bg-muted text-foreground"
            >
              <Plus className="size-3.5" /> Add row
            </button>
            <button
              onClick={() =>
                update({
                  rows: [
                    { label: "", values: Array(currentSeriesCount).fill("") },
                    { label: "", values: Array(currentSeriesCount).fill("") },
                  ],
                })
              }
              className="text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Bar layout */}
      {config.type === "bar" && seriesNames.length > 1 && (
        <div className="mt-3">
          <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            Bar layout
          </div>
          <Segmented
            size="sm"
            value={config.barLayout}
            onChange={(v) => update({ barLayout: v as Config["barLayout"] })}
            options={[
              { value: "grouped", label: "Grouped (pairs)" },
              { value: "stacked", label: "Stacked" },
            ]}
          />
        </div>
      )}

      {/* Validation */}
      <div className="mt-3 space-y-1.5">
        {parseErrors.length > 0 ? (
          <Banner tone="error" title="We couldn't read that.">
            <ul className="list-disc pl-4 space-y-0.5">
              {parseErrors.slice(0, 3).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Banner>
        ) : dataPoints.length >= 2 ? (
          <Banner tone="success">
            Found {dataPoints.length} {isDoughnut ? "segments" : "rows"} ·{" "}
            {seriesNames.length}{" "}
            {seriesNames.length === 1 ? "series" : "series"}
            {seriesNames.length > 1 && `: ${seriesNames.join(", ")}`}.
          </Banner>
        ) : (
          <Banner tone="info">
            Add at least 2 {isDoughnut ? "segments" : "rows"} to see a preview.
          </Banner>
        )}
      </div>
    </Section>
  );
}

/* ---------- SCREEN 3 ---------- */
function Screen3({
  config,
  update,
}: {
  config: Config;
  update: (p: Partial<Config>) => void;
}) {
  if (config.type === "doughnut") {
    return (
      <Section
        title="Labels & legend"
        subtitle="Name your slices and decide how the legend reads."
      >
        <Group label="Title">
          <Field label="Chart title">
            <Input
              value={config.title}
              onChange={(v) => update({ title: v })}
              placeholder="Spending breakdown"
            />
          </Field>
        </Group>

        <Group label="Legend & labels">
          <Toggle
            label="Show legend"
            value={config.showLegend}
            onChange={(v) => update({ showLegend: v })}
          />
          <Toggle
            label="Show percentages"
            value={config.showPercent}
            onChange={(v) => update({ showPercent: v })}
          />
          <Toggle
            label="Show values"
            value={config.showValues}
            onChange={(v) => update({ showValues: v })}
          />
        </Group>

        <Group label="Formatting">
          <Field label="Number format">
            <Select
              value={
                config.numberFormat === "currency"
                  ? "Currency (£)"
                  : config.numberFormat === "percent"
                    ? "Percentage"
                    : "Plain number"
              }
              options={["Currency (£)", "Percentage", "Plain number"]}
              onChange={(v) =>
                update({
                  numberFormat: v.startsWith("Currency")
                    ? "currency"
                    : v === "Percentage"
                      ? "percent"
                      : "plain",
                })
              }
            />
          </Field>
          <Toggle
            label="Thousands separators"
            value={config.thousands}
            onChange={(v) => update({ thousands: v })}
          />
        </Group>
      </Section>
    );
  }

  return (
    <Section
      title="Axes & labels"
      subtitle="Names appear in the preview as you type."
    >
      <Group label="Title">
        <Field label="Chart title">
          <Input
            value={config.title}
            onChange={(v) => update({ title: v })}
            placeholder="Revenue trend"
          />
        </Field>
      </Group>

      <Group label="Axis labels">
        <Field label="X axis label">
          <Input
            value={config.xLabel}
            onChange={(v) => update({ xLabel: v })}
            placeholder={config.type === "bar" ? "Category" : "Month"}
          />
        </Field>
        <Field label="Y axis label">
          <Input
            value={config.yLabel}
            onChange={(v) => update({ yLabel: v })}
            placeholder="Revenue (£)"
          />
        </Field>
        <p className="text-[11px] text-muted-foreground">
          Leave blank to hide.
        </p>
      </Group>

      <Group label="Formatting">
        <Field label="Number format">
          <Select
            value={
              config.numberFormat === "currency"
                ? "Currency (£)"
                : config.numberFormat === "percent"
                  ? "Percentage"
                  : "Plain number"
            }
            options={["Currency (£)", "Percentage", "Plain number"]}
            onChange={(v) =>
              update({
                numberFormat: v.startsWith("Currency")
                  ? "currency"
                  : v === "Percentage"
                    ? "percent"
                    : "plain",
              })
            }
          />
        </Field>
        <Toggle
          label="Use thousands separators"
          value={config.thousands}
          onChange={(v) => update({ thousands: v })}
        />
      </Group>
    </Section>
  );
}

/* ---------- SCREEN 4 ---------- */
function Screen4({
  config,
  update,
  numSeries,
  sizeValidationMessage,
}: {
  config: Config;
  update: (p: Partial<Config>) => void;
  numSeries: number;
  sizeValidationMessage: string | null;
}) {
  const [adv, setAdv] = useState(false);

  return (
    <Section
      title="Style"
      subtitle="Tweak the essentials. Preview updates as you go."
    >
      <Group label="Output size">
        <Field label="Chart size">
          <Select
            value={config.chartSizePreset}
            options={CHART_SIZE_OPTIONS.map((option) => option.id)}
            getLabel={(value) =>
              CHART_SIZE_OPTIONS.find((option) => option.id === value)?.label ??
              value
            }
            onChange={(v) => update({ chartSizePreset: v as ChartSizePreset })}
          />
        </Field>
        <p className="text-[11px] text-muted-foreground">
          {getChartSizeSummary(config)}
        </p>
        {config.chartSizePreset === "custom" && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Width">
                <Input
                  value={config.customWidth}
                  onChange={(v) =>
                    update(updateCustomChartSize(config, "width", v))
                  }
                  placeholder="900"
                />
              </Field>
              <Field label="Height">
                <Input
                  value={config.customHeight}
                  onChange={(v) =>
                    update(updateCustomChartSize(config, "height", v))
                  }
                  placeholder="514"
                />
              </Field>
            </div>
            <Toggle
              label="Lock aspect ratio at 1.75:1"
              value={config.lockAspectRatio}
              onChange={(v) => update({ lockAspectRatio: v })}
            />
            {sizeValidationMessage ? (
              <Banner tone="error">{sizeValidationMessage}</Banner>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Custom charts use the exact width and height entered.
              </p>
            )}
          </div>
        )}
      </Group>
      {(config.type === "line" || config.type === "bar") && (
        <Group label="Color palette">
          <Segmented
            size="sm"
            value={config.palette}
            onChange={(v) => update({ palette: v as Config["palette"] })}
            options={[
              { value: "standard", label: "Standard" },
              { value: "neutral", label: "Neutral" },
              { value: "pattern-fill", label: "Pattern fill" },
              { value: "data", label: "Accessible" },
            ]}
          />
          {/* Swatches preview */}
          <div className="flex items-center gap-1 mt-1.5">
            {PALETTES[config.palette].slice(0, 10).map((c, i) => (
              <span
                key={i}
                className="size-3.5 rounded-sm border border-border"
                style={{ background: c }}
              />
            ))}
          </div>
          {numSeries > 1 && (
            <p className="text-[11px] text-muted-foreground">
              Each of the {numSeries} series gets a colour from the palette.
              {config.type === "line" &&
                " Line styles also vary for accessibility."}
            </p>
          )}
        </Group>
      )}

      {config.type === "line" && (
        <>
          <Group label="Lines">
            <Field label={`Line weight · ${config.lineWeight}px`}>
              <Slider
                min={1}
                max={6}
                value={config.lineWeight}
                onChange={(v) => update({ lineWeight: v })}
              />
            </Field>
            <Toggle
              label="Smooth line"
              value={config.smooth}
              onChange={(v) => update({ smooth: v })}
            />
            <Toggle
              label="Show points"
              value={config.showPoints}
              onChange={(v) => update({ showPoints: v })}
            />
          </Group>
          <Group label="Grid & axes">
            <Toggle
              label="Show gridlines"
              value={config.showGrid}
              onChange={(v) => update({ showGrid: v })}
            />
            <Toggle
              label="Show axis ticks"
              value={config.showAxisLabels}
              onChange={(v) => update({ showAxisLabels: v })}
            />
          </Group>
        </>
      )}

      {config.type === "bar" && (
        <>
          <Group label="Bars">
            <Field label={`Bar radius · ${config.barRadius}px`}>
              <Slider
                min={0}
                max={8}
                value={config.barRadius}
                onChange={(v) => update({ barRadius: v })}
              />
            </Field>
            <Field label="Bar spacing">
              <Segmented
                size="sm"
                value={config.barSpacing}
                onChange={(v) =>
                  update({ barSpacing: v as Config["barSpacing"] })
                }
                options={[
                  { value: "compact", label: "Compact" },
                  { value: "default", label: "Default" },
                  { value: "wide", label: "Wide" },
                ]}
              />
            </Field>
            {numSeries > 1 && (
              <Field label="Layout">
                <Segmented
                  size="sm"
                  value={config.barLayout}
                  onChange={(v) =>
                    update({ barLayout: v as Config["barLayout"] })
                  }
                  options={[
                    { value: "grouped", label: "Grouped" },
                    { value: "stacked", label: "Stacked" },
                  ]}
                />
              </Field>
            )}
          </Group>
          <Group label="Axes & grid">
            <Toggle
              label="Show gridlines"
              value={config.showGrid}
              onChange={(v) => update({ showGrid: v })}
            />
            <Toggle
              label="Show axis ticks"
              value={config.showAxisLabels}
              onChange={(v) => update({ showAxisLabels: v })}
            />
          </Group>
        </>
      )}

      {(config.type === "line" || config.type === "bar") && (
        <Group label="Legend & data labels">
          {numSeries > 1 && (
            <Toggle
              label="Show legend"
              value={config.showLegend}
              onChange={(v) => update({ showLegend: v })}
            />
          )}
          <Toggle
            label="Show values"
            value={config.showValues}
            onChange={(v) => update({ showValues: v })}
          />
        </Group>
      )}

      {config.type === "doughnut" && (
        <>
          <Group label="Segments">
            <Field label="Color palette">
              <Segmented
                size="sm"
                value={config.palette}
                onChange={(v) => update({ palette: v as Config["palette"] })}
                options={[
                  { value: "standard", label: "Standard" },
                  { value: "neutral", label: "Neutral" },
                  { value: "pattern-fill", label: "Pattern fill" },
                ]}
              />
            </Field>
            <Field label={`Inner radius · ${config.innerRadius}%`}>
              <Slider
                min={30}
                max={70}
                value={config.innerRadius}
                onChange={(v) => update({ innerRadius: v })}
              />
            </Field>
            <Toggle
              label="Show segment borders"
              value={config.segmentBorders}
              onChange={(v) => update({ segmentBorders: v })}
            />
          </Group>
          <Group label="Labels & legend">
            <Toggle
              label="Show legend"
              value={config.showLegend}
              onChange={(v) => update({ showLegend: v })}
            />
            <Toggle
              label="Show percentages"
              value={config.showPercent}
              onChange={(v) => update({ showPercent: v })}
            />
            <Field label="Legend position">
              <Segmented
                size="sm"
                value={config.legendPos}
                onChange={(v) =>
                  update({ legendPos: v as Config["legendPos"] })
                }
                options={[
                  { value: "right", label: "Right" },
                  { value: "bottom", label: "Bottom" },
                ]}
              />
            </Field>
          </Group>
        </>
      )}

      <button
        onClick={() => setAdv((a) => !a)}
        className="mt-1 w-full flex items-center justify-between px-2 py-2 text-[12px] font-medium rounded hover:bg-muted text-muted-foreground"
      >
        <span>Advanced</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", adv && "rotate-180")}
        />
      </button>
      {adv && (
        <div className="px-2 pb-2 space-y-2 text-[11.5px] text-muted-foreground">
          {config.type === "line" && (
            <>
              <Field label="Y-axis range">
                <Select value="Auto" options={["Auto", "Custom min–max"]} />
              </Field>
              <Field label="Tick density">
                <Select value="Medium" options={["Low", "Medium", "High"]} />
              </Field>
            </>
          )}
          {config.type === "bar" && (
            <>
              <Field label="Sort bars">
                <Select
                  value="None (input order)"
                  options={["None (input order)", "Ascending", "Descending"]}
                />
              </Field>
              <Field label="Baseline">
                <Select value="Zero" options={["Auto", "Zero"]} />
              </Field>
            </>
          )}
          {config.type === "doughnut" && (
            <>
              <Field label="Sort segments">
                <Select
                  value="Largest first"
                  options={["None", "Largest first"]}
                />
              </Field>
              <Field label="Min slice threshold">
                <Select
                  value="Off"
                  options={[
                    "Off",
                    "Group <2% into 'Other'",
                    "Group <5% into 'Other'",
                  ]}
                />
              </Field>
            </>
          )}
        </div>
      )}
    </Section>
  );
}

/* ---------- SCREEN 5 ---------- */
function Screen5({
  config,
  dataPoints,
  seriesNames,
  inserted,
  inserting,
  insertError,
  onEdit,
  onAnother,
  sizeValidationMessage,
}: {
  config: Config;
  dataPoints: Row[];
  seriesNames: string[];
  inserted: boolean;
  inserting: boolean;
  insertError: string | null;
  onEdit: () => void;
  onAnother: () => void;
  sizeValidationMessage: string | null;
}) {
  return (
    <Section
      title="Ready to insert"
      subtitle="Review your chart before adding it to the canvas."
    >
      <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-[12px]">
        <SummaryRow
          k="Chart type"
          v={
            config.type
              ? config.type[0].toUpperCase() + config.type.slice(1)
              : "—"
          }
        />
        <SummaryRow
          k="Data"
          v={`${dataPoints.length} ${
            config.type === "doughnut" ? "segments" : "rows"
          } · ${seriesNames.length} series`}
        />
        {config.type === "bar" && seriesNames.length > 1 && (
          <SummaryRow
            k="Layout"
            v={config.barLayout === "stacked" ? "Stacked" : "Grouped"}
          />
        )}
        {config.type === "doughnut" ? (
          <SummaryRow
            k="Labels"
            v={`Legend: ${config.showLegend ? "On" : "Off"} · Percentages: ${
              config.showPercent ? "On" : "Off"
            }`}
          />
        ) : (
          <SummaryRow
            k="Axis labels"
            v={`X: ${config.xLabel || "—"}, Y: ${config.yLabel || "—"}`}
          />
        )}
        <SummaryRow k="Chart size" v={getChartSizeSummary(config)} />
        <SummaryRow
          k="Format"
          v={
            config.numberFormat === "currency"
              ? "Currency (£)"
              : config.numberFormat === "percent"
                ? "Percentage"
                : "Plain"
          }
        />
      </div>

      {sizeValidationMessage && (
        <div className="mt-3">
          <Banner tone="error" title="Check custom size">
            {sizeValidationMessage}
          </Banner>
        </div>
      )}

      {insertError && (
        <div className="mt-3">
          <Banner tone="error" title="Could not create chart">
            {insertError}
          </Banner>
        </div>
      )}

      {inserting && (
        <div className="mt-3 inline-flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Inserting…
        </div>
      )}

      {inserted && (
        <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3">
          <div className="flex items-start gap-2">
            <div className="size-5 rounded-full bg-success grid place-items-center mt-0.5">
              <Check className="size-3 text-success-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-[12.5px] font-semibold">Chart inserted</div>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                Your chart is now on the canvas. Select it to edit styles and
                text.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={onEdit}
                  className="h-7 px-2.5 text-[11.5px] font-medium rounded-md border border-border bg-surface hover:bg-muted"
                >
                  Edit chart
                </button>
                <button
                  onClick={onAnother}
                  className="h-7 px-2.5 text-[11.5px] font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Create another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

/* ---------- PREVIEW ---------- */
function PreviewPanel({
  config,
  data,
  seriesNames,
  warnings,
  hasErrors,
  expanded,
  onToggle,
}: {
  config: Config;
  data: Row[];
  seriesNames: string[];
  warnings: string[];
  hasErrors: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-surface-elevated",
        expanded ? "h-[340px]" : "h-[200px]",
      )}
    >
      <div className="h-7 px-3 flex items-center justify-between border-b border-border">
        <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
          Live preview
        </div>
        <button
          onClick={onToggle}
          className="text-[10.5px] text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Collapse" : "Expand preview"}
        </button>
      </div>
      <div className="h-[calc(100%-1.75rem)] p-3">
        {!config.type ? (
          <EmptyPreview text="Choose a chart type to see a preview." />
        ) : data.length < 2 ? (
          <EmptyPreview text="Add data to see preview." />
        ) : warnings.length ? (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center">
            <TriangleAlert className="size-4 text-warning" />
            <div className="text-[11.5px] text-foreground font-medium">
              {warnings[0]}
            </div>
            {warnings[1] && (
              <div className="text-[10.5px] text-muted-foreground">
                {warnings[1]}
              </div>
            )}
          </div>
        ) : (
          <ChartRender
            config={config}
            data={data}
            seriesNames={seriesNames}
            expanded={expanded}
            note={
              hasErrors
                ? "Some rows have issues — preview shows valid data only."
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function EmptyPreview({ text }: { text: string }) {
  return (
    <div className="h-full grid place-items-center text-[11.5px] text-muted-foreground border border-dashed border-border rounded-md">
      {text}
    </div>
  );
}

function ChartRender({
  config,
  data,
  seriesNames,
  expanded,
  note,
}: {
  config: Config;
  data: Row[];
  seriesNames: string[];
  expanded: boolean;
  note?: string;
}) {
  const palette = PALETTES[config.palette];
  const numSeries = Math.max(1, seriesNames.length);
  const colorOf = (i: number) => palette[i % palette.length];

  // Title sits centered at top with ~48px gap to chart.
  // Map "48px gap" into the SVG coord system.
  const TITLE_GAP = 48;

  if (config.type === "line" || config.type === "bar") {
    const W = 360;
    const H = expanded ? 270 : 170;
    // Y-axis label sits 16px from the chart's left edge (outside the tick labels).
    const padL = config.yLabel ? 56 : config.showAxisLabels ? 32 : 12;
    const padR = 10;
    // top: title (if any) + 48px gap; otherwise small pad
    const padT = config.title ? TITLE_GAP : 12;
    // bottom: tick labels + 16px gap to xLabel + xLabel + 24px gap to legend + legend
    const TICKS_H = config.showAxisLabels ? 16 : 4;
    const AXIS_LABEL_GAP = 16; // matches Y axis label gap from chart
    const X_LABEL_H = config.xLabel ? 12 : 0;
    const LEGEND_H = config.showLegend && numSeries > 1 ? 18 : 0;
    const LEGEND_GAP = LEGEND_H ? 24 : 0;
    const padB =
      TICKS_H +
      (X_LABEL_H ? AXIS_LABEL_GAP + X_LABEL_H : 0) +
      LEGEND_GAP +
      LEGEND_H;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const ticks = 4;

    // Compute max value depending on chart layout
    let max = 1;
    if (
      config.type === "bar" &&
      config.barLayout === "stacked" &&
      numSeries > 1
    ) {
      max = Math.max(
        ...data.map((d) =>
          d.values
            .slice(0, numSeries)
            .reduce((a, v) => a + (Number(v) || 0), 0),
        ),
        1,
      );
    } else {
      max = Math.max(
        ...data.flatMap((d) =>
          d.values.slice(0, numSeries).map((v) => Number(v) || 0),
        ),
        1,
      );
    }

    return (
      <div className="h-full w-full flex flex-col">
        {note && <div className="text-[10.5px] text-warning mb-1">{note}</div>}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
          {/* Title — centered top */}
          {config.title && (
            <text
              x={W / 2}
              y={16}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 12, fontWeight: 700 }}
            >
              {config.title}
            </text>
          )}

          {/* Y axis label — 16px from chart left edge (outside tick labels) */}
          {config.yLabel && (
            <text
              transform={`rotate(-90 10 ${padT + innerH / 2})`}
              x={10}
              y={padT + innerH / 2}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              {config.yLabel}
            </text>
          )}

          {/* X axis label — 16px below the chart's tick labels */}
          {config.xLabel && (
            <text
              x={padL + innerW / 2}
              y={padT + innerH + TICKS_H + AXIS_LABEL_GAP + 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              {config.xLabel}
            </text>
          )}

          {/* gridlines */}
          {config.showGrid &&
            Array.from({ length: ticks + 1 }).map((_, i) => {
              const y = padT + (innerH / ticks) * i;
              return (
                <line
                  key={i}
                  x1={padL}
                  x2={W - padR}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth="1"
                />
              );
            })}
          {/* y-axis ticks */}
          {config.showAxisLabels &&
            Array.from({ length: ticks + 1 }).map((_, i) => {
              const v = max - (max / ticks) * i;
              const y = padT + (innerH / ticks) * i;
              return (
                <text
                  key={i}
                  x={padL - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  style={{ fontSize: 8 }}
                >
                  {fmt(Math.round(v), config)}
                </text>
              );
            })}

          {config.type === "line" ? (
            <>
              {Array.from({ length: numSeries }).map((_, sIdx) => {
                const step = innerW / (data.length - 1 || 1);
                const points = data.map((d, i) => {
                  const x = padL + step * i;
                  const v = Number(d.values[sIdx]) || 0;
                  const y = padT + innerH - (v / max) * innerH;
                  return [x, y] as const;
                });
                const path = config.smooth
                  ? smoothPath(points)
                  : points
                      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
                      .join(" ");
                const c = colorOf(sIdx);
                const style =
                  numSeries > 1
                    ? LINE_STYLES[sIdx % LINE_STYLES.length]
                    : LINE_STYLES[0];
                const strokeProps = {
                  fill: "none" as const,
                  stroke: c,
                  strokeWidth: config.lineWeight,
                  strokeLinecap: (style.linecap ?? "round") as "round" | "butt",
                  strokeLinejoin: "round" as const,
                  strokeDasharray: style.dash,
                };
                return (
                  <g key={sIdx}>
                    {style.double ? (
                      <>
                        <path
                          d={path}
                          {...strokeProps}
                          transform={`translate(0,${-(config.lineWeight / 2 + 0.5)})`}
                        />
                        <path
                          d={path}
                          {...strokeProps}
                          transform={`translate(0,${config.lineWeight / 2 + 0.5})`}
                        />
                      </>
                    ) : (
                      <path d={path} {...strokeProps} />
                    )}
                    {config.showPoints &&
                      points.map(([x, y], i) => (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r={config.lineWeight + 1}
                          fill="var(--color-surface)"
                          stroke={c}
                          strokeWidth={config.lineWeight}
                        />
                      ))}
                    {config.showValues &&
                      points.map(([x, y], i) => (
                        <text
                          key={i}
                          x={x}
                          y={y - 6}
                          textAnchor="middle"
                          className="fill-foreground"
                          style={{ fontSize: 8, fontWeight: 600 }}
                        >
                          {fmt(Number(data[i].values[sIdx]) || 0, config)}
                        </text>
                      ))}
                  </g>
                );
              })}
              {config.showAxisLabels &&
                data.map((d, i) => {
                  const step = innerW / (data.length - 1 || 1);
                  return (
                    <text
                      key={i}
                      x={padL + step * i}
                      y={padT + innerH + 12}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      style={{ fontSize: 8 }}
                    >
                      {d.label}
                    </text>
                  );
                })}
            </>
          ) : (
            <>
              {(() => {
                const gap =
                  config.barSpacing === "compact"
                    ? 2
                    : config.barSpacing === "wide"
                      ? 14
                      : 7;
                const groupW = (innerW - gap * (data.length - 1)) / data.length;
                const stacked = config.barLayout === "stacked" && numSeries > 1;
                const innerGap = 1.5;
                const subBarW = stacked
                  ? groupW
                  : (groupW - innerGap * (numSeries - 1)) / numSeries;

                return data.map((d, i) => {
                  const groupX = padL + i * (groupW + gap);

                  if (stacked) {
                    let yCursor = padT + innerH;
                    return (
                      <g key={i}>
                        {Array.from({ length: numSeries }).map((_, sIdx) => {
                          const v = Number(d.values[sIdx]) || 0;
                          const h = (v / max) * innerH;
                          yCursor -= h;
                          const c = colorOf(sIdx);
                          return (
                            <rect
                              key={sIdx}
                              x={groupX}
                              y={yCursor}
                              width={subBarW}
                              height={Math.max(0, h)}
                              rx={sIdx === numSeries - 1 ? config.barRadius : 0}
                              fill={c}
                            />
                          );
                        })}
                        {config.showAxisLabels && (
                          <text
                            x={groupX + groupW / 2}
                            y={padT + innerH + 12}
                            textAnchor="middle"
                            className="fill-muted-foreground"
                            style={{ fontSize: 8 }}
                          >
                            {d.label}
                          </text>
                        )}
                      </g>
                    );
                  }

                  return (
                    <g key={i}>
                      {Array.from({ length: numSeries }).map((_, sIdx) => {
                        const v = Number(d.values[sIdx]) || 0;
                        const h = (v / max) * innerH;
                        const x = groupX + sIdx * (subBarW + innerGap);
                        const y = padT + innerH - h;
                        const c = colorOf(sIdx);
                        return (
                          <g key={sIdx}>
                            <rect
                              x={x}
                              y={y}
                              width={subBarW}
                              height={h}
                              rx={config.barRadius}
                              fill={c}
                            />
                            {config.showValues && (
                              <text
                                x={x + subBarW / 2}
                                y={y - 3}
                                textAnchor="middle"
                                className="fill-foreground"
                                style={{ fontSize: 7.5, fontWeight: 600 }}
                              >
                                {fmt(v, config)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      {config.showAxisLabels && (
                        <text
                          x={groupX + groupW / 2}
                          y={padT + innerH + 12}
                          textAnchor="middle"
                          className="fill-muted-foreground"
                          style={{ fontSize: 8 }}
                        >
                          {d.label}
                        </text>
                      )}
                    </g>
                  );
                });
              })()}
            </>
          )}

          {/* Legend */}
          {config.showLegend && numSeries > 1 && (
            <g>
              {(() => {
                const y = H - 6;
                const itemW = 70;
                const totalW = itemW * numSeries;
                const startX = (W - totalW) / 2;
                return seriesNames.map((name, sIdx) => {
                  const x = startX + sIdx * itemW;
                  return (
                    <g key={sIdx} transform={`translate(${x}, ${y})`}>
                      <rect
                        x={0}
                        y={-7}
                        width={8}
                        height={8}
                        rx={1.5}
                        fill={colorOf(sIdx)}
                      />
                      <text
                        x={12}
                        y={0}
                        className="fill-foreground"
                        style={{ fontSize: 9 }}
                      >
                        {name}
                      </text>
                    </g>
                  );
                });
              })()}
            </g>
          )}
        </svg>
      </div>
    );
  }

  // doughnut
  const nums = data.map((d) => Number(d.values[0] ?? 0));
  const total = nums.reduce((a, b) => a + b, 0) || 1;
  const segments = data.map((d, i) => ({
    label: d.label,
    num: Number(d.values[0] ?? 0),
    color: palette[i % palette.length],
    patternType: getDoughnutPatternType(i),
  }));

  const size = expanded ? 200 : 120;
  const r = size / 2;
  const ir = r * (config.innerRadius / 100);
  let acc = 0;

  const arcs = segments.map((d) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.num;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    return {
      ...d,
      path: arcPath(r, r, r, ir, start, end),
      pct: (d.num / total) * 100,
    };
  });

  const patternedSvg =
    config.palette === "pattern-fill"
      ? createPatternedDoughnutSvg({
          size,
          innerRadiusRatio: config.innerRadius / 100,
          segments: segments.map((segment) => ({
            label: segment.label,
            value: segment.num,
          })),
          segmentBorders: config.segmentBorders,
          defPrefix: "doughnut-preview",
        })
      : null;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Centered title at top with 48px gap */}
      {config.title && (
        <div
          className="text-[12px] font-semibold text-foreground text-center"
          style={{ marginBottom: TITLE_GAP }}
        >
          {config.title}
        </div>
      )}
      <div
        className={cn(
          "flex-1 flex gap-3 min-h-0",
          config.legendPos === "bottom"
            ? "flex-col items-center"
            : "items-center",
        )}
      >
        <div style={{ width: size, height: size }} className="shrink-0">
          {config.palette === "pattern-fill" && patternedSvg ? (
            <img
              src={`data:image/svg+xml;utf8,${encodeURIComponent(patternedSvg)}`}
              width={size}
              height={size}
              alt="Pattern filled doughnut preview"
            />
          ) : (
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
              {arcs.map((a, i) => (
                <path
                  key={i}
                  d={a.path}
                  fill={a.color}
                  stroke={
                    config.segmentBorders ? "var(--color-surface)" : "none"
                  }
                  strokeWidth={config.segmentBorders ? 2 : 0}
                />
              ))}
            </svg>
          )}
        </div>
        {config.showLegend && (
          <div
            className={cn(
              "flex-1 min-w-0",
              config.legendPos === "bottom"
                ? "grid grid-cols-2 gap-x-3 gap-y-1 w-full"
                : "space-y-1",
            )}
          >
            {arcs.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-[10px] min-w-0"
              >
                {config.palette === "pattern-fill" ? (
                  <img
                    className="size-2 rounded-sm shrink-0"
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(createPatternLegendSwatchSvg(i, 12))}`}
                    alt=""
                  />
                ) : (
                  <span
                    className="size-2 rounded-sm shrink-0"
                    style={{ background: a.color }}
                  />
                )}
                <span className="truncate text-foreground">{a.label}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {config.showPercent
                    ? `${a.pct.toFixed(0)}%`
                    : fmt(a.num, config)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function smoothPath(pts: readonly (readonly [number, number])[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const cx = (x1 + x2) / 2;
    d += ` C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  }
  return d;
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  ir: number,
  start: number,
  end: number,
) {
  const large = end - start > Math.PI ? 1 : 0;
  const x1 = cx + r * Math.cos(start),
    y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end),
    y2 = cy + r * Math.sin(end);
  const x3 = cx + ir * Math.cos(end),
    y3 = cy + ir * Math.sin(end);
  const x4 = cx + ir * Math.cos(start),
    y4 = cy + ir * Math.sin(start);
  return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${ir},${ir} 0 ${large} 0 ${x4},${y4} Z`;
}

/* ---------- HELP ---------- */
function HelpDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex justify-end">
      <button className="flex-1 bg-foreground/20" onClick={onClose} />
      <div className="w-[280px] h-full bg-surface border-l border-border flex flex-col">
        <div className="h-11 px-3 border-b border-border flex items-center justify-between">
          <span className="text-[13px] font-semibold">Help</span>
          <button
            onClick={onClose}
            className="size-7 grid place-items-center rounded hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto text-[12px]">
          <div>
            <div className="font-semibold mb-1">Multi-series data format</div>
            <pre className="bg-muted/60 p-2 rounded text-[11px] font-mono whitespace-pre">{`Month, Revenue, Costs
Jan, 12400, 8200
Feb, 13800, 8900`}</pre>
            <p className="text-[11px] text-muted-foreground mt-1">
              First row can hold series names. Up to 4 lines / 6 bars.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-1">Bar layouts</div>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              <li>Grouped — bars sit side-by-side per category.</li>
              <li>Stacked — series stack on top of each other.</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-1">Shortcuts</div>
            <div className="text-muted-foreground">
              ⌘/Ctrl + ↵ — Insert chart
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- PRIMITIVES ---------- */
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3 space-y-2.5">
      <div>
        <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground px-0.5">
        {label}
      </div>
      <div className="space-y-2 rounded-lg border border-border p-2.5 bg-surface">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-2">
      <label className="text-[11.5px] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-7 px-2 text-[12px] rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
    />
  );
}

function Select({
  value,
  options,
  onChange,
  getLabel,
}: {
  value: string;
  options: string[];
  onChange?: (v: string) => void;
  getLabel?: (v: string) => string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full h-7 pl-2 pr-6 text-[12px] rounded-md border border-input bg-background appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {getLabel ? getLabel(o) : o}
          </option>
        ))}
      </select>
      <ChevronDown className="size-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between py-1 text-[12px] group"
    >
      <span className="text-foreground">{label}</span>
      <span
        className={cn(
          "relative w-7 h-4 rounded-full transition-colors",
          value ? "bg-primary" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white shadow-sm transition-all",
            value ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function Slider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-primary"
    />
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex p-0.5 rounded-md bg-muted border border-border w-full",
        size === "sm" ? "h-7" : "h-8",
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 text-[11.5px] font-medium rounded-sm transition-colors",
            value === o.value
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Banner({
  tone,
  title,
  children,
}: {
  tone: "info" | "success" | "error" | "warn";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-muted/60 border-border text-muted-foreground",
    success: "bg-success/5 border-success/30 text-foreground",
    error: "bg-destructive/5 border-destructive/30 text-foreground",
    warn: "bg-warning/10 border-warning/30 text-foreground",
  }[tone];
  return (
    <div className={cn("rounded-md border px-2.5 py-2 text-[11.5px]", styles)}>
      {title && <div className="font-semibold mb-0.5">{title}</div>}
      {children}
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: ChartStudioApp,
  head: () => ({
    meta: [
      { title: "ChartStudio — Figma Charts Plugin" },
      {
        name: "description",
        content:
          "Insert clean, finance-friendly Line, Bar, and Doughnut charts with multiple series into your Figma files in seconds.",
      },
    ],
  }),
});
