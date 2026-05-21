import {
  createPatternLegendSwatchSvg,
  createPatternedDoughnutSvg,
} from "../lib/doughnut-pattern-svg";
import {
  formatChartValue,
  formatPercent,
  getNumberFormatConfig,
} from "../lib/number-format";
import type {
  ChartOutputSize,
  ChartPayload,
  LineStyleName,
  UiToFigmaMessage,
} from "./types";

type RGB = { r: number; g: number; b: number };
type Paint = { type: "SOLID"; color: RGB; opacity?: number };
type FontName = { family: string; style: string };
type ConstraintValue = "MIN" | "CENTER" | "MAX" | "STRETCH" | "SCALE";
type SceneNode = {
  name: string;
  x: number;
  y: number;
  constraints?: { horizontal: ConstraintValue; vertical: ConstraintValue };
  resize?: (width: number, height: number) => void;
  constrainProportions?: boolean;
  rotation?: number;
  appendChild?: (node: SceneNode) => void;
  remove?: () => void;
};
type FrameNode = SceneNode & {
  fills: Paint[];
  clipsContent: boolean;
  appendChild: (node: SceneNode) => void;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  itemSpacing?: number;
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  layoutAlign?: "INHERIT" | "STRETCH";
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
};
type RectangleNode = SceneNode & {
  fills: Paint[];
  cornerRadius: number;
};
type EllipseNode = SceneNode & {
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
};
type TextNode = SceneNode & {
  characters: string;
  fontSize: number;
  fontName: FontName;
  lineHeight?: { unit: "PIXELS"; value: number };
  fills: Paint[];
  textAlignHorizontal: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical: "TOP" | "CENTER" | "BOTTOM";
  textStyleId?: string;
  setTextStyleIdAsync?: (styleId: string) => Promise<void>;
};
type TextStyle = { id: string; name: string };
type LineNode = SceneNode & {
  strokes: Paint[];
  strokeWeight: number;
  rotation: number;
};
type VectorNode = SceneNode & {
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
  vectorPaths: { windingRule: "NONZERO" | "EVENODD"; data: string }[];
  strokeCap?: "NONE" | "ROUND" | "SQUARE";
  dashPattern?: number[];
};
type ChartPoint = { x: number; y: number; value: number; label: string };

type FigmaPluginApi = {
  showUI: (
    html: string,
    options: { width: number; height: number; themeColors?: boolean },
  ) => void;
  ui: {
    onmessage: ((message: UiToFigmaMessage) => void) | null;
    postMessage: (message: unknown) => void;
  };
  viewport: {
    scrollAndZoomIntoView: (nodes: SceneNode[]) => void;
    center: { x: number; y: number };
  };
  currentPage: {
    appendChild: (node: SceneNode) => void;
    selection: SceneNode[];
  };
  createFrame: () => FrameNode;
  createRectangle: () => RectangleNode;
  createEllipse: () => EllipseNode;
  createText: () => TextNode;
  createLine: () => LineNode;
  createVector: () => VectorNode;
  createNodeFromSvg: (svg: string) => SceneNode;
  loadFontAsync: (fontName: FontName) => Promise<void>;
  getLocalTextStylesAsync?: () => Promise<TextStyle[]>;
  notify: (message: string, options?: { error?: boolean }) => void;
  closePlugin: () => void;
};

declare const figma: FigmaPluginApi;
declare const __html__: string;

const FONT_REGULAR: FontName = { family: "Forever Forma", style: "Regular" };
const FONT_MEDIUM: FontName = { family: "Forever Forma", style: "Medium" };
const FONT_BOLD: FontName = { family: "Forever Forma", style: "Bold" };
const FONT_AXLE_FALLBACK: FontName = {
  family: "Forever Forma Heading",
  style: "Regular",
};

const PALETTES: Record<ChartPayload["palette"], string[]> = {
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
    "#E6E3DC",
    "#E6E3DC",
    "#E6E3DC",
    "#E6E3DC",
    "#E6E3DC",
    "#E6E3DC",
    "#E6E3DC",
  ],
  data: [
    "#278004",
    "#860DA8",
    "#005873",
    "#D5648D",
    "#959898",
    "#386500",
    "#5840DC",
    "#449DC4",
  ],
};

const LINE_STYLES: Record<
  LineStyleName,
  {
    dashPattern?: number[];
    double?: boolean;
    strokeCap: "NONE" | "ROUND" | "SQUARE";
  }
> = {
  default: { strokeCap: "ROUND" },
  "default-underline": { double: true, strokeCap: "ROUND" },
  dotted: { dashPattern: [1, 8], strokeCap: "ROUND" },
  "dash-01": { dashPattern: [8, 8], strokeCap: "NONE" },
  "dash-02": { dashPattern: [24, 12], strokeCap: "NONE" },
};

const COLORS = {
  text: hexToRgb("#281805"),
  mutedText: hexToRgb("#281805"),
  grid: hexToRgb("#CAC8C2"),
  axis: hexToRgb("#281805"),
  background: hexToRgb("#FFFFFF"),
};

const TEXT_STYLES = {
  title: { fontSize: 32, lineHeight: 40, font: FONT_REGULAR },
  axisTitle: { fontSize: 14, lineHeight: 18, font: FONT_REGULAR },
};

const CHART_SIZE_PRESETS: Record<
  Exclude<ChartOutputSize["preset"], "custom">,
  { label: string; width: number }
> = {
  "desktop-12": { label: "Desktop 12 column", width: 1064 },
  "desktop-10": { label: "Desktop 10 column", width: 872 },
  "desktop-8": { label: "Desktop 8 column", width: 680 },
  "tablet-12": { label: "Tablet 12 column", width: 632 },
  "mobile-4": { label: "Mobile 4 column", width: 351 },
};
const DEFAULT_CHART_SIZE: ChartOutputSize = {
  preset: "desktop-8",
  width: CHART_SIZE_PRESETS["desktop-8"].width,
};
const MIN_CUSTOM_WIDTH = 320;
const CHART_FRAME_PADDING = 8;
const DESKTOP_SECTION_SPACING = 48;
const COMPACT_SECTION_SPACING = 16;
const AXIS_TICK_LABEL_GUTTER_MIN = 64;
const Y_AXIS_TITLE_GAP = 4;
const LABEL_TO_CHART_GAP = 4;
const Y_AXIS_TITLE_GUTTER_MIN = 22;
const GRID = 8;
const MOBILE_CUSTOM_WIDTH_MAX = 480;
const AXLE_TITLE_STYLES = {
  desktopTablet: "AXLE 2.0 - Light/heading/lg",
  mobile: "AXLE 2.0 - Light/heading/xs",
};
const AXLE_STYLE_FALLBACK_WARNING =
  "AXLE title style not found. Using fallback typography. Make sure _Core.AXLE 2.0 styles are enabled in this Figma file.";

type ChartLayout = {
  outerWidth: number;
  outerHeight: number;
  contentWidth: number;
  contentHeight: number;
  contentFrameHeight: number;
  cartesian: {
    padding: { top: number; left: number; bottom: number; right: number };
    yAxisTitleGutterWidth: number;
    yAxisTickLabelGutterWidth: number;
    plotWidth: number;
    plotHeight: number;
    legendHeight: number;
    chartAreaHeight: number;
  };
  doughnut: {
    areaHeight: number;
    chartX: number;
    chartY: number;
    squareSize: number;
    legendWidth: number;
    legendHeight: number;
    legendColumns: number;
  };
};

figma.showUI(__html__, { width: 440, height: 760, themeColors: true });

figma.ui.onmessage = async (message) => {
  if (message.type === "cancel") {
    figma.closePlugin();
    return;
  }

  if (message.type !== "create-chart" && message.type !== "create-bar-chart") {
    return;
  }

  let chart: FrameNode | null = null;

  try {
    const result = validatePayload(message.payload);
    if (!result.valid) {
      figma.notify(result.message, { error: true });
      figma.ui.postMessage({ type: "chart-error", message: result.message });
      return;
    }

    await Promise.all([
      figma.loadFontAsync(FONT_REGULAR),
      figma.loadFontAsync(FONT_MEDIUM),
      figma.loadFontAsync(FONT_BOLD),
    ]);

    chart = await createEditableChart(message.payload);
    figma.currentPage.appendChild(chart);
    figma.currentPage.selection = [chart];
    figma.viewport.scrollAndZoomIntoView([chart]);
    figma.notify(
      `Editable ${getChartTypeLabel(message.payload.type)} chart created`,
    );
    figma.ui.postMessage({ type: "chart-created" });
  } catch (error) {
    if (chart?.remove) chart.remove();
    const messageText =
      error instanceof Error
        ? `Could not create ${getChartTypeLabel(message.payload.type)} chart: ${error.message}`
        : `Could not create ${getChartTypeLabel(message.payload.type)} chart.`;
    figma.notify(messageText, { error: true });
    figma.ui.postMessage({ type: "chart-error", message: messageText });
  }
};

