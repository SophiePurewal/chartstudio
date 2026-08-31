import { describe, expect, test } from "bun:test";

import {
  createPatternLegendSwatchSvg,
  createPatternedDoughnutSvg,
} from "./doughnut-pattern-svg";

describe("pattern SVG generation", () => {
  test("creates a self-contained doughnut SVG", () => {
    const svg = createPatternedDoughnutSvg({
      size: 200,
      innerRadiusRatio: 0.55,
      segments: [
        { label: "A", value: 60 },
        { label: "B", value: 40 },
      ],
      segmentBorders: true,
      defPrefix: "test-chart",
    });

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('id="test-chart-slice-0"');
    expect(svg).toContain('id="test-chart-slice-1"');
    expect(svg).toContain('stroke="#FFFFFF"');
    expect(svg).not.toContain("<script");
  });

  test("creates a compact legend swatch", () => {
    const svg = createPatternLegendSwatchSvg(1, 16);

    expect(svg).toContain('width="16"');
    expect(svg).toContain('height="16"');
    expect(svg).toContain("<clipPath");
  });
});
