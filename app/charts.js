// HomeLedger charts — small dependency-free SVG charts drawn from the
// household's own figures: a donut for where the money went, bars for
// month-to-month comparison, and a line for the running balance.

import { money0, esc } from "./store.js";

// Donut: slices are {name, color, amount}. Returns SVG + a legend list.
export function donut(slices, size = 220, thickness = 34) {
  const total = slices.reduce((s, x) => s + x.amount, 0) || 1;
  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const rings = slices.map((s) => {
    const frac = s.amount / total;
    const len = Math.max(frac * circ - 2, 0.5);
    const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thickness}" stroke-dasharray="${len.toFixed(1)} ${(circ - len).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" />`;
    offset += frac * circ;
    return el;
  }).join("");
  const legend = slices.map((s) =>
    `<span><i class="sw" style="background:${s.color}"></i>${esc(s.name)} <b>${money0(s.amount)}</b> (${Math.round(s.amount / total * 100)}%)</span>`
  ).join("");
  return `<svg class="chart" viewBox="0 0 ${size} ${size}" role="img" aria-label="Spending by category donut chart" style="max-width:${size}px;margin:0 auto">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ede8db" stroke-width="${thickness}" />
    <g transform="rotate(-90 ${cx} ${cy})">${rings}</g>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="15" fill="#78716c">spent</text>
    <text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="19" font-weight="800" fill="#1c1917">${money0(total)}</text>
  </svg><div class="legend">${legend}</div>`;
}

// Vertical bars: values are {label, value, color?}. A zero line is drawn.
export function bars(values, height = 180, maxLabel = true) {
  const w = 560, h = height, padB = 26, padT = 12;
  const max = Math.max(...values.map((v) => v.value), 1);
  const bw = Math.min(64, (w - 20) / values.length - 14);
  const gap = (w - 20 - bw * values.length) / (values.length + 1);
  const parts = values.map((v, i) => {
    const bh = Math.max((v.value / max) * (h - padB - padT), 2);
    const x = 10 + gap + i * (bw + gap);
    const y = h - padB - bh;
    const color = v.color || "#166534";
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${color}" />
      <text x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="#1c1917">${money0(v.value)}</text>
      <text x="${(x + bw / 2).toFixed(1)}" y="${(h - 8).toFixed(1)}" text-anchor="middle" font-size="12" fill="#57534e">${esc(v.label)}</text>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Bar chart">${parts}</svg>`;
}

// Grouped bars: income vs spending per month. Series: [{label, income, spending}]
export function groupedBars(series, height = 200) {
  const w = 560, h = height, padB = 26, padT = 22;
  const max = Math.max(...series.flatMap((s) => [s.income, s.spending]), 1);
  const groupW = (w - 30) / series.length;
  const bw = Math.min(38, groupW / 2 - 8);
  const parts = series.map((s, i) => {
    const gx = 15 + i * groupW;
    const ih = Math.max((s.income / max) * (h - padB - padT), 2);
    const sh = Math.max((s.spending / max) * (h - padB - padT), 2);
    const cx = gx + groupW / 2;
    return `<rect x="${(cx - bw - 3).toFixed(1)}" y="${(h - padB - ih).toFixed(1)}" width="${bw}" height="${ih.toFixed(1)}" rx="4" fill="#166534" />
      <rect x="${(cx + 3).toFixed(1)}" y="${(h - padB - sh).toFixed(1)}" width="${bw}" height="${sh.toFixed(1)}" rx="4" fill="#b45309" />
      <text x="${(cx - bw / 2 - 3).toFixed(1)}" y="${(h - padB - ih - 5).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#166534">${money0(s.income)}</text>
      <text x="${(cx + bw / 2 + 3).toFixed(1)}" y="${(h - padB - sh - 5).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#b45309">${money0(s.spending)}</text>
      <text x="${cx.toFixed(1)}" y="${(h - 8).toFixed(1)}" text-anchor="middle" font-size="12" fill="#57534e">${esc(s.label)}</text>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Income versus spending by month">${parts}</svg>
  <div class="legend"><span><i class="sw" style="background:#166534"></i>Income</span><span><i class="sw" style="background:#b45309"></i>Spending</span></div>`;
}

// Line chart of a running balance across the days of a month.
export function balanceLine(points, height = 170) {
  const w = 560, h = height, padL = 24, padR = 24, padB = 24, padT = 14;
  const min = Math.min(...points.map((p) => p.value), 0);
  const max = Math.max(...points.map((p) => p.value), 1);
  const span = max - min || 1;
  const x = (i) => padL + (i / Math.max(points.length - 1, 1)) * (w - padL - padR);
  const y = (v) => padT + (1 - (v - min) / span) * (h - padT - padB);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${h - padB} L${x(0).toFixed(1)},${h - padB} Z`;
  const dots = points.filter((p, i) => i % 5 === 0 || i === points.length - 1).map((p, i, arr) =>
    `<circle cx="${x(points.indexOf(p)).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.5" fill="#166534" />`
  ).join("");
  const labels = points.filter((p, i) => i % 7 === 0 || i === points.length - 1).map((p) =>
    `<text x="${x(points.indexOf(p)).toFixed(1)}" y="${h - 6}" text-anchor="middle" font-size="11" fill="#57534e">${esc(p.label)}</text>`
  ).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Running balance through the month">
    <path d="${area}" fill="#dcfce7" opacity="0.55" />
    <path d="${line}" fill="none" stroke="#166534" stroke-width="2.5" stroke-linejoin="round" />
    ${dots}
    <text x="${w / 2}" y="${padT - 2}" text-anchor="middle" font-size="12" fill="#57534e">Balance ${money0(points[points.length - 1].value)} at ${esc(points[points.length - 1].label)}</text>
    ${labels}
  </svg>`;
}