function validatePayload(
  payload: ChartPayload,
): { valid: true } | { valid: false; message: string } {
  if (!payload.type) {
    return {
      valid: false,
      message: "Choose a chart type before creating a chart.",
    };
  }
  if (payload.rows.length < 2) {
    return {
      valid: false,
      message: `Add at least two ${payload.type === "doughnut" ? "segments" : "rows"} of data before creating a chart.`,
    };
  }
  const hasNumericValue = payload.rows.every((row) =>
    row.values.some((value) => Number.isFinite(Number(value))),
  );
  if (!hasNumericValue) {
    return {
      valid: false,
      message: "Every row needs at least one numeric value.",
    };
  }
  const sizeValidation = validateChartSize(payload.chartSize);
  if (!sizeValidation.valid) return sizeValidation;

  if (payload.type === "doughnut") {
    const values = payload.rows.map((row) => Number(row.values[0]) || 0);
    if (values.some((value) => value < 0)) {
      return { valid: false, message: "Doughnut charts need positive values." };
    }
    if (values.reduce((sum, value) => sum + value, 0) <= 0) {
      return {
        valid: false,
        message: "Doughnut chart values must add up to more than zero.",
      };
    }
  }
  return { valid: true };
}

async function createEditableChart(payload: ChartPayload): Promise<FrameNode> {
  if (payload.type === "bar") return createEditableBarChart(payload);
  if (payload.type === "line") return createEditableLineChart(payload);
  if (payload.type === "doughnut") return createEditableDoughnutChart(payload);
  throw new Error("Unsupported chart type.");
}

function resolveChartSize(size?: ChartOutputSize): ChartOutputSize {
  if (!size) return DEFAULT_CHART_SIZE;
  if (size.preset !== "custom") {
    const preset =
      CHART_SIZE_PRESETS[size.preset] ?? CHART_SIZE_PRESETS["desktop-8"];
    return { preset: size.preset, width: preset.width };
  }
  return {
    preset: "custom",
    width: Math.round(Number(size.width)),
  };
}

function validateChartSize(
  size?: ChartOutputSize,
): { valid: true } | { valid: false; message: string } {
  const resolved = resolveChartSize(size);
  if (!Number.isFinite(resolved.width)) {
    return { valid: false, message: "Enter a valid chart width." };
  }
  if (resolved.width < MIN_CUSTOM_WIDTH) {
    return {
      valid: false,
      message: `Chart width must be at least ${MIN_CUSTOM_WIDTH}px.`,
    };
  }
  return { valid: true };
}

function createChartLayout(payload: ChartPayload): ChartLayout {
  const size = resolveChartSize(payload.chartSize);
  const contentWidth = size.width - CHART_FRAME_PADDING * 2;
  const compact = size.width <= 420;
  const sectionSpacing = getChartSectionSpacing(payload);
  const contentHeight = Math.max(
    220,
    Math.round(size.width * (compact ? 0.72 : 0.46)),
  );
  const hasLegend = payload.showLegend;
  const axisTickLabelBand = payload.showAxisLabels ? 28 : 0;
  const xAxisTitleBand = payload.xLabel ? 36 : 0;
  const yAxisTitleGutterWidth = payload.yLabel
    ? Math.max(
        Y_AXIS_TITLE_GUTTER_MIN,
        TEXT_STYLES.axisTitle.lineHeight + Y_AXIS_TITLE_GAP,
      )
    : 0;
  const yAxisTickLabelGutterWidth = payload.showAxisLabels
    ? AXIS_TICK_LABEL_GUTTER_MIN
    : 0;
  const yAxisTitleGap = payload.yLabel ? 4 : 0;
  const yAxisTickGap = payload.showAxisLabels ? 4 : 0;
  const cartesianPadding = {
    top: payload.showAxisLabels ? 8 : 0,
    right: compact ? 16 : 24,
    bottom: axisTickLabelBand + xAxisTitleBand + 4,
    left:
      (compact ? 8 : 12) +
      yAxisTitleGutterWidth +
      yAxisTitleGap +
      yAxisTickLabelGutterWidth +
      yAxisTickGap,
  };
  const plotWidth = Math.max(
    GRID * 10,
    contentWidth - cartesianPadding.left - cartesianPadding.right,
  );
  const plotHeight = Math.max(
    GRID * 6,
    contentHeight - cartesianPadding.top - cartesianPadding.bottom,
  );
  const legendHeight = hasLegend ? 24 : 0;
  const cartesianChartAreaHeight =
    cartesianPadding.top + plotHeight + cartesianPadding.bottom;

  const doughnutTop = compact ? 8 : 12;
  const doughnutLabelInset = payload.showValues ? (compact ? 20 : 26) : 0;
  const rightLegendAllowed = payload.legendPos === "right" && size.width >= 560;
  const legendRows = Math.ceil(
    payload.rows.length / (rightLegendAllowed ? 1 : 2),
  );
  const doughnutLegendHeight = hasLegend ? Math.max(24, legendRows * 26) : 0;
  const doughnutLegendWidth = hasLegend
    ? rightLegendAllowed
      ? Math.min(240, Math.max(176, contentWidth * 0.28))
      : Math.min(contentWidth - GRID * 2, 520)
    : 0;
  const doughnutGap = hasLegend ? (compact ? 12 : 24) : 0;
  const availableDoughnutHeight = Math.max(
    GRID * 10,
    contentHeight -
      doughnutTop -
      GRID -
      (rightLegendAllowed ? 0 : doughnutLegendHeight + doughnutGap) -
      doughnutLabelInset * 2,
  );
  const availableDoughnutWidth = Math.max(
    GRID * 10,
    contentWidth -
      (rightLegendAllowed ? doughnutLegendWidth + doughnutGap : 0) -
      doughnutLabelInset * 2,
  );
  const squareSize = Math.max(
    GRID * 10,
    Math.min(availableDoughnutWidth, availableDoughnutHeight),
  );
  const combinedWidth = rightLegendAllowed
    ? squareSize + doughnutLabelInset * 2 + doughnutGap + doughnutLegendWidth
    : squareSize + doughnutLabelInset * 2;
  const chartX = rightLegendAllowed
    ? doughnutLabelInset
    : Math.max(GRID, (contentWidth - combinedWidth) / 2 + doughnutLabelInset);
  const chartY = doughnutTop + doughnutLabelInset;
  const doughnutAreaHeight = rightLegendAllowed
    ? squareSize + doughnutLabelInset * 2
    : squareSize +
      doughnutLabelInset * 2 +
      (hasLegend ? doughnutGap + doughnutLegendHeight : 0);

  const hasTitle = Boolean(payload.title);
  const hasCartesianLabels =
    payload.type !== "doughnut" &&
    (payload.showAxisLabels ||
      Boolean(payload.xLabel) ||
      Boolean(payload.yLabel));
  const hasDoughnutLabels = payload.type === "doughnut" && payload.showValues;
  const hasLegendSection =
    payload.type === "doughnut"
      ? payload.showLegend
      : payload.showLegend && Math.max(1, payload.seriesNames.length) > 1;
  const chartAreaHeight =
    payload.type === "doughnut" ? doughnutAreaHeight : cartesianChartAreaHeight;
  const labelsHeight = 0;
  const legendSectionHeight = hasLegendSection
    ? payload.type === "doughnut"
      ? doughnutLegendHeight || 24
      : legendHeight || 24
    : 0;
  const sectionCount =
    Number(hasTitle) +
    1 +
    Number(labelsHeight > 0) +
    Number(legendSectionHeight > 0);
  const contentFrameHeight =
    (hasTitle ? TEXT_STYLES.title.lineHeight : 0) +
    chartAreaHeight +
    labelsHeight +
    legendSectionHeight +
    Math.max(0, sectionCount - 1) * sectionSpacing;
  const outerHeight = Math.max(
    CHART_FRAME_PADDING * 2 + 1,
    contentFrameHeight + CHART_FRAME_PADDING * 2,
  );

  return {
    outerWidth: size.width,
    outerHeight,
    contentWidth,
    contentHeight,
    contentFrameHeight,
    cartesian: {
      padding: cartesianPadding,
      yAxisTitleGutterWidth,
      yAxisTickLabelGutterWidth,
      plotWidth,
      plotHeight,
      legendHeight,
      chartAreaHeight: cartesianChartAreaHeight,
    },
    doughnut: {
      areaHeight: doughnutAreaHeight,
      chartX,
      chartY,
      squareSize,
      legendWidth: doughnutLegendWidth,
      legendHeight: doughnutLegendHeight,
      legendColumns: rightLegendAllowed ? 1 : 2,
    },
  };
}

function getChartSectionSpacing(payload: ChartPayload): number {
  const resolved = resolveChartSize(payload.chartSize);
  if (payload.type === "line") {
    return getLineChartLegendSpacing();
  }
  if (resolved.preset === "tablet-12" || resolved.preset === "mobile-4") {
    return COMPACT_SECTION_SPACING;
  }
  if (resolved.preset === "custom") {
    return resolved.width > 680
      ? DESKTOP_SECTION_SPACING
      : COMPACT_SECTION_SPACING;
  }
  return DESKTOP_SECTION_SPACING;
}

function getLineChartLegendSpacing(): number {
  return 16;
}

function finalizeChartFrame(frame: FrameNode, layout: ChartLayout): void {
  const finalHeight = Math.ceil(
    Math.max(
      CHART_FRAME_PADDING * 2 + 1,
      layout.contentFrameHeight + CHART_FRAME_PADDING * 2,
    ),
  );
  if (frame.resize) frame.resize(layout.outerWidth, finalHeight);
}

function createChartSectionFrame(
  name: string,
  width: number,
  height: number,
): FrameNode {
  const section = figma.createFrame();
  section.name = name;
  if (section.resize) section.resize(width, Math.max(0, height));
  section.fills = [];
  section.clipsContent = false;
  section.layoutAlign = "STRETCH";
  return section;
}

