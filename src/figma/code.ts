import type { BarChartPayload, UiToFigmaMessage } from "./types";

type RGB = { r: number; g: number; b: number };
type Paint = { type: "SOLID"; color: RGB; opacity?: number };
type FontName = { family: string; style: string };
type SceneNode = {
  name: string;
  x: number;
  y: number;
  resize?: (width: number, height: number) => void;
  rotation?: number;
  appendChild?: (node: SceneNode) => void;
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
  createText: () => TextNode;
  createLine: () => LineNode;
  loadFontAsync: (fontName: FontName) => Promise<void>;
  notify: (message: string, options?: { error?: boolean }) => void;
  closePlugin: () => void;
};

declare const figma: FigmaPluginApi;
declare const __html__: string;

const FONT_REGULAR: FontName = { family: "Inter", style: "Regular" };
const FONT_MEDIUM: FontName = { family: "Inter", style: "Medium" };
const FONT_BOLD: FontName = { family: "Inter", style: "Bold" };

const PALETTES: Record<BarChartPayload["palette"], string[]> = {
  finance: ["#635BFF", "#00A6D6", "#22A06B", "#F2A900", "#E15A46", "#A855F7"],
  neutral: ["#1F2937", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"],
  vibrant: ["#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#A855F7"],
  data: ["#278004", "#860DA8", "#005873", "#D5648D", "#959898", "#386500"],
};

const COLORS = {
  text: hexToRgb("#111827"),
  mutedText: hexToRgb("#6B7280"),
  grid: hexToRgb("#E5E7EB"),
  axis: hexToRgb("#374151"),
  background: hexToRgb("#FFFFFF"),
};

figma.showUI(__html__, { width: 440, height: 760, themeColors: true });

figma.ui.onmessage = async (message) => {
  if (message.type === "cancel") {
    figma.closePlugin();
    return;
  }

  if (message.type !== "create-bar-chart") return;

  if (message.payload.type !== "bar") {
    const error =
      "This first Figma plugin version can only create editable bar charts.";
    figma.notify(error, { error: true });
    figma.ui.postMessage({ type: "chart-error", message: error });
    return;
  }

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

  const chart = createEditableBarChart(message.payload);
  figma.currentPage.appendChild(chart);
  figma.currentPage.selection = [chart];
  figma.viewport.scrollAndZoomIntoView([chart]);
  figma.notify("Editable bar chart created");
  figma.ui.postMessage({ type: "chart-created" });
};

function validatePayload(
  payload: BarChartPayload,
): { valid: true } | { valid: false; message: string } {
  if (payload.rows.length < 2)
    return {
      valid: false,
      message: "Add at least two rows of data before creating a chart.",
    };
  const hasNumericValue = payload.rows.every((row) =>
    row.values.some((value) => Number.isFinite(Number(value))),
  );
  if (!hasNumericValue)
    return {
      valid: false,
      message: "Every row needs at least one numeric value.",
    };
  return { valid: true };
}

function createEditableBarChart(payload: BarChartPayload): FrameNode {
  const width = 720;
  const height = 460;
  const padding = {
    top: payload.title ? 64 : 36,
    right: 36,
    bottom: 92,
    left: 86,
  };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const seriesCount = Math.max(1, payload.seriesNames.length);
  const rows = payload.rows.map((row) => ({
    label: row.label,
    values: row.values.slice(0, seriesCount).map((value) => Number(value) || 0),
  }));
  const maxValue = getMaxValue(
    rows.map((row) => row.values),
    payload.barLayout,
  );
  const niceMax = niceCeil(maxValue);

  const frame = figma.createFrame();
  frame.name = payload.title || "Editable bar chart";
  frame.resize?.(width, height);
  frame.x = figma.viewport.center.x - width / 2;
  frame.y = figma.viewport.center.y - height / 2;
  frame.fills = [solid(COLORS.background)];
  frame.clipsContent = false;

  if (payload.title) {
    frame.appendChild(
      createText(
        payload.title,
        24,
        FONT_BOLD,
        COLORS.text,
        24,
        22,
        width - 48,
        30,
        "LEFT",
      ),
    );
  }

  drawGridAndAxes(frame, payload, padding, plotWidth, plotHeight, niceMax);
  drawBars(
    frame,
    payload,
    rows,
    padding,
    plotWidth,
    plotHeight,
    niceMax,
    seriesCount,
  );
  drawAxisLabels(frame, payload, padding, plotWidth, plotHeight);

  if (payload.showLegend && seriesCount > 1) {
    drawLegend(frame, payload, padding, plotWidth, height);
  }

  return frame;
}

function drawGridAndAxes(
  frame: FrameNode,
  payload: BarChartPayload,
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
        createLine(
          `Gridline ${index}`,
          padding.left,
          y,
          plotWidth,
          COLORS.grid,
          1,
        ),
      );
    }
    if (payload.showAxisLabels) {
      frame.appendChild(
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
      );
    }
  }

  frame.appendChild(
    createLine(
      "X axis",
      padding.left,
      padding.top + plotHeight,
      plotWidth,
      COLORS.axis,
      1.5,
    ),
  );
  const yAxis = createLine(
    "Y axis",
    padding.left,
    padding.top,
    plotHeight,
    COLORS.axis,
    1.5,
  );
  yAxis.rotation = 90;
  frame.appendChild(yAxis);
}

