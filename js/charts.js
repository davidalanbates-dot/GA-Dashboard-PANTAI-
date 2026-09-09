// Small Chart.js wrapper following the dataviz method: one axis, thin marks,
// muted grid/axes, legend for >=2 series, tooltips on hover, direct color-by-entity.

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const SERIES = () => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => cssVar(`--series-${n}`));

function baseGrid() {
  return {
    color: cssVar("--gridline"),
    tickColor: "transparent",
  };
}

function baseTicks() {
  return {
    color: cssVar("--text-muted"),
    font: { size: 11 },
  };
}

function tooltipTheme() {
  return {
    backgroundColor: cssVar("--surface-2"),
    titleColor: cssVar("--text-primary"),
    bodyColor: cssVar("--text-secondary"),
    borderColor: cssVar("--border"),
    borderWidth: 1,
    padding: 10,
    boxPadding: 4,
    usePointStyle: true,
  };
}

function lineChart(ctx, { labels, datasets, showLegend = true }) {
  const colors = SERIES();
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        label: d.label,
        data: d.data,
        borderColor: d.color || colors[i],
        backgroundColor: d.color || colors[i],
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: d.color || colors[i],
        tension: 0.25,
        fill: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: showLegend && datasets.length > 1,
          position: "top",
          align: "end",
          labels: { color: cssVar("--text-secondary"), boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11.5 } },
        },
        tooltip: tooltipTheme(),
      },
      scales: {
        x: { grid: { display: false }, ticks: baseTicks(), border: { display: false } },
        y: { grid: baseGrid(), ticks: baseTicks(), border: { display: false }, beginAtZero: true },
      },
    },
  });
}

function barChart(ctx, { labels, data, colors, horizontal = false, valueFormatter }) {
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderRadius: 4,
        maxBarThickness: 34,
      }],
    },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipTheme(),
          callbacks: valueFormatter ? { label: (c) => valueFormatter(c.raw) } : undefined,
        },
      },
      scales: {
        x: {
          grid: horizontal ? baseGrid() : { display: false },
          ticks: baseTicks(),
          border: { display: false },
          beginAtZero: !horizontal,
        },
        y: {
          grid: horizontal ? { display: false } : baseGrid(),
          ticks: baseTicks(),
          border: { display: false },
          beginAtZero: horizontal,
        },
      },
    },
  });
}

window.DashCharts = { lineChart, barChart, SERIES, cssVar };