async function createBaseFrame(
  payload: ChartPayload,
  fallbackName: string,
  layout: ChartLayout,
): Promise<{ frame: FrameNode; contentFrame: FrameNode }> {
  const frame = figma.createFrame();
  frame.name = payload.title || fallbackName;
  if (frame.resize) frame.resize(layout.outerWidth, layout.outerHeight);
  frame.x = figma.viewport.center.x - layout.outerWidth / 2;
  frame.y = figma.viewport.center.y - layout.outerHeight / 2;
  frame.fills = [];
  frame.clipsContent = false;

  const contentFrame = figma.createFrame();
  contentFrame.name = "Chart content";
  contentFrame.x = CHART_FRAME_PADDING;
  contentFrame.y = CHART_FRAME_PADDING;
  if (contentFrame.resize) {
    contentFrame.resize(layout.contentWidth, layout.contentFrameHeight);
  }
  contentFrame.fills = [];
  contentFrame.clipsContent = false;
  contentFrame.layoutMode = "VERTICAL";
  contentFrame.itemSpacing = getChartSectionSpacing(payload);
  contentFrame.primaryAxisSizingMode = "AUTO";
  contentFrame.counterAxisSizingMode = "FIXED";
  setConstraints(contentFrame, "MIN", "MIN");
  frame.appendChild(contentFrame);

  if (payload.title) {
    const title = createText(
      "",
      TEXT_STYLES.title.fontSize,
      TEXT_STYLES.title.font,
      COLORS.text,
      0,
      0,
      layout.contentWidth,
      TEXT_STYLES.title.lineHeight,
      "CENTER",
      TEXT_STYLES.title.lineHeight,
    );
    title.name = "Chart Title text";
    await applyChartTitleTextStyle(title, payload.chartSize);
    title.characters = payload.title;
    title.textAlignVertical = "TOP";
    setConstraints(title, "MIN", "MIN");
    const titleFrame = createChartSectionFrame(
      "Chart Title",
      layout.contentWidth,
      TEXT_STYLES.title.lineHeight,
    );
    titleFrame.appendChild(title);
    contentFrame.appendChild(titleFrame);
  }

  return { frame, contentFrame };
}

async function createEditableBarChart(
  payload: ChartPayload,
): Promise<FrameNode> {
  const layout = createChartLayout(payload);
  const { padding, plotWidth, plotHeight } = layout.cartesian;
  const height = layout.contentHeight;
  const seriesCount = Math.max(1, payload.seriesNames.length);
  const rows = payload.rows.map((row) => ({
    label: row.label,
    values: row.values
      .slice(0, seriesCount)
      .map((value) => getFiniteNumber(value, 0)),
  }));
  const maxValue = getMaxValue(
    rows.map((row) => row.values),
    payload.barLayout,
  );
  const niceMax = niceCeil(maxValue);

  const { frame, contentFrame } = await createBaseFrame(
    payload,
    "ChartStudio Bar Chart",
    layout,
  );
  frame.name = "ChartStudio Chart";

  const chartAreaFrame = createChartSectionFrame(
    "Chart Area",
    layout.contentWidth,
    layout.cartesian.chartAreaHeight,
  );
  const labelsFrame = createTransparentFrame(
    "Labels",
    0,
    0,
    layout.contentWidth,
    layout.cartesian.chartAreaHeight,
  );
  contentFrame.appendChild(labelsFrame);
  contentFrame.appendChild(chartAreaFrame);

  drawGridAndAxes(
    chartAreaFrame,
    payload,
    padding,
    plotWidth,
    plotHeight,
    niceMax,
  );
  drawBars(
    chartAreaFrame,
    payload,
    rows,
    padding,
    plotWidth,
    plotHeight,
    niceMax,
    seriesCount,
  );
  drawYAxisTickLabels(labelsFrame, payload, padding, plotHeight, niceMax);
  drawAxisLabels(labelsFrame, payload, padding, plotWidth, plotHeight, layout);

  if (payload.showLegend && seriesCount > 1) {
    const legendSection = createChartSectionFrame(
      "Chart Legend",
      layout.contentWidth,
      layout.cartesian.legendHeight || 24,
    );
    drawLegend(legendSection, payload, padding, plotWidth, height, layout);
    contentFrame.appendChild(legendSection);
  }

  finalizeChartFrame(frame, layout);
  return frame;
}

function getValueFormatterConfig(payload: ChartPayload) {
  return getNumberFormatConfig(payload);
}

async function createEditableLineChart(
  payload: ChartPayload,
): Promise<FrameNode> {
  const layout = createChartLayout(payload);
  const { padding, plotWidth, plotHeight } = layout.cartesian;
  const height = layout.contentHeight;
  const seriesCount = Math.max(1, payload.seriesNames.length);
  const rows = payload.rows.map((row) => ({
    label: row.label,
    values: row.values
      .slice(0, seriesCount)
      .map((value) => getFiniteNumber(value, 0)),
  }));
  const niceMax = niceCeil(getLargestValue(rows.map((row) => row.values)));
  const colors = PALETTES[payload.palette].map(hexToRgb);
  const { frame, contentFrame } = await createBaseFrame(
    payload,
    "ChartStudio Line Chart",
    layout,
  );
  frame.name = "ChartStudio Chart";

  try {
    const chartBodyFrame = createChartSectionFrame(
      "Chart Body",
      layout.contentWidth,
      layout.cartesian.chartAreaHeight,
    );
    const chartAreaFrame = createTransparentFrame(
      "Plot area",
      padding.left,
      padding.top,
      plotWidth,
      plotHeight,
    );
    contentFrame.appendChild(chartBodyFrame);
    chartBodyFrame.appendChild(chartAreaFrame);

    drawGridAndAxes(
      chartAreaFrame,
      payload,
      { top: 0, left: 0, right: 0, bottom: 0 },
      plotWidth,
      plotHeight,
      niceMax,
    );

    const denominator = Math.max(rows.length - 1, 1);
    for (let seriesIndex = 0; seriesIndex < seriesCount; seriesIndex += 1) {
      const seriesName = getSeriesName(payload.seriesNames, seriesIndex);
      const points = rows.map((row, rowIndex) => {
        const value = getFiniteNumber(row.values[seriesIndex], 0);
        const x = (plotWidth * rowIndex) / denominator;
        const y = plotHeight - (Math.max(0, value) / niceMax) * plotHeight;
        return sanitizeChartPoint({ x, y, value, label: row.label });
      });

      const lineStyle = getLineStyle(payload, seriesIndex, seriesCount);
      const linePath = payload.smooth
        ? smoothPath(points)
        : straightPath(points);
      const lineWeight = Math.max(1, getFiniteNumber(payload.lineWeight, 1));
      const lineColor = colors[seriesIndex % colors.length];

      if (lineStyle.double) {
        const offset = lineWeight / 2 + 0.5;
        chartAreaFrame.appendChild(
          withConstraints(
            createVectorPath(
              `${seriesName} Line · upper`,
              offsetPath(linePath, -offset),
              lineColor,
              lineWeight,
              lineStyle,
            ),
            "SCALE",
            "SCALE",
          ),
        );
        chartAreaFrame.appendChild(
          withConstraints(
            createVectorPath(
              `${seriesName} Line · lower`,
              offsetPath(linePath, offset),
              lineColor,
              lineWeight,
              lineStyle,
            ),
            "SCALE",
            "SCALE",
          ),
        );
      } else {
        chartAreaFrame.appendChild(
          withConstraints(
            createVectorPath(
              `${seriesName} Line`,
              linePath,
              lineColor,
              lineWeight,
              lineStyle,
            ),
            "SCALE",
            "SCALE",
          ),
        );
      }

      if (payload.showPoints) {
        points.forEach((point) => {
          chartAreaFrame.appendChild(
            createLinePointMarker(
              `${seriesName} data point · ${point.label}`,
              point.x,
              point.y,
              colors[seriesIndex % colors.length],
            ),
          );
          if (payload.showValues) {
            chartAreaFrame.appendChild(
              withConstraints(
                createText(
                  formatChartValue(
                    point.value,
                    getValueFormatterConfig(payload),
                  ),
                  10,
                  FONT_MEDIUM,
                  COLORS.mutedText,
                  point.x - 30,
                  Math.max(0, point.y - 24),
                  60,
                  14,
                  "CENTER",
                ),
                "SCALE",
                "SCALE",
              ),
            );
          }
        });
      }
    }

    const yAxisFrame = withConstraints(
      createAutoLayoutFrame(
        "Y Axis",
        0,
        padding.top,
        "HORIZONTAL",
        LABEL_TO_CHART_GAP,
        "AUTO",
        "AUTO",
      ),
      "MIN",
      "MIN",
    );
    yAxisFrame.primaryAxisAlignItems = "MIN";
    yAxisFrame.counterAxisAlignItems = "CENTER";
    if (payload.yLabel) {
      const yAxisLabel = createAutoLayoutFrame(
        "Y axis label",
        0,
        0,
        "VERTICAL",
        0,
        "AUTO",
        "AUTO",
      );
      yAxisLabel.primaryAxisAlignItems = "CENTER";
      yAxisLabel.counterAxisAlignItems = "CENTER";
      const yAxisLabelText = createText(
        payload.yLabel,
        TEXT_STYLES.axisTitle.fontSize,
        TEXT_STYLES.axisTitle.font,
        COLORS.text,
        0,
        0,
        1,
        TEXT_STYLES.axisTitle.lineHeight,
        "CENTER",
      );
      (
        yAxisLabelText as TextNode & { textAutoResize?: "WIDTH_AND_HEIGHT" }
      ).textAutoResize = "WIDTH_AND_HEIGHT";
      yAxisLabelText.rotation = -90;
      yAxisLabel.appendChild(yAxisLabelText);
      yAxisFrame.appendChild(yAxisLabel);
    }
    const yAxisTickLabels = drawYAxisTickLabels(
      yAxisFrame,
      payload,
      { top: 0, left: 0, right: 0, bottom: 0 },
      plotHeight,
      niceMax,
    );
    if (yAxisTickLabels) {
      yAxisTickLabels.x = 0;
      yAxisTickLabels.y = 0;
    }
    chartBodyFrame.appendChild(yAxisFrame);

    chartAreaFrame.x =
      (yAxisFrame as FrameNode & { width: number }).width + LABEL_TO_CHART_GAP;
    chartAreaFrame.y = padding.top;

    const xAxisFrame = withConstraints(
      createAutoLayoutFrame(
        "X Axis",
        chartAreaFrame.x,
        chartAreaFrame.y + plotHeight + LABEL_TO_CHART_GAP,
        "VERTICAL",
        LABEL_TO_CHART_GAP,
        "AUTO",
        "AUTO",
      ),
      "MIN",
      "MIN",
    );
    xAxisFrame.primaryAxisAlignItems = "MIN";
    xAxisFrame.counterAxisAlignItems = "CENTER";
    drawXAxisCategoryLabels(
      xAxisFrame,
      payload,
      rows,
      { top: 0, left: 0, right: 0, bottom: 0 },
      plotWidth,
      0,
    );
    if (payload.xLabel) {
      const xAxisLabel = createAutoLayoutFrame(
        "X axis label",
        0,
        0,
        "HORIZONTAL",
        0,
        "AUTO",
        "AUTO",
      );
      xAxisLabel.primaryAxisAlignItems = "CENTER";
      xAxisLabel.counterAxisAlignItems = "CENTER";
      const xAxisLabelText = createText(
        payload.xLabel,
        TEXT_STYLES.axisTitle.fontSize,
        TEXT_STYLES.axisTitle.font,
        COLORS.text,
        0,
        0,
        1,
        TEXT_STYLES.axisTitle.lineHeight,
        "CENTER",
      );
      (
        xAxisLabelText as TextNode & { textAutoResize?: "WIDTH_AND_HEIGHT" }
      ).textAutoResize = "WIDTH_AND_HEIGHT";
      xAxisLabel.appendChild(xAxisLabelText);
      xAxisFrame.appendChild(xAxisLabel);
    }
    chartBodyFrame.appendChild(xAxisFrame);

    if (payload.showLegend && seriesCount > 1) {
      const legendSection = createChartSectionFrame(
        "Chart Legend",
        layout.contentWidth,
        layout.cartesian.legendHeight || 24,
      );
      drawLegend(legendSection, payload, padding, plotWidth, height, layout);
      contentFrame.appendChild(legendSection);
    }

    finalizeChartFrame(frame, layout);
    return frame;
  } catch (error) {
    if (frame.remove) frame.remove();
    throw error;
  }
}

