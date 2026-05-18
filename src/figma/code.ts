import type { ChartPayload, UiToFigmaMessage } from "./types";

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

const COLORS = {
  text: hexToRgb("#111827"),
  mutedText: hexToRgb("#6B7280"),
  grid: hexToRgb("#E5E7EB"),
  axis: hexToRgb("#374151"),
  background: hexToRgb("#FFFFFF"),
};

const CHART_SIZE = { width: 720, height: 460 };
const CHART_FRAME_PADDING = 8;
const CONTENT_SIZE = {
  width: CHART_SIZE.width - CHART_FRAME_PADDING * 2,
  height: CHART_SIZE.height - CHART_FRAME_PADDING * 2,
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

    const chart = createEditableChart(message.payload);
    figma.currentPage.appendChild(chart);
    figma.currentPage.selection = [chart];
    figma.viewport.scrollAndZoomIntoView([chart]);
    figma.notify(
      `Editable ${getChartTypeLabel(message.payload.type)} chart created`,
    );
    figma.ui.postMessage({ type: "chart-created" });
  } catch (error) {
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

function createBaseFrame(
  payload: ChartPayload,
  fallbackName: string,
): { frame: FrameNode; contentFrame: FrameNode } {
  const frame = figma.createFrame();
  frame.name = payload.title || fallbackName;
  if (frame.resize) frame.resize(CHART_SIZE.width, CHART_SIZE.height);
  frame.x = figma.viewport.center.x - CHART_SIZE.width / 2;
  frame.y = figma.viewport.center.y - CHART_SIZE.height / 2;
  frame.fills = [solid(COLORS.background)];
  frame.clipsContent = true;

  const contentFrame = figma.createFrame();
  contentFrame.name = "Chart content";
  contentFrame.x = CHART_FRAME_PADDING;
  contentFrame.y = CHART_FRAME_PADDING;
  if (contentFrame.resize) {
    contentFrame.resize(CONTENT_SIZE.width, CONTENT_SIZE.height);
  }
  contentFrame.fills = [];
  contentFrame.clipsContent = true;
  setConstraints(contentFrame, "STRETCH", "STRETCH");
  frame.appendChild(contentFrame);

  if (payload.title) {
    const title = createText(
      payload.title,
      24,
      FONT_BOLD,
      COLORS.text,
      16,
      14,
      CONTENT_SIZE.width - 32,
      30,
      "LEFT",
    );
    setConstraints(title, "STRETCH", "MIN");
    contentFrame.appendChild(title);
  }

  return { frame, contentFrame };
}

function getPlotPadding(payload: ChartPayload) {
  return {
    top: payload.title ? 64 : 36,
    right: 36,
    bottom: 92,
    left: 86,
  };
}

function createEditableBarChart(payload: ChartPayload): FrameNode {
  const width = CONTENT_SIZE.width;
  const height = CONTENT_SIZE.height;
  const padding = getPlotPadding(payload);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
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
    drawLegend(contentFrame, payload, padding, plotWidth, height);
  }

  return frame;
}