function drawBars(
  frame: FrameNode,
  payload: BarChartPayload,
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
        const bar = createRectangle(
          `${row.label} · ${payload.seriesNames[seriesIndex] ?? `Series ${seriesIndex + 1}`}`,
          groupX,
          padding.top + plotHeight - stackedHeight - barHeight,
          usableGroupWidth,
          barHeight,
          colors[seriesIndex % colors.length],
          payload.barRadius,
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
        const seriesLabel =
          payload.seriesNames[seriesIndex] ?? `Series ${seriesIndex + 1}`;
        frame.appendChild(
          createRectangle(
            `${row.label} · ${seriesLabel}`,
            x,
            y,
            barWidth,
            barHeight,
            colors[seriesIndex % colors.length],
            payload.barRadius,
          ),
        );
        if (payload.showValues) {
          frame.appendChild(
            createText(
              formatNumber(value, payload),
              10,
              FONT_MEDIUM,
              COLORS.mutedText,
              x - 8,
              y - 18,
              barWidth + 16,
              14,
              "CENTER",
            ),
          );
        }
      });
    }

    if (payload.showAxisLabels) {
      frame.appendChild(
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
      );
    }
  });
}

function drawAxisLabels(
  frame: FrameNode,
  payload: BarChartPayload,
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
  payload: BarChartPayload,
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
  rectangle.resize?.(width, height);
  rectangle.fills = [solid(color)];
  rectangle.cornerRadius = cornerRadius;
  return rectangle;
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
  text.resize?.(width, height);
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
  line.resize?.(length, 0);
  line.strokes = [solid(color)];
  line.strokeWeight = strokeWeight;
  return line;
}

function getMaxValue(
  values: number[][],
  layout: BarChartPayload["barLayout"],
): number {
  if (layout === "stacked") {
    return Math.max(
      ...values.map((row) =>
        row.reduce((sum, value) => sum + Math.max(0, value), 0),
      ),
      1,
    );
  }
  return Math.max(...values.flat().map((value) => Math.max(0, value)), 1);
}

function niceCeil(value: number): number {
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function formatNumber(value: number, payload: BarChartPayload): string {
  const rounded = Math.round(value);
  const base = payload.thousands
    ? rounded.toLocaleString("en-GB")
    : String(rounded);
  if (payload.numberFormat === "currency") return `£${base}`;
  if (payload.numberFormat === "percent") return `${base}%`;
  return base;
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