async function createEditableDoughnutChart(
  payload: ChartPayload,
): Promise<FrameNode> {
  const layout = createChartLayout(payload);
  const { frame, contentFrame } = await createBaseFrame(
    payload,
    "ChartStudio Doughnut Chart",
    layout,
  );
  frame.name = "ChartStudio Chart";

  const colors = PALETTES[payload.palette].map(hexToRgb);
  const values = payload.rows.map((row) => ({
    label: row.label,
    value: Math.max(0, Number(row.values[0]) || 0),
  }));
  const total = values.reduce((sum, row) => sum + row.value, 0);
  const doughnut = layout.doughnut;
  const diameter = doughnut.squareSize;
  const outerRadius = diameter / 2;
  const innerRadius = Math.max(
    20,
    Math.min(outerRadius - 12, outerRadius * (payload.innerRadius / 100)),
  );
  const centerX = outerRadius;
  const centerY = outerRadius;
  const chartAreaSection = createChartSectionFrame(
    "Doughnut chart area",
    layout.contentWidth,
    layout.doughnut.areaHeight,
  );
  const doughnutFrame = withConstraints(
    createTransparentFrame(
      "Doughnut chart area",
      doughnut.chartX,
      doughnut.chartY,
      diameter,
      diameter,
    ),
    "MIN",
    "MIN",
  );
  doughnutFrame.constrainProportions = true;
  let angle = -Math.PI / 2;

  values.forEach((row, index) => {
    const nextAngle = angle + (row.value / total) * Math.PI * 2;
    if (payload.palette !== "pattern-fill") {
      const segmentPath = arcPath(
        centerX,
        centerY,
        outerRadius,
        innerRadius,
        angle,
        nextAngle,
      );
      doughnutFrame.appendChild(
        withConstraints(
          createFilledVectorPath(
            `Doughnut Segment ${index + 1} · ${row.label}`,
            segmentPath,
            colors[index % colors.length],
            payload.segmentBorders ? COLORS.background : undefined,
            payload.segmentBorders ? 2 : 0,
          ),
          "MIN",
          "MIN",
        ),
      );
    }
    angle = nextAngle;
  });

  if (payload.palette === "pattern-fill") {
    const svgNode = figma.createNodeFromSvg(
      createPatternedDoughnutSvg({
        size: diameter,
        innerRadiusRatio: innerRadius / outerRadius,
        segments: values.map((row) => ({ label: row.label, value: row.value })),
        segmentBorders: payload.segmentBorders,
        defPrefix: `doughnut-output-${Date.now()}`,
      }),
    );
    svgNode.name = "Doughnut Pattern SVG";
    svgNode.x = 0;
    svgNode.y = 0;
    doughnutFrame.appendChild(withConstraints(svgNode, "MIN", "MIN"));
  }

  const centerHole = withConstraints(
    createEllipse(
      "Doughnut Center Hole",
      centerX - innerRadius,
      centerY - innerRadius,
      innerRadius * 2,
      innerRadius * 2,
      COLORS.background,
    ),
    "CENTER",
    "CENTER",
  );
  centerHole.constrainProportions = true;
  doughnutFrame.appendChild(centerHole);

  chartAreaSection.appendChild(doughnutFrame);

  if (payload.showValues) {
    const labelsSection = createTransparentFrame(
      "Labels",
      0,
      0,
      layout.contentWidth,
      layout.doughnut.areaHeight,
    );
    drawDoughnutLabels(
      labelsSection,
      payload,
      values,
      total,
      colors,
      doughnut.chartX,
      doughnut.chartY,
      outerRadius,
      innerRadius,
      layout.contentWidth,
      layout.doughnut.areaHeight,
    );
    chartAreaSection.appendChild(labelsSection);
  }

  contentFrame.appendChild(chartAreaSection);

  if (payload.showLegend) {
    const legendSection = createChartSectionFrame(
      "Chart Legend",
      layout.contentWidth,
      layout.doughnut.legendHeight || 24,
    );
    drawDoughnutLegend(legendSection, payload, values, total, colors, layout);
    contentFrame.appendChild(legendSection);
  }

  finalizeChartFrame(frame, layout);
  return frame;
}

function drawGridAndAxes(
  frame: FrameNode,
  payload: ChartPayload,
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  plotHeight: number,
  niceMax: number,
) {
  const steps = 4;
  for (let index = 0; index <= steps; index += 1) {
    const value = (niceMax / steps) * index;
    const y = padding.top + plotHeight - (plotHeight * index) / steps;
    if (payload.showGrid && index > 0) {
      frame.appendChild(
        withConstraints(
          createLinePath(
            `Gridline ${index}`,
            padding.left,
            y,
            padding.left + plotWidth,
            y,
            COLORS.grid,
            1,
          ),
          "SCALE",
          "SCALE",
        ),
      );
    }
  }

  frame.appendChild(
    withConstraints(
      createLinePath(
        "X axis",
        padding.left,
        padding.top + plotHeight,
        padding.left + plotWidth,
        padding.top + plotHeight,
        COLORS.axis,
        1,
      ),
      "SCALE",
      "SCALE",
    ),
  );
  if (payload.showYAxisLine) {
    frame.appendChild(
      withConstraints(
        createLinePath(
          "Y axis",
          padding.left,
          padding.top,
          padding.left,
          padding.top + plotHeight,
          COLORS.axis,
          1,
        ),
        "SCALE",
        "SCALE",
      ),
    );
  }
}