function createEditableLineChart(payload: ChartPayload): FrameNode {
  const width = CONTENT_SIZE.width;
  const height = CONTENT_SIZE.height;
  const padding = getPlotPadding(payload);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
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

      contentFrame.appendChild(
        withConstraints(
          createVectorPath(
            `${seriesName} Line`,
            payload.smooth ? smoothPath(points) : straightPath(points),
            colors[seriesIndex % colors.length],
            Math.max(1, getFiniteNumber(payload.lineWeight, 1)),
          ),
          "SCALE",
          "SCALE",
        ),
      );

      if (payload.showPoints) {
        points.forEach((point) => {
          contentFrame.appendChild(
            withConstraints(
              createEllipse(
                `${seriesName} data point · ${point.label}`,
                point.x - 4,
                point.y - 4,
                8,
                8,
                colors[seriesIndex % colors.length],
                COLORS.background,
                1.5,
              ),
              "SCALE",
              "SCALE",
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
      drawLegend(contentFrame, payload, padding, plotWidth, height);
    }

    return frame;
  } catch (error) {
    if (frame.remove) frame.remove();
    throw error;
  }
}

function createEditableDoughnutChart(payload: ChartPayload): FrameNode {
  const width = CONTENT_SIZE.width;
  const height = CONTENT_SIZE.height;
  const { frame, contentFrame } = createBaseFrame(
    payload,
    "ChartStudio Doughnut Chart",
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
  const outerRadius = 132;
  const innerRadius = Math.max(
    32,
    Math.min(112, outerRadius * (payload.innerRadius / 100)),
  );
  const chartX =
    payload.showLegend && payload.legendPos === "right" ? 104 : 228;
  const chartY = payload.title ? 100 : 72;
  const centerX = chartX + outerRadius;
  const centerY = chartY + outerRadius;
  let angle = -Math.PI / 2;

  values.forEach((row, index) => {
    const nextAngle = angle + (row.value / total) * Math.PI * 2;
    contentFrame.appendChild(
      withConstraints(
        createFilledVectorPath(
          `Doughnut Segment ${index + 1} · ${row.label}`,
          arcPath(centerX, centerY, outerRadius, innerRadius, angle, nextAngle),
          colors[index % colors.length],
          payload.segmentBorders ? COLORS.background : undefined,
          payload.segmentBorders ? 2 : 0,
        ),
        "SCALE",
        "SCALE",
      ),
    );
    angle = nextAngle;
  });

  contentFrame.appendChild(
    withConstraints(
      createEllipse(
        "Doughnut Center Hole",
        centerX - innerRadius,
        centerY - innerRadius,
        innerRadius * 2,
        innerRadius * 2,
        COLORS.background,
      ),
      "SCALE",
      "SCALE",
    ),
  );

  if (payload.showValues || payload.showPercent) {
    contentFrame.appendChild(
      withConstraints(
        createText(
          payload.showPercent ? "100%" : formatNumber(total, payload),
          22,
          FONT_BOLD,
          COLORS.text,
          centerX - 48,
          centerY - 18,
          96,
          24,
          "CENTER",
        ),
        "SCALE",
        "SCALE",
      ),
    );
    contentFrame.appendChild(
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
        "SCALE",
        "SCALE",
      ),
    );
  }

  if (payload.showLegend) {
    drawDoughnutLegend(
      contentFrame,
      payload,
      values,
      total,
      colors,
      chartX,
      chartY,
      outerRadius,
    );
  } else {
    drawDoughnutLabels(
      contentFrame,
      payload,
      values,
      total,
      colors,
      chartX,
      chartY,
      outerRadius,
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
    frame.appendChild(
      createText(
        payload.xLabel,
        12,
        FONT_MEDIUM,
        COLORS.text,
        padding.left,
        padding.top + plotHeight + 42,
        plotWidth,
        18,
        "CENTER",
      ),
    );
  }
  if (payload.yLabel) {
    const yLabel = createText(
      payload.yLabel,
      12,
      FONT_MEDIUM,
      COLORS.text,
      18,
      padding.top + plotHeight / 2 + 54,
      plotHeight,
      18,
      "CENTER",
    );
    yLabel.rotation = -90;
    frame.appendChild(yLabel);
  }
}

function drawLegend(
  frame: FrameNode,
  payload: ChartPayload,
  padding: { top: number; left: number; bottom: number; right: number },
  plotWidth: number,
  height: number,
) {
  const colors = PALETTES[payload.palette].map(hexToRgb);
  let x = padding.left;
  const y = height - 28;
  payload.seriesNames.forEach((name, index) => {
    frame.appendChild(
      createRectangle(
        `Legend color · ${name}`,
        x,
        y + 2,
        10,
        10,
        colors[index % colors.length],
        2,
      ),
    );
    frame.appendChild(
      createText(
        name,
        11,
        FONT_REGULAR,
        COLORS.mutedText,
        x + 16,
        y,
        90,
        16,
        "LEFT",
      ),
    );
    x += Math.min(118, plotWidth / payload.seriesNames.length);
  });
}

function drawDoughnutLegend(
  frame: FrameNode,
  payload: ChartPayload,
  values: { label: string; value: number }[],
  total: number,
  colors: RGB[],
  chartX: number,
  chartY: number,
  outerRadius: number,
) {
  const legendX =
    payload.legendPos === "right" ? chartX + outerRadius * 2 + 52 : 96;
  const legendY =
    payload.legendPos === "right" ? chartY + 24 : chartY + outerRadius * 2 + 28;
  const rowWidth = payload.legendPos === "right" ? 220 : 250;
  values.forEach((row, index) => {
    const x =
      payload.legendPos === "bottom" && index % 2 === 1
        ? legendX + 270
        : legendX;
    const y =
      legendY +
      Math.floor(index / (payload.legendPos === "bottom" ? 2 : 1)) * 26;
    frame.appendChild(
      createRectangle(
        `Legend color · ${row.label}`,
        x,
        y + 4,
        12,
        12,
        colors[index % colors.length],
        3,
      ),
    );
    frame.appendChild(
      createText(
        row.label,
        11,
        FONT_REGULAR,
        COLORS.text,
        x + 18,
        y,
        rowWidth - 92,
        20,
        "LEFT",
      ),
    );
    const valueLabel = payload.showPercent
      ? `${Math.round((row.value / total) * 100)}%`
      : formatNumber(row.value, payload);
    frame.appendChild(
      createText(
        valueLabel,
        11,
        FONT_MEDIUM,
        COLORS.mutedText,
        x + rowWidth - 76,
        y,
        76,
        20,
        "RIGHT",
      ),
    );
  });
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
) {
  let angle = -Math.PI / 2;
  values.forEach((row, index) => {
    const nextAngle = angle + (row.value / total) * Math.PI * 2;
    const mid = (angle + nextAngle) / 2;
    const x = chartX + outerRadius + Math.cos(mid) * (outerRadius + 42);
    const y = chartY + outerRadius + Math.sin(mid) * (outerRadius + 28);
    frame.appendChild(
      createText(
        payload.showPercent
          ? `${row.label} · ${Math.round((row.value / total) * 100)}%`
          : row.label,
        11,
        FONT_MEDIUM,
        colors[index % colors.length],
        x - 52,
        y - 10,
        104,
        20,
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
): TextNode {
  const text = figma.createText();
  text.name = characters;
  text.x = x;
  text.y = y;
  if (text.resize) text.resize(width, height);
  text.fontName = fontName;
  text.fontSize = fontSize;
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
): VectorNode {
  const safeData = validateVectorPathData(data);
  const vector = figma.createVector();
  vector.name = name;
  vector.x = 0;
  vector.y = 0;
  vector.fills = [];
  vector.strokes = [solid(color)];
  vector.strokeWeight = strokeWeight;
  vector.strokeCap = "ROUND";
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
    throw new Error("Line chart path is empty. Add at least two data rows.");
  }
  if (/\b(?:NaN|Infinity|null|undefined)\b/.test(data)) {
    throw new Error("Line chart path contains an invalid coordinate.");
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
  const large = adjustedEnd - start > Math.PI ? 1 : 0;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(adjustedEnd);
  const y2 = cy + r * Math.sin(adjustedEnd);
  const x3 = cx + ir * Math.cos(adjustedEnd);
  const y3 = cy + ir * Math.sin(adjustedEnd);
  const x4 = cx + ir * Math.cos(start);
  const y4 = cy + ir * Math.sin(start);
  return [
    `M ${formatCoordinate(x1)} ${formatCoordinate(y1)}`,
    `A ${formatCoordinate(r)} ${formatCoordinate(r)} 0 ${large} 1 ${formatCoordinate(x2)} ${formatCoordinate(y2)}`,
    `L ${formatCoordinate(x3)} ${formatCoordinate(y3)}`,
    `A ${formatCoordinate(ir)} ${formatCoordinate(ir)} 0 ${large} 0 ${formatCoordinate(x4)} ${formatCoordinate(y4)}`,
    "Z",
  ].join(" ");
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
