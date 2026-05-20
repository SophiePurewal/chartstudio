var $t = Math.pow;
var Nt = (Y, Q, H) =>
  new Promise((tt, V) => {
    var et = (F) => {
        try {
          W(H.next(F));
        } catch (X) {
          V(X);
        }
      },
      nt = (F) => {
        try {
          W(H.throw(F));
        } catch (X) {
          V(X);
        }
      },
      W = (F) => (F.done ? tt(F.value) : Promise.resolve(F.value).then(et, nt));
    W((H = H.apply(Y, Q)).next());
  });
(function () {
  "use strict";
  const Y = [
    "solid",
    "hatch",
    "hatch-reverse",
    "dot",
    "cross-hatch",
    "grid",
    "dot-condensed",
  ];
  function Q(t) {
    const e = ((Math.trunc(t) % Y.length) + Y.length) % Y.length;
    return Y[e];
  }
  function H(t) {
    return Q(t);
  }
  function tt(t, e, n, r, a, s) {
    const o = s - a > Math.PI ? 1 : 0,
      i = t + Math.cos(a) * n,
      c = e + Math.sin(a) * n,
      u = t + Math.cos(s) * n,
      h = e + Math.sin(s) * n,
      f = t + Math.cos(s) * r,
      g = e + Math.sin(s) * r,
      d = t + Math.cos(a) * r,
      p = e + Math.sin(a) * r;
    return `M ${i} ${c} A ${n} ${n} 0 ${o} 1 ${u} ${h} L ${f} ${g} A ${r} ${r} 0 ${o} 0 ${d} ${p} Z`;
  }
  function V(t, e) {
    const n = "#281805",
      r = [],
      a = [],
      s = t === "dot-condensed" ? 8 : 12;
    if (t === "solid") return "";
    for (let o = -e; o <= e * 2; o += s)
      ((t === "hatch" || t === "cross-hatch") &&
        r.push(
          `<line x1="${o}" y1="${e}" x2="${o + e}" y2="0" stroke="${n}" stroke-width="1.75" stroke-linecap="butt" />`,
        ),
        (t === "hatch-reverse" || t === "cross-hatch") &&
          r.push(
            `<line x1="${o}" y1="0" x2="${o + e}" y2="${e}" stroke="${n}" stroke-width="1.75" stroke-linecap="butt" />`,
          ),
        t === "grid" &&
          (r.push(
            `<line x1="${o}" y1="0" x2="${o}" y2="${e}" stroke="${n}" stroke-width="1.4" stroke-linecap="butt" />`,
          ),
          r.push(
            `<line x1="0" y1="${o + e}" x2="${e}" y2="${o + e}" stroke="${n}" stroke-width="1.4" stroke-linecap="butt" />`,
          )));
    if (t === "dot" || t === "dot-condensed") {
      const o = t === "dot-condensed" ? 8 : 14,
        i = t === "dot-condensed" ? 1.5 : 1.8;
      for (let c = 0; c <= e; c += o)
        for (let u = 0; u <= e; u += o)
          a.push(`<circle cx="${u}" cy="${c}" r="${i}" fill="${n}" />`);
    }
    return [...r, ...a].join(`
`);
  }
  function et(t) {
    return V(t, 12);
  }
  function nt(t) {
    const {
        size: e,
        innerRadiusRatio: n,
        segments: r,
        segmentBorders: a,
        defPrefix: s,
      } = t,
      o = e / 2,
      i = o * n,
      c = r.reduce((g, d) => g + Math.max(0, d.value), 0) || 1;
    let u = 0;
    const h = [],
      f = [];
    return (
      r.forEach((g, d) => {
        const p = (u / c) * Math.PI * 2 - Math.PI / 2;
        u += Math.max(0, g.value);
        const x = (u / c) * Math.PI * 2 - Math.PI / 2,
          m = H(d),
          l = tt(o, o, o, i, p, x),
          b = `${s}-clip-${d}`,
          E = `${s}-mask-${d}`,
          M = `${s}-slice-${d}`;
        (h.push(`
      <clipPath id="${b}" clipPathUnits="userSpaceOnUse"><path d="${l}" /></clipPath>
      <mask id="${E}" maskUnits="userSpaceOnUse" x="0" y="0" width="${e}" height="${e}">
        <rect x="0" y="0" width="${e}" height="${e}" fill="black" />
        <path d="${l}" fill="white" />
      </mask>
      <g id="${M}">
        <g mask="url(#${E})" clip-path="url(#${b})">
          <path d="${l}" fill="#E6E3DC" />
          <g>${V(m, e)}</g>
        </g>
        ${a ? `<path d="${l}" fill="none" stroke="#FFFFFF" stroke-width="2" />` : ""}
      </g>
    `),
          f.push(`<use href="#${M}" />`));
      }),
      `<svg xmlns="http://www.w3.org/2000/svg" width="${e}" height="${e}" viewBox="0 0 ${e} ${e}">
    <defs>${h.join(`
`)}</defs>
    ${f.join(`
`)}
    <circle cx="${o}" cy="${o}" r="${i}" fill="#FFFFFF" />
  </svg>`
    );
  }
  function W(t, e = 12) {
    const n = H(t),
      r = et(n);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${e}" height="${e}" viewBox="0 0 ${e} ${e}">
    <rect x="0" y="0" width="${e}" height="${e}" rx="2" fill="#E6E3DC" />
    <g clip-path="url(#clip)">${r}</g>
    <clipPath id="clip"><rect x="0" y="0" width="${e}" height="${e}" rx="2" /></clipPath>
  </svg>`;
  }
  function F(t) {
    return { numberFormat: t.numberFormat, thousands: t.thousands };
  }
  function X(t) {
    if (!Number.isFinite(t)) return "0";
    const e = t < 0 ? "-" : "",
      n = String(Math.abs(t)),
      [r, a] = n.split("."),
      s = r.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return a ? `${e}${s}.${a}` : `${e}${s}`;
  }
  function O(t, e) {
    const n = Math.round(t),
      r = e.thousands ? X(n) : String(n);
    return e.numberFormat === "currency"
      ? `£${r}`
      : e.numberFormat === "percent"
        ? `${r}%`
        : r;
  }
  function ht(t) {
    return `${Math.round(t)}%`;
  }
  const I = { family: "Inter", style: "Regular" },
    y = { family: "Inter", style: "Medium" },
    Lt = { family: "Inter", style: "Bold" },
    U = {
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
    },
    z = {
      default: { strokeCap: "ROUND" },
      "default-underline": { double: !0, strokeCap: "ROUND" },
      dotted: { dashPattern: [1, 8], strokeCap: "ROUND" },
      "dash-01": { dashPattern: [8, 8], strokeCap: "NONE" },
      "dash-02": { dashPattern: [24, 12], strokeCap: "NONE" },
    },
    N = {
      text: D("#281805"),
      mutedText: D("#281805"),
      grid: D("#CAC8C2"),
      axis: D("#281805"),
      background: D("#FFFFFF"),
    },
    v = {
      title: { fontSize: 32, lineHeight: 40, font: I },
      axisTitle: { fontSize: 14, lineHeight: 18, font: I },
    },
    j = {
      "desktop-12": { label: "Desktop 12 column", width: 1064, height: 608 },
      "desktop-10": { label: "Desktop 10 column", width: 872, height: 496 },
      "desktop-8": { label: "Desktop 8 column", width: 680, height: 392 },
      "tablet-12": { label: "Tablet 12 column", width: 632, height: 360 },
      "mobile-4": { label: "Mobile 4 column", width: 351, height: 200 },
    },
    wt = {
      preset: "desktop-8",
      width: j["desktop-8"].width,
      height: j["desktop-8"].height,
    },
    lt = 320,
    ut = 180,
    Z = 8,
    A = 8;
  (figma.showUI(__html__, { width: 440, height: 760, themeColors: !0 }),
    (figma.ui.onmessage = (t) =>
      Nt(null, null, function* () {
        if (t.type === "cancel") {
          figma.closePlugin();
          return;
        }
        if (t.type !== "create-chart" && t.type !== "create-bar-chart") return;
        let e = null;
        try {
          const n = Tt(t.payload);
          if (!n.valid) {
            (figma.notify(n.message, { error: !0 }),
              figma.ui.postMessage({
                type: "chart-error",
                message: n.message,
              }));
            return;
          }
          (yield Promise.all([
            figma.loadFontAsync(I),
            figma.loadFontAsync(y),
            figma.loadFontAsync(Lt),
          ]),
            (e = St(t.payload)),
            figma.currentPage.appendChild(e),
            (figma.currentPage.selection = [e]),
            figma.viewport.scrollAndZoomIntoView([e]),
            figma.notify(`Editable ${ct(t.payload.type)} chart created`),
            figma.ui.postMessage({ type: "chart-created" }));
        } catch (n) {
          e != null && e.remove && e.remove();
          const r =
            n instanceof Error
              ? `Could not create ${ct(t.payload.type)} chart: ${n.message}`
              : `Could not create ${ct(t.payload.type)} chart.`;
          (figma.notify(r, { error: !0 }),
            figma.ui.postMessage({ type: "chart-error", message: r }));
        }
      })));
  function Tt(t) {
    if (!t.type)
      return {
        valid: !1,
        message: "Choose a chart type before creating a chart.",
      };
    if (t.rows.length < 2)
      return {
        valid: !1,
        message: `Add at least two ${t.type === "doughnut" ? "segments" : "rows"} of data before creating a chart.`,
      };
    if (!t.rows.every((r) => r.values.some((a) => Number.isFinite(Number(a)))))
      return {
        valid: !1,
        message: "Every row needs at least one numeric value.",
      };
    const n = vt(t.chartSize);
    if (!n.valid) return n;
    if (t.type === "doughnut") {
      const r = t.rows.map((a) => Number(a.values[0]) || 0);
      if (r.some((a) => a < 0))
        return { valid: !1, message: "Doughnut charts need positive values." };
      if (r.reduce((a, s) => a + s, 0) <= 0)
        return {
          valid: !1,
          message: "Doughnut chart values must add up to more than zero.",
        };
    }
    return { valid: !0 };
  }
  function St(t) {
    if (t.type === "bar") return At(t);
    if (t.type === "line") return Pt(t);
    if (t.type === "doughnut") return It(t);
    throw new Error("Unsupported chart type.");
  }
  function gt(t) {
    var e;
    if (!t) return wt;
    if (t.preset !== "custom") {
      const n = (e = j[t.preset]) != null ? e : j["desktop-8"];
      return { preset: t.preset, width: n.width, height: n.height };
    }
    return {
      preset: "custom",
      width: Math.round(Number(t.width)),
      height: Math.round(Number(t.height)),
    };
  }
  function vt(t) {
    const e = gt(t);
    return !Number.isFinite(e.width) || !Number.isFinite(e.height)
      ? { valid: !1, message: "Enter a valid chart width and height." }
      : e.width < lt
        ? { valid: !1, message: `Chart width must be at least ${lt}px.` }
        : e.height < ut
          ? { valid: !1, message: `Chart height must be at least ${ut}px.` }
          : { valid: !0 };
  }
  function rt(t) {
    const e = gt(t.chartSize),
      n = e.width - Z * 2,
      r = e.height - Z * 2,
      a = e.width <= 420 || e.height <= 240,
      s = t.showLegend,
      o = {
        top: t.title ? (a ? 56 : 72) : a ? 24 : 36,
        right: a ? 16 : 36,
        bottom:
          (t.showAxisLabels ? 26 : 10) + (t.xLabel ? 32 : 8) + (s ? 36 : 8),
        left: t.yLabel ? (a ? 72 : 86) : t.showAxisLabels ? 64 : 40,
      },
      i = Math.max(A * 10, n - o.left - o.right),
      c = Math.max(A * 6, r - o.top - o.bottom),
      u = s ? 24 : 0,
      h = Math.min(r - u - A, o.top + c + (t.xLabel ? 62 : 38)),
      f = t.title ? (a ? 56 : 72) : a ? 16 : 32,
      g = t.legendPos === "right" && e.width >= 560 && e.height >= 300,
      d = Math.ceil(t.rows.length / (g ? 1 : 2)),
      p = s ? Math.max(24, d * 26) : 0,
      x = s
        ? g
          ? Math.min(240, Math.max(176, n * 0.28))
          : Math.min(n - A * 2, 520)
        : 0,
      m = s ? (a ? 12 : 24) : 0,
      l = Math.max(A * 10, r - f - A - (g ? 0 : p + m)),
      b = Math.max(A * 10, n - (g ? x + m : 0)),
      E = Math.max(A * 10, Math.min(b, l)),
      M = g ? E + m + x : E,
      T = Math.max(A, (n - M) / 2),
      L = f,
      w = g ? T + E + m : Math.max(A, (n - x) / 2),
      P = g ? L + Math.max(0, (E - p) / 2) : Math.min(r - p - A, L + E + m);
    return {
      outerWidth: e.width,
      outerHeight: e.height,
      contentWidth: n,
      contentHeight: r,
      cartesian: {
        padding: o,
        plotWidth: i,
        plotHeight: c,
        legendY: h,
        legendHeight: u,
      },
      doughnut: {
        chartX: T,
        chartY: L,
        squareSize: E,
        legendX: w,
        legendY: P,
        legendWidth: x,
        legendHeight: p,
        legendColumns: g ? 1 : 2,
      },
    };
  }
  function at(t, e, n) {
    const r = figma.createFrame();
    ((r.name = t.title || e),
      r.resize && r.resize(n.outerWidth, n.outerHeight),
      (r.x = figma.viewport.center.x - n.outerWidth / 2),
      (r.y = figma.viewport.center.y - n.outerHeight / 2),
      (r.fills = [R(N.background)]),
      (r.clipsContent = !0));
    const a = figma.createFrame();
    if (
      ((a.name = "Chart content"),
      (a.x = Z),
      (a.y = Z),
      a.resize && a.resize(n.contentWidth, n.contentHeight),
      (a.fills = []),
      (a.clipsContent = !0),
      st(a, "MIN", "MIN"),
      r.appendChild(a),
      t.title)
    ) {
      const s = S(
        t.title,
        v.title.fontSize,
        v.title.font,
        N.text,
        0,
        0,
        n.contentWidth,
        v.title.lineHeight,
        "CENTER",
        v.title.lineHeight,
      );
      ((s.name = "Chart Title"),
        (s.textAlignVertical = "TOP"),
        st(s, "MIN", "MIN"),
        a.appendChild(s));
    }
    return { frame: r, contentFrame: a };
  }
  function At(t) {
    const e = rt(t),
      { padding: n, plotWidth: r, plotHeight: a } = e.cartesian,
      s = e.contentHeight,
      o = Math.max(1, t.seriesNames.length),
      i = t.rows.map((g) => ({
        label: g.label,
        values: g.values.slice(0, o).map((d) => G(d, 0)),
      })),
      c = Bt(
        i.map((g) => g.values),
        t.barLayout,
      ),
      u = Mt(c),
      { frame: h, contentFrame: f } = at(t, "ChartStudio Bar Chart", e);
    return (
      (h.name = t.title
        ? `ChartStudio Bar Chart · ${t.title}`
        : "ChartStudio Bar Chart"),
      dt(f, t, n, r, a, u),
      Ft(f, t, i, n, r, a, u, o),
      ft(f, t, n, r, a),
      t.showLegend && o > 1 && mt(f, t, n, r, s, e),
      h
    );
  }
  function _(t) {
    return F(t);
  }
  function Pt(t) {
    const e = rt(t),
      { padding: n, plotWidth: r, plotHeight: a } = e.cartesian,
      s = e.contentHeight,
      o = Math.max(1, t.seriesNames.length),
      i = t.rows.map((g) => ({
        label: g.label,
        values: g.values.slice(0, o).map((d) => G(d, 0)),
      })),
      c = Mt(bt(i.map((g) => g.values))),
      u = U[t.palette].map(D),
      { frame: h, contentFrame: f } = at(t, "ChartStudio Line Chart", e);
    h.name = t.title
      ? `ChartStudio Line Chart · ${t.title}`
      : "ChartStudio Line Chart";
    try {
      dt(f, t, n, r, a, c);
      const g = Math.max(i.length - 1, 1);
      for (let d = 0; d < o; d += 1) {
        const p = it(t.seriesNames, d),
          x = i.map((M, T) => {
            const L = G(M.values[d], 0),
              w = n.left + (r * T) / g,
              P = n.top + a - (Math.max(0, L) / c) * a;
            return Xt({ x: w, y: P, value: L, label: M.label });
          }),
          m = _t(t, d, o),
          l = t.smooth ? Wt(x) : Vt(x),
          b = Math.max(1, G(t.lineWeight, 1)),
          E = u[d % u.length];
        if (m.double) {
          const M = b / 2 + 0.5;
          (f.appendChild(
            C(J(`${p} Line · upper`, pt(l, -M), E, b, m), "SCALE", "SCALE"),
          ),
            f.appendChild(
              C(J(`${p} Line · lower`, pt(l, M), E, b, m), "SCALE", "SCALE"),
            ));
        } else f.appendChild(C(J(`${p} Line`, l, E, b, m), "SCALE", "SCALE"));
        t.showPoints &&
          x.forEach((M) => {
            (f.appendChild(
              Ht(`${p} data point · ${M.label}`, M.x, M.y, u[d % u.length]),
            ),
              t.showValues &&
                f.appendChild(
                  C(
                    S(
                      O(M.value, _(t)),
                      10,
                      y,
                      N.mutedText,
                      M.x - 30,
                      Math.max(0, M.y - 24),
                      60,
                      14,
                      "CENTER",
                    ),
                    "SCALE",
                    "SCALE",
                  ),
                ));
          });
      }
      return (
        kt(f, t, i, n, r, a),
        ft(f, t, n, r, a),
        t.showLegend && o > 1 && mt(f, t, n, r, s, e),
        h
      );
    } catch (g) {
      throw (h.remove && h.remove(), g);
    }
  }
  function It(t) {
    const e = rt(t),
      { frame: n, contentFrame: r } = at(t, "ChartStudio Doughnut Chart", e);
    n.name = t.title
      ? `ChartStudio Doughnut Chart · ${t.title}`
      : "ChartStudio Doughnut Chart";
    const a = U[t.palette].map(D),
      s = t.rows.map((m) => ({
        label: m.label,
        value: Math.max(0, Number(m.values[0]) || 0),
      })),
      o = s.reduce((m, l) => m + l.value, 0),
      i = e.doughnut,
      c = i.squareSize,
      u = c / 2,
      h = Math.max(20, Math.min(u - 12, u * (t.innerRadius / 100))),
      f = u,
      g = u,
      d = C(k("Doughnut chart area", i.chartX, i.chartY, c, c), "MIN", "MIN");
    d.constrainProportions = !0;
    let p = -Math.PI / 2;
    if (
      (s.forEach((m, l) => {
        const b = p + (m.value / o) * Math.PI * 2;
        if (t.palette !== "pattern-fill") {
          const E = Ot(f, g, u, h, p, b);
          d.appendChild(
            C(
              Yt(
                `Doughnut Segment ${l + 1} · ${m.label}`,
                E,
                a[l % a.length],
                t.segmentBorders ? N.background : void 0,
                t.segmentBorders ? 2 : 0,
              ),
              "MIN",
              "MIN",
            ),
          );
        }
        p = b;
      }),
      t.palette === "pattern-fill")
    ) {
      const m = figma.createNodeFromSvg(
        nt({
          size: c,
          innerRadiusRatio: h / u,
          segments: s.map((l) => ({ label: l.label, value: l.value })),
          segmentBorders: t.segmentBorders,
          defPrefix: `doughnut-output-${Date.now()}`,
        }),
      );
      ((m.name = "Doughnut Pattern SVG"),
        (m.x = 0),
        (m.y = 0),
        d.appendChild(C(m, "MIN", "MIN")));
    }
    const x = C(
      Ct("Doughnut Center Hole", f - h, g - h, h * 2, h * 2, N.background),
      "CENTER",
      "CENTER",
    );
    return (
      (x.constrainProportions = !0),
      d.appendChild(x),
      r.appendChild(d),
      t.showValues &&
        Rt(
          r,
          t,
          s,
          o,
          a,
          i.chartX,
          i.chartY,
          u,
          h,
          e.contentWidth,
          e.contentHeight,
        ),
      t.showLegend && Dt(r, t, s, o, a, e),
      n
    );
  }
  function dt(t, e, n, r, a, s) {
    for (let i = 0; i <= 4; i += 1) {
      const c = (s / 4) * i,
        u = n.top + a - (a * i) / 4;
      (e.showGrid &&
        i > 0 &&
        t.appendChild(
          C(
            B(`Gridline ${i}`, n.left, u, n.left + r, u, N.grid, 1),
            "SCALE",
            "SCALE",
          ),
        ),
        e.showAxisLabels &&
          t.appendChild(
            C(
              S(O(c, _(e)), 11, I, N.mutedText, 16, u - 8, 58, 16, "RIGHT"),
              "MIN",
              "SCALE",
            ),
          ));
    }
    (t.appendChild(
      C(
        B("X axis", n.left, n.top + a, n.left + r, n.top + a, N.axis, 1.5),
        "SCALE",
        "SCALE",
      ),
    ),
      t.appendChild(
        C(
          B("Y axis", n.left, n.top, n.left, n.top + a, N.axis, 1.5),
          "SCALE",
          "SCALE",
        ),
      ));
  }
  function Ft(t, e, n, r, a, s, o, i) {
    const c = U[e.palette].map(D),
      u =
        e.barSpacing === "compact"
          ? 0.12
          : e.barSpacing === "wide"
            ? 0.34
            : 0.22,
      h = a / n.length,
      f = h * (1 - u);
    n.forEach((g, d) => {
      const p = r.left + d * h + (h - f) / 2;
      if (e.barLayout === "stacked" && i > 1) {
        let x = 0;
        g.values.forEach((m, l) => {
          const b = Math.max(1, (m / o) * s),
            E = C(
              q(
                `${g.label} · ${it(e.seriesNames, l)}`,
                p,
                r.top + s - x - b,
                f,
                b,
                c[l % c.length],
                e.barRadius,
              ),
              "SCALE",
              "SCALE",
            );
          (t.appendChild(E), (x += b));
        });
      } else {
        const x = i > 1 ? 4 : 0,
          m = (f - x * (i - 1)) / i;
        g.values.forEach((l, b) => {
          const E = Math.max(1, (l / o) * s),
            M = p + b * (m + x),
            T = r.top + s - E,
            L = it(e.seriesNames, b);
          (t.appendChild(
            C(
              q(`${g.label} · ${L}`, M, T, m, E, c[b % c.length], e.barRadius),
              "SCALE",
              "SCALE",
            ),
          ),
            e.showValues &&
              t.appendChild(
                C(
                  S(
                    O(l, _(e)),
                    10,
                    y,
                    N.mutedText,
                    M - 8,
                    Math.max(0, T - 18),
                    m + 16,
                    14,
                    "CENTER",
                  ),
                  "SCALE",
                  "SCALE",
                ),
              ));
        });
      }
      e.showAxisLabels &&
        t.appendChild(
          C(
            S(
              g.label,
              11,
              I,
              N.mutedText,
              r.left + d * h,
              r.top + s + 10,
              h,
              18,
              "CENTER",
            ),
            "SCALE",
            "SCALE",
          ),
        );
    });
  }
  function kt(t, e, n, r, a, s) {
    if (!e.showAxisLabels) return;
    const o = Math.max(n.length - 1, 1);
    n.forEach((i, c) => {
      t.appendChild(
        C(
          S(
            i.label,
            11,
            I,
            N.mutedText,
            r.left + (a * c) / o - 36,
            r.top + s + 10,
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
  function ft(t, e, n, r, a) {
    if (e.xLabel) {
      const s = C(
          k("X axis label area", n.left, n.top + a + 34, r, 28),
          "STRETCH",
          "MAX",
        ),
        o = C(
          S(
            e.xLabel,
            v.axisTitle.fontSize,
            v.axisTitle.font,
            N.text,
            0,
            5,
            r,
            v.axisTitle.lineHeight,
            "CENTER",
          ),
          "STRETCH",
          "CENTER",
        );
      ((o.name = "X axis label"), s.appendChild(o), t.appendChild(s));
    }
    if (e.yLabel) {
      const s = Math.max(32, n.left - 38),
        o = C(k("Y axis label area", 0, n.top, s, a), "MIN", "STRETCH"),
        i = C(
          S(
            e.yLabel,
            v.axisTitle.fontSize,
            v.axisTitle.font,
            N.text,
            (s - v.axisTitle.lineHeight) / 2,
            a,
            a,
            v.axisTitle.lineHeight,
            "CENTER",
          ),
          "CENTER",
          "CENTER",
        );
      ((i.name = "Y axis label"),
        (i.rotation = -90),
        o.appendChild(i),
        t.appendChild(o));
    }
  }
  function mt(t, e, n, r, a, s) {
    const o = U[e.palette].map(D),
      i = C(
        k(
          "Chart legend",
          n.left,
          s.cartesian.legendY,
          r,
          s.cartesian.legendHeight || 24,
        ),
        "STRETCH",
        "MAX",
      ),
      c = Math.min(118, r / e.seriesNames.length),
      u = c * e.seriesNames.length,
      h = C(k("Chart legend items", (r - u) / 2, 0, u, 24), "CENTER", "CENTER");
    (e.seriesNames.forEach((f, g) => {
      const d = C(k(`Legend item · ${f}`, g * c, 0, c, 20), "MIN", "CENTER");
      (d.appendChild(
        C(
          q(`Legend color · ${f}`, 0, 5, 10, 10, o[g % o.length], 2),
          "MIN",
          "CENTER",
        ),
      ),
        d.appendChild(
          C(
            S(f, 11, I, N.text, 16, 2, Math.max(24, c - 20), 16, "LEFT"),
            "STRETCH",
            "CENTER",
          ),
        ),
        h.appendChild(d));
    }),
      i.appendChild(h),
      t.appendChild(i));
  }
  function Dt(t, e, n, r, a, s) {
    const i = s.doughnut.legendColumns,
      c = i > 1 ? 20 : 0,
      u = Math.max(132, (s.doughnut.legendWidth - c * (i - 1)) / i),
      h = C(
        k(
          "Chart legend",
          s.doughnut.legendX,
          s.doughnut.legendY,
          s.doughnut.legendWidth,
          s.doughnut.legendHeight,
        ),
        "MIN",
        "MIN",
      );
    (n.forEach((f, g) => {
      const d = i > 1 ? g % i : 0,
        p = Math.floor(g / i),
        x = C(
          k(`Legend item · ${f.label}`, d * (u + c), p * 26, u, 20),
          "MIN",
          "MIN",
        );
      if (
        (x.appendChild(
          C(
            q(`Legend color · ${f.label}`, 0, 4, 12, 12, a[g % a.length], 3),
            "MIN",
            "CENTER",
          ),
        ),
        e.palette === "pattern-fill")
      ) {
        const l = figma.createNodeFromSvg(W(g, 12));
        ((l.name = `Legend pattern · ${f.label}`),
          (l.x = 0),
          (l.y = 4),
          x.appendChild(C(l, "MIN", "CENTER")));
      }
      const m = e.showPercent ? ht((f.value / r) * 100) : O(f.value, _(e));
      (x.appendChild(
        C(
          S(f.label, 11, I, N.text, 18, 0, Math.max(28, u - 86), 20, "LEFT"),
          "MIN",
          "CENTER",
        ),
      ),
        x.appendChild(
          C(
            S(m, 11, y, N.mutedText, u - 64, 0, 64, 20, "RIGHT"),
            "MAX",
            "CENTER",
          ),
        ),
        h.appendChild(x));
    }),
      t.appendChild(h));
  }
  function Rt(t, e, n, r, a, s, o, i, c, u, h) {
    const f = s + i,
      g = o + i,
      d = e.palette === "standard" ? null : N.axis,
      p = [];
    let x = -Math.PI / 2;
    n.forEach((l) => {
      const b = x + (l.value / r) * Math.PI * 2,
        E = (x + b) / 2,
        M = Math.cos(E) >= 0 ? "right" : "left",
        T = f + Math.cos(E) * (c + (i - c) * 0.65),
        L = g + Math.sin(E) * (c + (i - c) * 0.65),
        w = f + Math.cos(E) * (i + 12),
        P = g + Math.sin(E) * (i + 22);
      (p.push({
        row: l,
        pct: (l.value / r) * 100,
        mid: E,
        side: M,
        anchorX: T,
        anchorY: L,
        elbowX: w,
        targetY: P,
      }),
        (x = b));
    });
    const m = (l, b, E, M) => {
      const T = p
        .filter((w) => w.side === l)
        .sort((w, P) => w.targetY - P.targetY);
      let L = b;
      (T.forEach((w) => {
        ((w.targetY = Math.max(w.targetY, L)), (L = w.targetY + M));
      }),
        (L = E));
      for (let w = T.length - 1; w >= 0; w -= 1) {
        const P = T[w];
        ((P.targetY = Math.min(P.targetY, L)), (L = P.targetY - M));
      }
    };
    (m("left", 18, h - 28, 24),
      m("right", 18, h - 28, 24),
      p.forEach((l, b) => {
        const E = Math.max(110, Math.min(168, l.row.label.length * 6 + 44)),
          M =
            l.side === "right"
              ? Math.min(u - E - 6, l.elbowX + 10)
              : Math.max(6, l.elbowX - E - 10),
          T = e.showPercent ? ht(l.pct) : O(l.row.value, _(e));
        t.appendChild(
          C(
            B(
              `Doughnut callout radial ${b + 1} · ${l.row.label}`,
              l.anchorX,
              l.anchorY,
              l.elbowX,
              l.targetY,
              d != null ? d : a[b % a.length],
              1.25,
            ),
            "MIN",
            "MIN",
          ),
        );
        const L = l.side === "right" ? M - 3 : M + E + 3;
        (t.appendChild(
          C(
            B(
              `Doughnut callout horizontal ${b + 1} · ${l.row.label}`,
              l.elbowX,
              l.targetY,
              L,
              l.targetY,
              d != null ? d : a[b % a.length],
              1.25,
            ),
            "MIN",
            "MIN",
          ),
        ),
          t.appendChild(
            C(
              S(
                l.row.label,
                11,
                I,
                N.text,
                M,
                l.targetY - 12,
                E,
                14,
                l.side === "right" ? "LEFT" : "RIGHT",
              ),
              "MIN",
              "MIN",
            ),
          ),
          t.appendChild(
            C(
              S(
                T,
                11,
                I,
                N.text,
                M,
                l.targetY + 2,
                E,
                14,
                l.side === "right" ? "LEFT" : "RIGHT",
              ),
              "MIN",
              "MIN",
            ),
          ));
      }));
  }
  function st(t, e, n) {
    t.constraints = { horizontal: e, vertical: n };
  }
  function C(t, e, n) {
    return (st(t, e, n), t);
  }
  function k(t, e, n, r, a) {
    const s = figma.createFrame();
    return (
      (s.name = t),
      (s.x = e),
      (s.y = n),
      s.resize && s.resize(r, a),
      (s.fills = []),
      (s.clipsContent = !1),
      s
    );
  }
  function q(t, e, n, r, a, s, o) {
    const i = figma.createRectangle();
    return (
      (i.name = t),
      (i.x = e),
      (i.y = n),
      i.resize && i.resize(r, a),
      (i.fills = [R(s)]),
      (i.cornerRadius = o),
      i
    );
  }
  function Ct(t, e, n, r, a, s, o, i = 0) {
    const c = figma.createEllipse();
    return (
      (c.name = t),
      (c.x = e),
      (c.y = n),
      c.resize && c.resize(r, a),
      (c.fills = [R(s)]),
      (c.strokes = o ? [R(o)] : []),
      (c.strokeWeight = i),
      c
    );
  }
  function Ht(t, e, n, r) {
    const a = C(k(t, e - 4, n - 4, 8, 8), "SCALE", "SCALE"),
      s = C(
        Ct(`${t} circle`, 0, 0, 8, 8, r, N.background, 1.5),
        "CENTER",
        "CENTER",
      );
    return ((s.constrainProportions = !0), a.appendChild(s), a);
  }
  function S(t, e, n, r, a, s, o, i, c, u = i) {
    const h = figma.createText();
    return (
      (h.name = t),
      (h.x = a),
      (h.y = s),
      h.resize && h.resize(o, i),
      (h.fontName = n),
      (h.fontSize = e),
      (h.lineHeight = { unit: "PIXELS", value: u }),
      (h.characters = t),
      (h.fills = [R(r)]),
      (h.textAlignHorizontal = c),
      (h.textAlignVertical = "CENTER"),
      h
    );
  }
  function B(t, e, n, r, a, s, o) {
    return J(t, `M ${$(e)} ${$(n)} L ${$(r)} ${$(a)}`, s, o);
  }
  function J(t, e, n, r, a = z.default) {
    const s = Et(e),
      o = figma.createVector();
    return (
      (o.name = t),
      (o.x = 0),
      (o.y = 0),
      (o.fills = []),
      (o.strokes = [R(n)]),
      (o.strokeWeight = r),
      (o.strokeCap = a.strokeCap),
      a.dashPattern && (o.dashPattern = a.dashPattern),
      (o.vectorPaths = [{ windingRule: "NONZERO", data: s }]),
      o
    );
  }
  function Yt(t, e, n, r, a = 0) {
    const s = Et(e),
      o = figma.createVector();
    return (
      (o.name = t),
      (o.x = 0),
      (o.y = 0),
      (o.fills = [R(n)]),
      (o.strokes = r ? [R(r)] : []),
      (o.strokeWeight = a),
      (o.vectorPaths = [{ windingRule: "EVENODD", data: s }]),
      o
    );
  }
  function Vt(t) {
    return t.length
      ? t.map((e, n) => `${n === 0 ? "M" : "L"} ${$(e.x)} ${$(e.y)}`).join(" ")
      : "";
  }
  function Wt(t) {
    if (!t.length) return "";
    let e = `M ${$(t[0].x)} ${$(t[0].y)}`;
    for (let n = 0; n < t.length - 1; n += 1) {
      const r = t[n],
        a = t[n + 1],
        s = (r.x + a.x) / 2;
      e += ` C ${$(s)} ${$(r.y)} ${$(s)} ${$(a.y)} ${$(a.x)} ${$(a.y)}`;
    }
    return e;
  }
  function Xt(t) {
    return {
      label: t.label,
      x: ot(t.x, "line chart x coordinate"),
      y: ot(t.y, "line chart y coordinate"),
      value: G(t.value, 0),
    };
  }
  function G(t, e) {
    const n = Number(t);
    return Number.isFinite(n) ? n : e;
  }
  function ot(t, e) {
    if (!Number.isFinite(t))
      throw new Error(`Invalid ${e}. Check the chart data and try again.`);
    return t;
  }
  function $(t) {
    return (ot(t, "vector path coordinate"), Number(t.toFixed(2)).toString());
  }
  function Et(t) {
    if (!t.trim())
      throw new Error(
        "Vector path is empty. Check the chart data and try again.",
      );
    if (/\b(?:NaN|Infinity|null|undefined)\b/.test(t))
      throw new Error(
        "Vector path contains an invalid coordinate. Check the chart data and try again.",
      );
    if (/\bA\b/i.test(t))
      throw new Error("Vector path uses an unsupported arc command.");
    return t;
  }
  function Ot(t, e, n, r, a, s) {
    const i = s - a >= Math.PI * 2 - 1e-4 ? s - 1e-4 : s,
      c = K(t, e, n, a),
      u = K(t, e, r, i);
    return [
      `M ${$(c.x)} ${$(c.y)}`,
      xt(t, e, n, a, i),
      `L ${$(u.x)} ${$(u.y)}`,
      xt(t, e, r, i, a),
      "Z",
    ]
      .filter(Boolean)
      .join(" ");
  }
  function xt(t, e, n, r, a) {
    const s = a - r,
      o = Math.max(1, Math.ceil(Math.abs(s) / (Math.PI / 2))),
      i = s / o,
      c = [];
    for (let u = 0; u < o; u += 1) {
      const h = r + i * u,
        f = h + i,
        g = K(t, e, n, h),
        d = K(t, e, n, f),
        p = (4 / 3) * Math.tan((f - h) / 4),
        x = { x: g.x - p * n * Math.sin(h), y: g.y + p * n * Math.cos(h) },
        m = { x: d.x + p * n * Math.sin(f), y: d.y - p * n * Math.cos(f) };
      c.push(`C ${$(x.x)} ${$(x.y)} ${$(m.x)} ${$(m.y)} ${$(d.x)} ${$(d.y)}`);
    }
    return c.join(" ");
  }
  function K(t, e, n, r) {
    return { x: t + n * Math.cos(r), y: e + n * Math.sin(r) };
  }
  function _t(t, e, n) {
    var o, i;
    const r = (o = t.lineStyles) != null ? o : [],
      a = Object.keys(z),
      s = n > 1 ? r[e] || a[e % a.length] : r[0] || "default";
    return (i = z[s]) != null ? i : z.default;
  }
  function pt(t, e) {
    const n = t.match(/[A-Z]|-?\d+(?:\.\d+)?/g);
    if (!n) return t;
    const r = [];
    let a = 0;
    for (; a < n.length; ) {
      const s = n[a];
      (r.push(s), (a += 1));
      const o = s === "C" ? 6 : s === "M" || s === "L" ? 2 : 0;
      for (let i = 0; i < o; i += 1) {
        const c = Number(n[a]);
        (r.push($(i % 2 === 1 ? c + e : c)), (a += 1));
      }
    }
    return r.join(" ");
  }
  function it(t, e) {
    return t[e] || `Series ${e + 1}`;
  }
  function bt(t) {
    let e = 1;
    return (
      t.forEach((n) => {
        n.forEach((r) => {
          e = Math.max(e, Math.max(0, r));
        });
      }),
      e
    );
  }
  function Bt(t, e) {
    if (e === "stacked") {
      let n = 1;
      return (
        t.forEach((r) => {
          const a = r.reduce((s, o) => s + Math.max(0, o), 0);
          n = Math.max(n, a);
        }),
        n
      );
    }
    return bt(t);
  }
  function Mt(t) {
    const e = Math.floor(Math.log10(t)),
      n = $t(10, e),
      r = t / n;
    return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * n;
  }
  function ct(t) {
    return t === "line" ? "line" : t === "doughnut" ? "doughnut" : "bar";
  }
  function R(t, e) {
    return e === void 0
      ? { type: "SOLID", color: t }
      : { type: "SOLID", color: t, opacity: e };
  }
  function D(t) {
    const e = t.replace("#", ""),
      n = Number.parseInt(e, 16);
    return {
      r: ((n >> 16) & 255) / 255,
      g: ((n >> 8) & 255) / 255,
      b: (n & 255) / 255,
    };
  }
})();