function drawBars(
  frame: FrameNode,
  payload: ChartPayload,
  rows: { label: string; values: number[] }[],
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  plotHeight: number,
  niceMax: number,
  seriesCount: number,
) {
  const colors = PALETTES[payload.palette].map(hexToRgb);
  const groupGapRatio =
    payload.barSpacing === "compact"
      ? 0.12
      : payload.barSpacing === "wide"
        ? 0.34
        : 0.22;
  const groupWidth = plotWidth / rows.length;
  const usableGroupWidth = groupWidth * (1 - groupGapRatio);

  rows.forEach((row, rowIndex) => {
    const groupX =
      padding.left +
      rowIndex * groupWidth +
      (groupWidth - usableGroupWidth) / 2;

    if (payload.barLayout === "stacked" && seriesCount > 1) {
      let stackedHeight = 0;
      row.values.forEach((value, seriesIndex) => {
        const barHeight = Math.max(1, (value / niceMax) * plotHeight);
        const bar = withConstraints(
          createRectangle(
            `${row.label} · ${getSeriesName(payload.seriesNames, seriesIndex)}`,
            groupX,
            padding.top + plotHeight - stackedHeight - barHeight,
            usableGroupWidth,
            barHeight,
            colors[seriesIndex % colors.length],
            payload.barRadius,
          ),
          "SCALE",
          "SCALE",
        );
        frame.appendChild(bar);
        stackedHeight += barHeight;
      });
    } else {
      const barGap = seriesCount > 1 ? 4 : 0;
      const barWidth =
        (usableGroupWidth - barGap * (seriesCount - 1)) / seriesCount;
      row.values.forEach((value, seriesIndex) => {
        const barHeight = Math.max(1, (value / niceMax) * plotHeight);
        const x = groupX + seriesIndex * (barWidth + barGap);
        const y = padding.top + plotHeight - barHeight;
        const seriesLabel = getSeriesName(payload.seriesNames, seriesIndex);
        frame.appendChild(
          withConstraints(
            createRectangle(
              `${row.label} · ${seriesLabel}`,
              x,
              y,
              barWidth,
              barHeight,
              colors[seriesIndex % colors.length],
              payload.barRadius,
            ),
            "SCALE",
            "SCALE",
          ),
        );
        if (payload.showValues) {
          frame.appendChild(
            withConstraints(
              createText(
                formatChartValue(value, getValueFormatterConfig(payload)),
                10,
                FONT_MEDIUM,
                COLORS.mutedText,
                x - 8,
                Math.max(0, y - 18),
                barWidth + 16,
                14,
                "CENTER",
              ),
              "SCALE",
              "SCALE",
            ),
          );
        }
      });
    }

    if (payload.showAxisLabels) {
      frame.appendChild(
        withConstraints(
          createText(
            row.label,
            11,
            FONT_REGULAR,
            COLORS.mutedText,
            padding.left + rowIndex * groupWidth,
            padding.top + plotHeight + 10,
            groupWidth,
            18,
            "CENTER",
          ),
          "SCALE",
          "SCALE",
        ),
      );
    }
  });
}

function drawXAxisTicks(
  frame: FrameNode,
  payload: ChartPayload,
  rows: { label: string; values: number[] }[],
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  plotHeight: number,
) {
  if (payload.type !== "line" || !payload.showAxisTicks) return;
  const denominator = Math.max(rows.length - 1, 1);
  rows.forEach((_row, rowIndex) => {
    const x = padding.left + (plotWidth * rowIndex) / denominator;
    frame.appendChild(
      withConstraints(
        createLinePath(
          `X tick ${rowIndex + 1}`,
          x,
          padding.top + plotHeight,
          x,
          padding.top + plotHeight + 6,
          COLORS.axis,
          1,
        ),
        "SCALE",
        "SCALE",
      ),
    );
  });
}

function drawYAxisTickLabels(
  frame: FrameNode,
  payload: ChartPayload,
  padding: { top: number; left: number; bottom: number; right: number },
  plotHeight: number,
  niceMax: number,
) {
  if (!payload.showAxisLabels) return;
  const steps = 4;
  const labelColumn = withConstraints(
    createAutoLayoutFrame(
      "Y axis tick labels",
      0,
      padding.top,
      "VERTICAL",
      0,
      "AUTO",
      "AUTO",
    ),
    "MIN",
    "MIN",
  );
  labelColumn.primaryAxisAlignItems = "SPACE_BETWEEN";
  labelColumn.counterAxisAlignItems = "MAX";

  for (let index = steps; index >= 0; index -= 1) {
    const value = (niceMax / steps) * index;
    const axisLabelValue =
      payload.type === "line"
        ? formatAxisTickCompact(value, payload)
        : formatChartValue(value, getValueFormatterConfig(payload));
    const tickLabel = createAutoLayoutFrame(
      `Y tick label ${steps - index + 1}`,
      0,
      0,
      "HORIZONTAL",
      0,
      "AUTO",
      "AUTO",
    );
    tickLabel.counterAxisAlignItems = "CENTER";
    tickLabel.primaryAxisAlignItems = "MIN";
    const tickText = createText(
      axisLabelValue,
      11,
      FONT_REGULAR,
      COLORS.mutedText,
      0,
      0,
      1,
      20,
      "RIGHT",
    );
    (
      tickText as TextNode & { textAutoResize?: "WIDTH_AND_HEIGHT" }
    ).textAutoResize = "WIDTH_AND_HEIGHT";
    tickText.textAlignHorizontal = "RIGHT";
    tickLabel.appendChild(tickText);
    labelColumn.appendChild(tickLabel);
  }

  const labelColumnWidth = (labelColumn as FrameNode & { width: number }).width;
  if (labelColumn.resize) labelColumn.resize(labelColumnWidth, plotHeight);
  labelColumn.x = Math.max(
    0,
    padding.left - labelColumnWidth - LABEL_TO_CHART_GAP,
  );
  frame.appendChild(labelColumn);
  return labelColumn;
}

function drawXAxisCategoryLabels(
  frame: FrameNode,
  payload: ChartPayload,
  rows: { label: string; values: number[] }[],
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  plotHeight: number,
) {
  if (!payload.showAxisLabels) return;
  const xAxisTickLabels = withConstraints(
    createAutoLayoutFrame(
      "X axis tick labels",
      padding.left,
      padding.top + plotHeight + LABEL_TO_CHART_GAP,
      "HORIZONTAL",
      0,
      "AUTO",
      "AUTO",
    ),
    "MIN",
    "MIN",
  );
  xAxisTickLabels.counterAxisAlignItems = "MIN";
  xAxisTickLabels.primaryAxisAlignItems = "SPACE_BETWEEN";
  if (xAxisTickLabels.resize) xAxisTickLabels.resize(plotWidth, 1);
  const denominator = Math.max(rows.length - 1, 1);
  rows.forEach((row, rowIndex) => {
    const tickLabel = createAutoLayoutFrame(
      `X tick label ${rowIndex + 1}`,
      0,
      0,
      "HORIZONTAL",
      0,
      "AUTO",
      "AUTO",
    );
    tickLabel.counterAxisAlignItems = "CENTER";
    tickLabel.primaryAxisAlignItems = "CENTER";
    const tickText = createText(
      row.label,
      11,
      FONT_REGULAR,
      COLORS.mutedText,
      0,
      0,
      1,
      18,
      "CENTER",
    );
    (
      tickText as TextNode & { textAutoResize?: "WIDTH_AND_HEIGHT" }
    ).textAutoResize = "WIDTH_AND_HEIGHT";
    tickText.textAlignHorizontal = "CENTER";
    tickLabel.appendChild(tickText);
    xAxisTickLabels.appendChild(tickLabel);
    if (rowIndex === 0 || rowIndex === rows.length - 1) {
      setAbsoluteIfAllowed(tickLabel);
      const centerX = (plotWidth * rowIndex) / denominator;
      tickLabel.x = Math.max(
        0,
        Math.min(
          plotWidth - (tickLabel as FrameNode & { width: number }).width,
          centerX - (tickLabel as FrameNode & { width: number }).width / 2,
        ),
      );
      tickLabel.y = 0;
    } else {
      (tickLabel as FrameNode & { layoutGrow: number }).layoutGrow = 1;
    }
  });
  frame.appendChild(xAxisTickLabels);
  return xAxisTickLabels;
}

function drawAxisLabels(
  frame: FrameNode,
  payload: ChartPayload,
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  plotHeight: number,
  layout: ChartLayout,
) {
  if (payload.xLabel) {
    const xLabelArea = withConstraints(
      createAutoLayoutFrame(
        "X axis label area",
        padding.left,
        padding.top + plotHeight + LABEL_TO_CHART_GAP,
        "HORIZONTAL",
        0,
        "AUTO",
        "AUTO",
      ),
      "CENTER",
      "MAX",
    );
    xLabelArea.primaryAxisAlignItems = "CENTER";
    xLabelArea.counterAxisAlignItems = "CENTER";
    const xLabel = withConstraints(
      createText(
        payload.xLabel,
        TEXT_STYLES.axisTitle.fontSize,
        TEXT_STYLES.axisTitle.font,
        COLORS.text,
        0,
        0,
        1,
        TEXT_STYLES.axisTitle.lineHeight,
        "CENTER",
      ),
      "MIN",
      "CENTER",
    );
    (
      xLabel as TextNode & { textAutoResize?: "WIDTH_AND_HEIGHT" }
    ).textAutoResize = "WIDTH_AND_HEIGHT";
    xLabel.name = "X axis label";
    xLabelArea.appendChild(xLabel);
    frame.appendChild(xLabelArea);
  }

  if (payload.yLabel) {
    const yAxisTitleHeight = TEXT_STYLES.axisTitle.lineHeight;
    const yLabelArea = withConstraints(
      createAutoLayoutFrame(
        "Y axis label area",
        0,
        0,
        "VERTICAL",
        0,
        "AUTO",
        "AUTO",
      ),
      "MIN",
      "CENTER",
    );
    yLabelArea.primaryAxisAlignItems = "CENTER";
    yLabelArea.counterAxisAlignItems = "CENTER";
    const yLabel = withConstraints(
      createText(
        payload.yLabel,
        TEXT_STYLES.axisTitle.fontSize,
        TEXT_STYLES.axisTitle.font,
        COLORS.text,
        0,
        0,
        1,
        yAxisTitleHeight,
        "CENTER",
      ),
      "CENTER",
      "CENTER",
    );
    (
      yLabel as TextNode & { textAutoResize?: "WIDTH_AND_HEIGHT" }
    ).textAutoResize = "WIDTH_AND_HEIGHT";
    yLabel.name = "Y axis label";
    yLabel.rotation = -90;
    yLabelArea.appendChild(yLabel);
    frame.appendChild(yLabelArea);
  }
}

