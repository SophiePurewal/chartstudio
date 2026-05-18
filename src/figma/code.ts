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
};
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
  loadFontAsync: (fontName: FontName) => Promise<void>;
  notify: (message: string, options?: { error?: boolean }) => void;
  closePlugin: () => void;
};

declare const figma: FigmaPluginApi;
declare const __html__: string;

const FONT_REGULAR: FontName = { family: "Inter", style: "Regular" };
const FONT_MEDIUM: FontName = { family: "Inter", style: "Medium" };
const FONT_BOLD: FontName = { family: "Inter", style: "Bold" };

const PALETTES: Record<ChartPayload["palette"], string[]> = {
  finance: ["#635BFF", "#00A6D6", "#22A06B", "#F2A900", "#E15A46", "#A855F7"],
  neutral: ["#1F2937", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"],
  vibrant: ["#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#A855F7"],
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
  { label: string; width: number; height: number }
> = {
  "desktop-12": { label: "Desktop 12 column", width: 1064, height: 608 },
  "desktop-10": { label: "Desktop 10 column", width: 872, height: 496 },
  "desktop-8": { label: "Desktop 8 column", width: 680, height: 392 },
  "tablet-12": { label: "Tablet 12 column", width: 632, height: 360 },
  "mobile-4": { label: "Mobile 4 column", width: 351, height: 200 },
};
const DEFAULT_CHART_SIZE: ChartOutputSize = {
  preset: "desktop-8",
  width: CHART_SIZE_PRESETS["desktop-8"].width,
  height: CHART_SIZE_PRESETS["desktop-8"].height,
};
const MIN_CUSTOM_WIDTH = 320;
const MIN_CUSTOM_HEIGHT = 180;
const CHART_FRAME_PADDING = 8;
const GRID = 8;

type ChartLayout = {
  outerWidth: number;
  outerHeight: number;
  contentWidth: number;
  contentHeight: number;
  cartesian: {
    padding: { top: number; left: number; bottom: number; right: number };
    plotWidth: number;
    plotHeight: number;
    legendY: number;
    legendHeight: number;
  };
  doughnut: {
    chartX: number;
    chartY: number;
    squareSize: number;
    legendX: number;
    legendY: number;
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

    chart = createEditableChart(message.payload);
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

function createEditableChart(payload: ChartPayload): FrameNode {
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
    return { preset: size.preset, width: preset.width, height: preset.height };
  }
  return {
    preset: "custom",
    width: Math.round(Number(size.width)),
    height: Math.round(Number(size.height)),
  };
}

function validateChartSize(
  size?: ChartOutputSize,
): { valid: true } | { valid: false; message: string } {
  const resolved = resolveChartSize(size);
  if (!Number.isFinite(resolved.width) || !Number.isFinite(resolved.height)) {
    return { valid: false, message: "Enter a valid chart width and height." };
  }
  if (resolved.width < MIN_CUSTOM_WIDTH) {
    return {
      valid: false,
      message: `Chart width must be at least ${MIN_CUSTOM_WIDTH}px.`,
    };
  }
  if (resolved.height < MIN_CUSTOM_HEIGHT) {
    return {
      valid: false,
      message: `Chart height must be at least ${MIN_CUSTOM_HEIGHT}px.`,
    };
  }
  return { valid: true };
}

function createChartLayout(payload: ChartPayload): ChartLayout {
  const size = resolveChartSize(payload.chartSize);
  const contentWidth = size.width - CHART_FRAME_PADDING * 2;
  const contentHeight = size.height - CHART_FRAME_PADDING * 2;
  const compact = size.width <= 420 || size.height <= 240;
  const hasLegend = payload.showLegend;
  const cartesianPadding = {
    top: payload.title ? (compact ? 56 : 72) : compact ? 24 : 36,
    right: compact ? 16 : 36,
    bottom:
      (payload.showAxisLabels ? 26 : 10) +
      (payload.xLabel ? 32 : 8) +
      (hasLegend ? 36 : 8),
    left: payload.yLabel
      ? compact
        ? 72
        : 86
      : payload.showAxisLabels
        ? 64
        : 40,
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
  const cartesianLegendY = Math.min(
    contentHeight - legendHeight - GRID,
    cartesianPadding.top + plotHeight + (payload.xLabel ? 62 : 38),
  );

  const doughnutTop = payload.title ? (compact ? 56 : 72) : compact ? 16 : 32;
  const rightLegendAllowed =
    payload.legendPos === "right" && size.width >= 560 && size.height >= 300;
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
      (rightLegendAllowed ? 0 : doughnutLegendHeight + doughnutGap),
  );
  const availableDoughnutWidth = Math.max(
    GRID * 10,
    contentWidth - (rightLegendAllowed ? doughnutLegendWidth + doughnutGap : 0),
  );
  const squareSize = Math.max(
    GRID * 10,
    Math.min(availableDoughnutWidth, availableDoughnutHeight),
  );
  const combinedWidth = rightLegendAllowed
    ? squareSize + doughnutGap + doughnutLegendWidth
    : squareSize;
  const chartX = Math.max(GRID, (contentWidth - combinedWidth) / 2);
  const chartY = doughnutTop;
  const legendX = rightLegendAllowed
    ? chartX + squareSize + doughnutGap
    : Math.max(GRID, (contentWidth - doughnutLegendWidth) / 2);
  const legendY = rightLegendAllowed
    ? chartY + Math.max(0, (squareSize - doughnutLegendHeight) / 2)
    : Math.min(
        contentHeight - doughnutLegendHeight - GRID,
        chartY + squareSize + doughnutGap,
      );

  return {
    outerWidth: size.width,
    outerHeight: size.height,
    contentWidth,
    contentHeight,
    cartesian: {
      padding: cartesianPadding,
      plotWidth,
      plotHeight,
      legendY: cartesianLegendY,
      legendHeight,
    },
    doughnut: {
      chartX,
      chartY,
      squareSize,
      legendX,
      legendY,
      legendWidth: doughnutLegendWidth,
      legendHeight: doughnutLegendHeight,
      legendColumns: rightLegendAllowed ? 1 : 2,
    },
  };
}

function createBaseFrame(
  payload: ChartPayload,
  fallbackName: string,
  layout: ChartLayout,
): { frame: FrameNode; contentFrame: FrameNode } {
  const frame = figma.createFrame();
  frame.name = payload.title || fallbackName;
  if (frame.resize) frame.resize(layout.outerWidth, layout.outerHeight);
  frame.x = figma.viewport.center.x - layout.outerWidth / 2;
  frame.y = figma.viewport.center.y - layout.outerHeight / 2;
  frame.fills = [solid(COLORS.background)];
  frame.clipsContent = true;

  const contentFrame = figma.createFrame();
  contentFrame.name = "Chart content";
  contentFrame.x = CHART_FRAME_PADDING;
  contentFrame.y = CHART_FRAME_PADDING;
  if (contentFrame.resize) {
    contentFrame.resize(layout.contentWidth, layout.contentHeight);
  }
  contentFrame.fills = [];
  contentFrame.clipsContent = true;
  setConstraints(contentFrame, "MIN", "MIN");
  frame.appendChild(contentFrame);

  if (payload.title) {
    const title = createText(
      payload.title,
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
    title.name = "Chart Title";
    title.textAlignVertical = "TOP";
    setConstraints(title, "MIN", "MIN");
    contentFrame.appendChild(title);
  }

  return { frame, contentFrame };
}

function createEditableBarChart(payload: ChartPayload): FrameNode {
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

  const { frame, contentFrame } = createBaseFrame(
    payload,
    "ChartStudio Bar Chart",
    layout,
  );
  frame.name = payload.title
    ? `ChartStudio Bar Chart · ${payload.title}`
    : "ChartStudio Bar Chart";

  drawGridAndAxes(
    contentFrame,
    payload,
    padding,
    plotWidth,
    plotHeight,
    niceMax,
  );
  drawBars(
    contentFrame,
    payload,
    rows,
    padding,
    plotWidth,
    plotHeight,
    niceMax,
    seriesCount,
  );
  drawAxisLabels(contentFrame, payload, padding, plotWidth, plotHeight);

  if (payload.showLegend && seriesCount > 1) {
    drawLegend(contentFrame, payload, padding, plotWidth, height, layout);
  }

  return frame;
}

function createEditableLineChart(payload: ChartPayload): FrameNode {
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
  const { frame, contentFrame } = createBaseFrame(
    payload,
    "ChartStudio Line Chart",
    layout,
  );
  frame.name = payload.title
    ? `ChartStudio Line Chart · ${payload.title}`
    : "ChartStudio Line Chart";

  try {
    drawGridAndAxes(
      contentFrame,
      payload,
      padding,
      plotWidth,
      plotHeight,
      niceMax,
    );

    const denominator = Math.max(rows.length - 1, 1);
    for (let seriesIndex = 0; seriesIndex < seriesCount; seriesIndex += 1) {
      const seriesName = getSeriesName(payload.seriesNames, seriesIndex);
      const points = rows.map((row, rowIndex) => {
        const value = getFiniteNumber(row.values[seriesIndex], 0);
        const x = padding.left + (plotWidth * rowIndex) / denominator;
        const y =
          padding.top +
          plotHeight -
          (Math.max(0, value) / niceMax) * plotHeight;
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
        contentFrame.appendChild(
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
        contentFrame.appendChild(
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
        contentFrame.appendChild(
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
          contentFrame.appendChild(
            createLinePointMarker(
              `${seriesName} data point · ${point.label}`,
              point.x,
              point.y,
              colors[seriesIndex % colors.length],
            ),
          );
          if (payload.showValues) {
            contentFrame.appendChild(
              withConstraints(
                createText(
                  formatNumber(point.value, payload),
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

    drawXAxisCategoryLabels(
      contentFrame,
      payload,
      rows,
      padding,
      plotWidth,
      plotHeight,
    );
    drawAxisLabels(contentFrame, payload, padding, plotWidth, plotHeight);

    if (payload.showLegend && seriesCount > 1) {
      drawLegend(contentFrame, payload, padding, plotWidth, height, layout);
    }

    return frame;
  } catch (error) {
    if (frame.remove) frame.remove();
    throw error;
  }
}

function createEditableDoughnutChart(payload: ChartPayload): FrameNode {
  const layout = createChartLayout(payload);
  const { frame, contentFrame } = createBaseFrame(
    payload,
    "ChartStudio Doughnut Chart",
    layout,
  );
  frame.name = payload.title
    ? `ChartStudio Doughnut Chart · ${payload.title}`
    : "ChartStudio Doughnut Chart";

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
    doughnutFrame.appendChild(
      withConstraints(
        createFilledVectorPath(
          `Doughnut Segment ${index + 1} · ${row.label}`,
          arcPath(centerX, centerY, outerRadius, innerRadius, angle, nextAngle),
          colors[index % colors.length],
          payload.segmentBorders ? COLORS.background : undefined,
          payload.segmentBorders ? 2 : 0,
        ),
        "MIN",
        "MIN",
      ),
    );
    angle = nextAngle;
  });

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

  if (payload.showValues || payload.showPercent) {
    const centerValueSize = diameter < 120 ? 14 : 22;
    doughnutFrame.appendChild(
      withConstraints(
        createText(
          payload.showPercent ? "100%" : formatNumber(total, payload),
          centerValueSize,
          FONT_REGULAR,
          COLORS.text,
          centerX - 48,
          centerY - 18,
          96,
          24,
          "CENTER",
        ),
        "CENTER",
        "CENTER",
      ),
    );
    if (diameter >= 128) {
      doughnutFrame.appendChild(
        withConstraints(
          createText(
            "Total",
            11,
            FONT_REGULAR,
            COLORS.mutedText,
            centerX - 48,
            centerY + 8,
            96,
            16,
            "CENTER",
          ),
          "CENTER",
          "CENTER",
        ),
      );
    }
  }
  contentFrame.appendChild(doughnutFrame);

  if (payload.showLegend) {
    drawDoughnutLegend(contentFrame, payload, values, total, colors, layout);
  } else {
    drawDoughnutLabels(
      contentFrame,
      payload,
      values,
      total,
      colors,
      doughnut.chartX,
      doughnut.chartY,
      outerRadius,
      layout.contentWidth,
      layout.contentHeight,
    );
  }

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
    if (payload.showAxisLabels) {
      frame.appendChild(
        withConstraints(
          createText(
            formatNumber(value, payload),
            11,
            FONT_REGULAR,
            COLORS.mutedText,
            16,
            y - 8,
            58,
            16,
            "RIGHT",
          ),
          "MIN",
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
        1.5,
      ),
      "SCALE",
      "SCALE",
    ),
  );
  frame.appendChild(
    withConstraints(
      createLinePath(
        "Y axis",
        padding.left,
        padding.top,
        padding.left,
        padding.top + plotHeight,
        COLORS.axis,
        1.5,
      ),
      "SCALE",
      "SCALE",
    ),
  );
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
                formatNumber(value, payload),
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

function drawXAxisCategoryLabels(
  frame: FrameNode,
  payload: ChartPayload,
  rows: { label: string; values: number[] }[],
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  plotHeight: number,
) {
  if (!payload.showAxisLabels) return;
  const denominator = Math.max(rows.length - 1, 1);
  rows.forEach((row, rowIndex) => {
    frame.appendChild(
      withConstraints(
        createText(
          row.label,
          11,
          FONT_REGULAR,
          COLORS.mutedText,
          padding.left + (plotWidth * rowIndex) / denominator - 36,
          padding.top + plotHeight + 10,
          72,
          18,
          "CENTER",
        ),
        "SCALE",
        "SCALE",
      ),
    );
  });
}

function drawAxisLabels(
  frame: FrameNode,
  payload: ChartPayload,
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  plotHeight: number,
) {
  if (payload.xLabel) {
    const xLabelArea = withConstraints(
      createTransparentFrame(
        "X axis label area",
        padding.left,
        padding.top + plotHeight + 34,
        plotWidth,
        28,
      ),
      "STRETCH",
      "MAX",
    );
    const xLabel = withConstraints(
      createText(
        payload.xLabel,
        TEXT_STYLES.axisTitle.fontSize,
        TEXT_STYLES.axisTitle.font,
        COLORS.text,
        0,
        5,
        plotWidth,
        TEXT_STYLES.axisTitle.lineHeight,
        "CENTER",
      ),
      "STRETCH",
      "CENTER",
    );
    xLabel.name = "X axis label";
    xLabelArea.appendChild(xLabel);
    frame.appendChild(xLabelArea);
  }

  if (payload.yLabel) {
    const yLabelAreaWidth = Math.max(32, padding.left - 38);
    const yLabelArea = withConstraints(
      createTransparentFrame(
        "Y axis label area",
        0,
        padding.top,
        yLabelAreaWidth,
        plotHeight,
      ),
      "MIN",
      "STRETCH",
    );
    const yLabel = withConstraints(
      createText(
        payload.yLabel,
        TEXT_STYLES.axisTitle.fontSize,
        TEXT_STYLES.axisTitle.font,
        COLORS.text,
        (yLabelAreaWidth - TEXT_STYLES.axisTitle.lineHeight) / 2,
        plotHeight,
        plotHeight,
        TEXT_STYLES.axisTitle.lineHeight,
        "CENTER",
      ),
      "CENTER",
      "CENTER",
    );
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
      layout.cartesian.legendY,
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
    itemFrame.appendChild(
      withConstraints(
        createText(
          name,
          11,
          FONT_REGULAR,
          COLORS.text,
          16,
          2,
          Math.max(24, itemWidth - 20),
          16,
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
      layout.doughnut.legendX,
      layout.doughnut.legendY,
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
    const valueLabel = payload.showPercent
      ? `${Math.round((row.value / total) * 100)}%`
      : formatNumber(row.value, payload);
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
  contentWidth: number,
  contentHeight: number,
) {
  let angle = -Math.PI / 2;
  values.forEach((row, index) => {
    const nextAngle = angle + (row.value / total) * Math.PI * 2;
    const mid = (angle + nextAngle) / 2;
    const x = Math.min(
      contentWidth - 52,
      Math.max(52, chartX + outerRadius + Math.cos(mid) * (outerRadius + 32)),
    );
    const y = Math.min(
      contentHeight - 12,
      Math.max(12, chartY + outerRadius + Math.sin(mid) * (outerRadius + 24)),
    );
    frame.appendChild(
      withConstraints(
        createText(
          payload.showPercent
            ? `${row.label} · ${Math.round((row.value / total) * 100)}%`
            : row.label,
          11,
          FONT_MEDIUM,
          COLORS.text,
          x - 52,
          y - 10,
          104,
          20,
          "CENTER",
        ),
        "CENTER",
        "CENTER",
      ),
    );
    angle = nextAngle;
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
    createEllipse(`${name} circle`, 0, 0, 8, 8, color, COLORS.background, 1.5),
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
  return text;
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

function formatNumber(value: number, payload: ChartPayload): string {
  const rounded = Math.round(value);
  const base = payload.thousands
    ? rounded.toLocaleString("en-GB")
    : String(rounded);
  if (payload.numberFormat === "currency") return `£${base}`;
  if (payload.numberFormat === "percent") return `${base}%`;
  return base;
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