function drawLegend(
  frame: FrameNode,
  payload: ChartPayload,
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  _height: number,
  layout: ChartLayout,
) {
  const colors = PALETTES[payload.palette].map(hexToRgb);
  const legendFrame = withConstraints(
    createTransparentFrame(
      "Chart legend",
      padding.left,
      0,
      plotWidth,
      layout.cartesian.legendHeight || 24,
    ),
    "STRETCH",
    "MAX",
  );
  const itemWidth = Math.min(118, plotWidth / payload.seriesNames.length);
  const totalItemsWidth = itemWidth * payload.seriesNames.length;
  const itemsFrame = withConstraints(
    createTransparentFrame(
      "Chart legend items",
      (plotWidth - totalItemsWidth) / 2,
      0,
      totalItemsWidth,
      24,
    ),
    "CENTER",
    "CENTER",
  );

  payload.seriesNames.forEach((name, index) => {
    const itemFrame = withConstraints(
      createTransparentFrame(
        `Legend item · ${name}`,
        index * itemWidth,
        0,
        itemWidth,
        20,
      ),
      "MIN",
      "CENTER",
    );
    const swatchY = 10;
    if (payload.type === "line") {
      const lineStyle = getLineStyle(
        payload,
        index,
        payload.seriesNames.length,
      );
      createLineLegendSwatch(
        itemFrame,
        name,
        swatchY,
        colors[index % colors.length],
        Math.max(1, getFiniteNumber(payload.lineWeight, 1)),
        lineStyle,
        payload.showPoints,
      );
    } else {
      itemFrame.appendChild(
        withConstraints(
          createRectangle(
            `Legend color · ${name}`,
            0,
            5,
            10,
            10,
            colors[index % colors.length],
            2,
          ),
          "MIN",
          "CENTER",
        ),
      );
    }
    if (payload.type === "line" && payload.showPoints) {
      itemFrame.appendChild(
        withConstraints(
          createEllipse(
            `Legend point · ${name}`,
            7 - (payload.lineWeight + 1),
            swatchY - (payload.lineWeight + 1),
            (payload.lineWeight + 1) * 2,
            (payload.lineWeight + 1) * 2,
            COLORS.background,
            colors[index % colors.length],
            payload.lineWeight,
          ),
          "MIN",
          "CENTER",
        ),
      );
    }
    itemFrame.appendChild(
      withConstraints(
        createText(
          name,
          11,
          FONT_REGULAR,
          COLORS.text,
          20,
          2,
          Math.max(24, itemWidth - 20),
          20,
          "LEFT",
        ),
        "STRETCH",
        "CENTER",
      ),
    );
    itemsFrame.appendChild(itemFrame);
  });
  legendFrame.appendChild(itemsFrame);
  frame.appendChild(legendFrame);
}

function appendLegendLineSwatch(
  itemFrame: FrameNode,
  seriesName: string,
  swatchY: number,
  color: RGB,
  lineWeight: number,
  lineStyle: {
    dashPattern?: number[];
    double?: boolean;
    strokeCap: "NONE" | "ROUND" | "SQUARE";
  },
  hasPointMarker: boolean,
) {
  const markerRadius = Math.max(1, lineWeight + 1);
  const markerGap = hasPointMarker ? markerRadius + 1 : 0;
  const lineStart = 0;
  const lineEnd = 14;
  const markerCenter = 7;
  const leftEnd = Math.max(lineStart, markerCenter - markerGap);
  const rightStart = Math.min(lineEnd, markerCenter + markerGap);
  const appendSegment = (
    name: string,
    y: number,
    fromX: number,
    toX: number,
  ) => {
    if (toX <= fromX) return;
    itemFrame.appendChild(
      withConstraints(
        createVectorPath(
          name,
          `M ${formatCoordinate(fromX)} ${formatCoordinate(y)} L ${formatCoordinate(toX)} ${formatCoordinate(y)}`,
          color,
          lineWeight,
          lineStyle,
        ),
        "MIN",
        "CENTER",
      ),
    );
  };

  if (lineStyle.double) {
    const offset = lineWeight / 2 + 0.5;
    appendSegment(
      `Legend line upper left · ${seriesName}`,
      swatchY - offset,
      lineStart,
      leftEnd,
    );
    appendSegment(
      `Legend line upper right · ${seriesName}`,
      swatchY - offset,
      rightStart,
      lineEnd,
    );
    appendSegment(
      `Legend line lower left · ${seriesName}`,
      swatchY + offset,
      lineStart,
      leftEnd,
    );
    appendSegment(
      `Legend line lower right · ${seriesName}`,
      swatchY + offset,
      rightStart,
      lineEnd,
    );
    return;
  }
  appendSegment(
    `Legend line left · ${seriesName}`,
    swatchY,
    lineStart,
    leftEnd,
  );
  appendSegment(
    `Legend line right · ${seriesName}`,
    swatchY,
    rightStart,
    lineEnd,
  );
}

function createLineLegendSwatch(
  itemFrame: FrameNode,
  seriesName: string,
  swatchY: number,
  color: RGB,
  lineWeight: number,
  lineStyle: {
    dashPattern?: number[];
    double?: boolean;
    strokeCap: "NONE" | "ROUND" | "SQUARE";
  },
  hasPointMarker: boolean,
) {
  appendLegendLineSwatch(
    itemFrame,
    seriesName,
    swatchY,
    color,
    lineWeight,
    lineStyle,
    hasPointMarker,
  );
}

function getYAxisTitleXPosition(
  yAxisTitleGutterX: number,
  yAxisTickLabelGutterX: number,
): number {
  const titleWidthAfterRotation = TEXT_STYLES.axisTitle.lineHeight;
  const titleRightEdge = yAxisTickLabelGutterX - Y_AXIS_TITLE_GAP;
  return Math.max(yAxisTitleGutterX, titleRightEdge - titleWidthAfterRotation);
}

function positionYAxisTitle({
  plotCenterY,
  yAxisTitleGutterX,
  yAxisTickLabelGutterX,
  yAxisTitleWidth,
  yAxisTitleHeight,
}: {
  plotCenterY: number;
  yAxisTitleGutterX: number;
  yAxisTickLabelGutterX: number;
  yAxisTitleWidth: number;
  yAxisTitleHeight: number;
}): { x: number; y: number } {
  const y = plotCenterY - yAxisTitleHeight / 2;
  return {
    x: getYAxisTitleXPosition(yAxisTitleGutterX, yAxisTickLabelGutterX),
    y,
  };
}

function formatAxisTickCompact(value: number, payload: ChartPayload): string {
  if (payload.numberFormat === "percent") {
    return formatChartValue(value, getValueFormatterConfig(payload));
  }
  const rounded = Math.round(value);
  if (Math.abs(rounded) < 1000) {
    return formatChartValue(rounded, getValueFormatterConfig(payload));
  }
  const thousandsValue = Math.round((rounded / 1000) * 10) / 10;
  const compact = Number.isInteger(thousandsValue)
    ? `${Math.trunc(thousandsValue)}`
    : `${thousandsValue}`;
  if (payload.numberFormat === "currency") return `£${compact}k`;
  return `${compact}k`;
}

function drawDoughnutLegend(
  frame: FrameNode,
  payload: ChartPayload,
  values: { label: string; value: number }[],
  total: number,
  colors: RGB[],
  layout: ChartLayout,
) {
  const rowHeight = 26;
  const columns = layout.doughnut.legendColumns;
  const columnGap = columns > 1 ? 20 : 0;
  const rowWidth = Math.max(
    132,
    (layout.doughnut.legendWidth - columnGap * (columns - 1)) / columns,
  );
  const legendFrame = withConstraints(
    createTransparentFrame(
      "Chart legend",
      Math.max(GRID, (layout.contentWidth - layout.doughnut.legendWidth) / 2),
      0,
      layout.doughnut.legendWidth,
      layout.doughnut.legendHeight,
    ),
    "MIN",
    "MIN",
  );

  values.forEach((row, index) => {
    const column = columns > 1 ? index % columns : 0;
    const legendRow = Math.floor(index / columns);
    const itemFrame = withConstraints(
      createTransparentFrame(
        `Legend item · ${row.label}`,
        column * (rowWidth + columnGap),
        legendRow * rowHeight,
        rowWidth,
        20,
      ),
      "MIN",
      "MIN",
    );
    itemFrame.appendChild(
      withConstraints(
        createRectangle(
          `Legend color · ${row.label}`,
          0,
          4,
          12,
          12,
          colors[index % colors.length],
          3,
        ),
        "MIN",
        "CENTER",
      ),
    );
    if (payload.palette === "pattern-fill") {
      const legendSvgNode = figma.createNodeFromSvg(
        createPatternLegendSwatchSvg(index, 12),
      );
      legendSvgNode.name = `Legend pattern · ${row.label}`;
      legendSvgNode.x = 0;
      legendSvgNode.y = 4;
      itemFrame.appendChild(withConstraints(legendSvgNode, "MIN", "CENTER"));
    }
    const valueLabel = payload.showPercent
      ? formatPercent((row.value / total) * 100)
      : formatChartValue(row.value, getValueFormatterConfig(payload));
    itemFrame.appendChild(
      withConstraints(
        createText(
          row.label,
          11,
          FONT_REGULAR,
          COLORS.text,
          18,
          0,
          Math.max(28, rowWidth - 86),
          20,
          "LEFT",
        ),
        "MIN",
        "CENTER",
      ),
    );
    itemFrame.appendChild(
      withConstraints(
        createText(
          valueLabel,
          11,
          FONT_MEDIUM,
          COLORS.mutedText,
          rowWidth - 64,
          0,
          64,
          20,
          "RIGHT",
        ),
        "MAX",
        "CENTER",
      ),
    );
    legendFrame.appendChild(itemFrame);
  });
  frame.appendChild(legendFrame);
}

function drawDoughnutLabels(
  frame: FrameNode,
  payload: ChartPayload,
  values: { label: string; value: number }[],
  total: number,
  colors: RGB[],
  chartX: number,
  chartY: number,
  outerRadius: number,
  innerRadius: number,
  contentWidth: number,
  contentHeight: number,
) {
  const centerX = chartX + outerRadius;
  const centerY = chartY + outerRadius;
  const lineColor = payload.palette === "standard" ? null : COLORS.axis;
  const items: {
    row: { label: string; value: number };
    pct: number;
    mid: number;
    side: "left" | "right";
    anchorX: number;
    anchorY: number;
    elbowX: number;
    targetY: number;
  }[] = [];

  let angle = -Math.PI / 2;
  values.forEach((row) => {
    const nextAngle = angle + (row.value / total) * Math.PI * 2;
    const mid = (angle + nextAngle) / 2;
    const side: "left" | "right" = Math.cos(mid) >= 0 ? "right" : "left";
    const anchorX =
      centerX +
      Math.cos(mid) * (innerRadius + (outerRadius - innerRadius) * 0.65);
    const anchorY =
      centerY +
      Math.sin(mid) * (innerRadius + (outerRadius - innerRadius) * 0.65);
    const elbowX = centerX + Math.cos(mid) * (outerRadius + 12);
    const targetY = centerY + Math.sin(mid) * (outerRadius + 22);
    items.push({
      row,
      pct: (row.value / total) * 100,
      mid,
      side,
      anchorX,
      anchorY,
      elbowX,
      targetY,
    });
    angle = nextAngle;
  });

  const applyVerticalSpacing = (
    side: "left" | "right",
    minY: number,
    maxY: number,
    gap: number,
  ) => {
    const sideItems = items
      .filter((item) => item.side === side)
      .sort((a, b) => a.targetY - b.targetY);
    let cursor = minY;
    sideItems.forEach((item) => {
      item.targetY = Math.max(item.targetY, cursor);
      cursor = item.targetY + gap;
    });
    cursor = maxY;
    for (let index = sideItems.length - 1; index >= 0; index -= 1) {
      const item = sideItems[index];
      item.targetY = Math.min(item.targetY, cursor);
      cursor = item.targetY - gap;
    }
  };

  applyVerticalSpacing("left", 18, contentHeight - 28, 24);
  applyVerticalSpacing("right", 18, contentHeight - 28, 24);

  items.forEach((item, index) => {
    const labelWidth = Math.max(
      110,
      Math.min(168, item.row.label.length * 6 + 44),
    );
    const labelX =
      item.side === "right"
        ? Math.min(contentWidth - labelWidth - 6, item.elbowX + 10)
        : Math.max(6, item.elbowX - labelWidth - 10);
    const valueText = payload.showPercent
      ? formatPercent(item.pct)
      : formatChartValue(item.row.value, getValueFormatterConfig(payload));

    frame.appendChild(
      withConstraints(
        createLinePath(
          `Doughnut callout radial ${index + 1} · ${item.row.label}`,
          item.anchorX,
          item.anchorY,
          item.elbowX,
          item.targetY,
          lineColor ?? colors[index % colors.length],
          1.25,
        ),
        "MIN",
        "MIN",
      ),
    );
    const horizontalEndX =
      item.side === "right" ? labelX - 3 : labelX + labelWidth + 3;
    frame.appendChild(
      withConstraints(
        createLinePath(
          `Doughnut callout horizontal ${index + 1} · ${item.row.label}`,
          item.elbowX,
          item.targetY,
          horizontalEndX,
          item.targetY,
          lineColor ?? colors[index % colors.length],
          1.25,
        ),
        "MIN",
        "MIN",
      ),
    );
    frame.appendChild(
      withConstraints(
        createText(
          item.row.label,
          11,
          FONT_REGULAR,
          COLORS.text,
          labelX,
          item.targetY - 12,
          labelWidth,
          14,
          item.side === "right" ? "LEFT" : "RIGHT",
        ),
        "MIN",
        "MIN",
      ),
    );
    frame.appendChild(
      withConstraints(
        createText(
          valueText,
          11,
          FONT_REGULAR,
          COLORS.text,
          labelX,
          item.targetY + 2,
          labelWidth,
          14,
          item.side === "right" ? "LEFT" : "RIGHT",
        ),
        "MIN",
        "MIN",
      ),
    );
  });
}

function setConstraints(
  node: SceneNode,
  horizontal: ConstraintValue,
  vertical: ConstraintValue,
): void {
  node.constraints = { horizontal, vertical };
}

function withConstraints<T extends SceneNode>(
  node: T,
  horizontal: ConstraintValue,
  vertical: ConstraintValue,
): T {
  setConstraints(node, horizontal, vertical);
  return node;
}

function createTransparentFrame(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.x = x;
  frame.y = y;
  if (frame.resize) frame.resize(width, height);
  frame.fills = [];
  frame.clipsContent = false;
  return frame;
}

function createAutoLayoutFrame(
  name: string,
  x: number,
  y: number,
  layoutMode: "HORIZONTAL" | "VERTICAL",
  itemSpacing: number,
  primaryAxisSizingMode: "FIXED" | "AUTO",
  counterAxisSizingMode: "FIXED" | "AUTO",
): FrameNode {
  const frame = createTransparentFrame(name, x, y, 1, 1);
  frame.layoutMode = layoutMode;
  frame.itemSpacing = itemSpacing;
  frame.primaryAxisSizingMode = primaryAxisSizingMode;
  frame.counterAxisSizingMode = counterAxisSizingMode;
  return frame;
}

function setAbsoluteIfAllowed(node: SceneNode): void {
  const parent = (node as SceneNode & { parent: SceneNode | null }).parent;
  if (parent && "layoutMode" in parent && parent.layoutMode !== "NONE") {
    (
      node as SceneNode & { layoutPositioning: "AUTO" | "ABSOLUTE" }
    ).layoutPositioning = "ABSOLUTE";
  }
}

function createRectangle(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGB,
  cornerRadius: number,
): RectangleNode {
  const rectangle = figma.createRectangle();
  rectangle.name = name;
  rectangle.x = x;
  rectangle.y = y;
  if (rectangle.resize) rectangle.resize(width, height);
  rectangle.fills = [solid(color)];
  rectangle.cornerRadius = cornerRadius;
  return rectangle;
}

function createEllipse(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGB,
  strokeColor?: RGB,
  strokeWeight = 0,
): EllipseNode {
  const ellipse = figma.createEllipse();
  ellipse.name = name;
  ellipse.x = x;
  ellipse.y = y;
  if (ellipse.resize) ellipse.resize(width, height);
  ellipse.fills = [solid(color)];
  ellipse.strokes = strokeColor ? [solid(strokeColor)] : [];
  ellipse.strokeWeight = strokeWeight;
  return ellipse;
}

function createLinePointMarker(
  name: string,
  centerX: number,
  centerY: number,
  color: RGB,
): FrameNode {
  const marker = withConstraints(
    createTransparentFrame(name, centerX - 4, centerY - 4, 8, 8),
    "SCALE",
    "SCALE",
  );
  const dot = withConstraints(
    createEllipse(`${name} circle`, 0, 0, 8, 8, COLORS.background, color, 1.5),
    "CENTER",
    "CENTER",
  );
  dot.constrainProportions = true;
  marker.appendChild(dot);
  return marker;
}

function createText(
  characters: string,
  fontSize: number,
  fontName: FontName,
  color: RGB,
  x: number,
  y: number,
  width: number,
  height: number,
  align: TextNode["textAlignHorizontal"],
  lineHeight = height,
): TextNode {
  const text = figma.createText();
  text.name = characters;
  text.x = x;
  text.y = y;
  if (text.resize) text.resize(width, height);
  text.fontName = fontName;
  text.fontSize = fontSize;
  text.lineHeight = { unit: "PIXELS", value: lineHeight };
  text.characters = characters;
  text.fills = [solid(color)];
  text.textAlignHorizontal = align;
  text.textAlignVertical = "CENTER";
  (text as TextNode & { textAutoResize?: "WIDTH_AND_HEIGHT" }).textAutoResize =
    "WIDTH_AND_HEIGHT";
  return text;
}

function getChartTitleStyleName(size?: ChartOutputSize): string {
  const resolved = resolveChartSize(size);
  if (
    resolved.preset === "mobile-4" ||
    (resolved.preset === "custom" && resolved.width <= MOBILE_CUSTOM_WIDTH_MAX)
  ) {
    return AXLE_TITLE_STYLES.mobile;
  }
  return AXLE_TITLE_STYLES.desktopTablet;
}

async function applyChartTitleTextStyle(
  titleNode: TextNode,
  size?: ChartOutputSize,
): Promise<void> {
  const isMobileTitle =
    getChartTitleStyleName(size) === AXLE_TITLE_STYLES.mobile;
  const targetStyleName = isMobileTitle
    ? AXLE_TITLE_STYLES.mobile
    : AXLE_TITLE_STYLES.desktopTablet;
  const fallbackTypography = isMobileTitle
    ? { fontSize: 16, lineHeight: 20 }
    : { fontSize: 32, lineHeight: 40 };
  const applyFallbackTypography = async () => {
    try {
      await figma.loadFontAsync(FONT_AXLE_FALLBACK);
      titleNode.fontName = FONT_AXLE_FALLBACK;
    } catch (error) {
      globalThis.console?.warn(
        "Unable to load fallback font Forever Forma Heading. Falling back to Forever Forma Regular.",
        error,
      );
      titleNode.fontName = FONT_REGULAR;
    }
    titleNode.fontSize = fallbackTypography.fontSize;
    titleNode.lineHeight = {
      unit: "PIXELS",
      value: fallbackTypography.lineHeight,
    };
  };

  const styles = (await figma.getLocalTextStylesAsync?.()) ?? [];
  const styleNames = styles.map((style) => style.name);
  const exact = styles.find((style) => style.name === targetStyleName);
  const fallbackPatterns =
    targetStyleName === AXLE_TITLE_STYLES.mobile
      ? ["Light/heading/xs", "heading/xs"]
      : ["Light/heading/lg", "heading/lg"];
  const fallback = styles.find((style) =>
    fallbackPatterns.some((pattern) => style.name.includes(pattern)),
  );
  const style = exact ?? fallback;

  if (!style) {
    globalThis.console?.warn(AXLE_STYLE_FALLBACK_WARNING);
    globalThis.console?.warn(
      "Available local text styles:",
      styleNames.length > 0 ? styleNames : "(none)",
    );
    await applyFallbackTypography();
    return;
  }

  globalThis.console?.log(
    `Chart title text style applied: ${style.name} (target: ${targetStyleName})`,
  );

  if (titleNode.setTextStyleIdAsync) {
    await titleNode.setTextStyleIdAsync(style.id);
    return;
  }

  titleNode.textStyleId = style.id;
}

function createLine(
  name: string,
  x: number,
  y: number,
  length: number,
  color: RGB,
  strokeWeight: number,
): LineNode {
  const line = figma.createLine();
  line.name = name;
  line.x = x;
  line.y = y;
  if (line.resize) line.resize(length, 0);
  line.strokes = [solid(color)];
  line.strokeWeight = strokeWeight;
  return line;
}

function createLinePath(
  name: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RGB,
  strokeWeight: number,
): VectorNode {
  return createVectorPath(
    name,
    `M ${formatCoordinate(x1)} ${formatCoordinate(y1)} L ${formatCoordinate(x2)} ${formatCoordinate(y2)}`,
    color,
    strokeWeight,
  );
}

function createVectorPath(
  name: string,
  data: string,
  color: RGB,
  strokeWeight: number,
  lineStyle = LINE_STYLES.default,
): VectorNode {
  const safeData = validateVectorPathData(data);
  const vector = figma.createVector();
  vector.name = name;
  vector.x = 0;
  vector.y = 0;
  vector.fills = [];
  vector.strokes = [solid(color)];
  vector.strokeWeight = strokeWeight;
  vector.strokeCap = lineStyle.strokeCap;
  if (lineStyle.dashPattern) vector.dashPattern = lineStyle.dashPattern;
  vector.vectorPaths = [{ windingRule: "NONZERO", data: safeData }];
  return vector;
}

function createFilledVectorPath(
  name: string,
  data: string,
  fillColor: RGB,
  strokeColor?: RGB,
  strokeWeight = 0,
): VectorNode {
  const safeData = validateVectorPathData(data);
  const vector = figma.createVector();
  vector.name = name;
  vector.x = 0;
  vector.y = 0;
  vector.fills = [solid(fillColor)];
  vector.strokes = strokeColor ? [solid(strokeColor)] : [];
  vector.strokeWeight = strokeWeight;
  vector.vectorPaths = [{ windingRule: "EVENODD", data: safeData }];
  return vector;
}

function straightPath(points: ChartPoint[]) {
  if (!points.length) return "";
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`,
    )
    .join(" ");
}

function smoothPath(points: ChartPoint[]) {
  if (!points.length) return "";
  let d = `M ${formatCoordinate(points[0].x)} ${formatCoordinate(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    d += ` C ${formatCoordinate(controlX)} ${formatCoordinate(current.y)} ${formatCoordinate(controlX)} ${formatCoordinate(next.y)} ${formatCoordinate(next.x)} ${formatCoordinate(next.y)}`;
  }
  return d;
}

function sanitizeChartPoint(point: ChartPoint): ChartPoint {
  return {
    label: point.label,
    x: assertFiniteCoordinate(point.x, "line chart x coordinate"),
    y: assertFiniteCoordinate(point.y, "line chart y coordinate"),
    value: getFiniteNumber(point.value, 0),
  };
}

function getFiniteNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function assertFiniteCoordinate(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${label}. Check the chart data and try again.`);
  }
  return value;
}

function formatCoordinate(value: number): string {
  assertFiniteCoordinate(value, "vector path coordinate");
  return Number(value.toFixed(2)).toString();
}

function validateVectorPathData(data: string): string {
  if (!data.trim()) {
    throw new Error(
      "Vector path is empty. Check the chart data and try again.",
    );
  }
  if (/\b(?:NaN|Infinity|null|undefined)\b/.test(data)) {
    throw new Error(
      "Vector path contains an invalid coordinate. Check the chart data and try again.",
    );
  }
  if (/\bA\b/i.test(data)) {
    throw new Error("Vector path uses an unsupported arc command.");
  }
  return data;
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  ir: number,
  start: number,
  end: number,
) {
  const fullCircle = end - start >= Math.PI * 2 - 0.0001;
  const adjustedEnd = fullCircle ? end - 0.0001 : end;
  const outerStart = polarPoint(cx, cy, r, start);
  const innerEnd = polarPoint(cx, cy, ir, adjustedEnd);

  return [
    `M ${formatCoordinate(outerStart.x)} ${formatCoordinate(outerStart.y)}`,
    cubicArcPath(cx, cy, r, start, adjustedEnd),
    `L ${formatCoordinate(innerEnd.x)} ${formatCoordinate(innerEnd.y)}`,
    cubicArcPath(cx, cy, ir, adjustedEnd, start),
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}

function cubicArcPath(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
): string {
  const totalDelta = end - start;
  const segmentCount = Math.max(
    1,
    Math.ceil(Math.abs(totalDelta) / (Math.PI / 2)),
  );
  const delta = totalDelta / segmentCount;
  const commands: string[] = [];

  for (let index = 0; index < segmentCount; index += 1) {
    const a1 = start + delta * index;
    const a2 = a1 + delta;
    const p0 = polarPoint(cx, cy, radius, a1);
    const p3 = polarPoint(cx, cy, radius, a2);
    const k = (4 / 3) * Math.tan((a2 - a1) / 4);
    const c1 = {
      x: p0.x - k * radius * Math.sin(a1),
      y: p0.y + k * radius * Math.cos(a1),
    };
    const c2 = {
      x: p3.x + k * radius * Math.sin(a2),
      y: p3.y - k * radius * Math.cos(a2),
    };
    commands.push(
      `C ${formatCoordinate(c1.x)} ${formatCoordinate(c1.y)} ${formatCoordinate(c2.x)} ${formatCoordinate(c2.y)} ${formatCoordinate(p3.x)} ${formatCoordinate(p3.y)}`,
    );
  }

  return commands.join(" ");
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function getLineStyle(
  payload: ChartPayload,
  seriesIndex: number,
  seriesCount: number,
) {
  const payloadLineStyles = payload.lineStyles ?? [];
  const styleNames = Object.keys(LINE_STYLES) as LineStyleName[];
  const styleName =
    seriesCount > 1
      ? payloadLineStyles[seriesIndex] ||
        styleNames[seriesIndex % styleNames.length]
      : payloadLineStyles[0] || "default";
  return LINE_STYLES[styleName] ?? LINE_STYLES.default;
}

function offsetPath(data: string, yOffset: number): string {
  const tokens = data.match(/[A-Z]|-?\d+(?:\.\d+)?/g);
  if (!tokens) return data;
  const output: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    const command = tokens[index];
    output.push(command);
    index += 1;

    const coordinateCount =
      command === "C" ? 6 : command === "M" || command === "L" ? 2 : 0;
    for (
      let coordinateIndex = 0;
      coordinateIndex < coordinateCount;
      coordinateIndex += 1
    ) {
      const value = Number(tokens[index]);
      output.push(
        formatCoordinate(coordinateIndex % 2 === 1 ? value + yOffset : value),
      );
      index += 1;
    }
  }

  return output.join(" ");
}

function getSeriesName(seriesNames: string[], index: number): string {
  return seriesNames[index] || `Series ${index + 1}`;
}

function getLargestValue(values: number[][]): number {
  let maxValue = 1;
  values.forEach((row) => {
    row.forEach((value) => {
      maxValue = Math.max(maxValue, Math.max(0, value));
    });
  });
  return maxValue;
}

function getMaxValue(
  values: number[][],
  layout: ChartPayload["barLayout"],
): number {
  if (layout === "stacked") {
    let maxValue = 1;
    values.forEach((row) => {
      const rowTotal = row.reduce((sum, value) => sum + Math.max(0, value), 0);
      maxValue = Math.max(maxValue, rowTotal);
    });
    return maxValue;
  }
  return getLargestValue(values);
}

function niceCeil(value: number): number {
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function getChartTypeLabel(type: ChartPayload["type"]): string {
  if (type === "line") return "line";
  if (type === "doughnut") return "doughnut";
  return "bar";
}

function solid(color: RGB, opacity?: number): Paint {
  return opacity === undefined
    ? { type: "SOLID", color }
    : { type: "SOLID", color, opacity };
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}
