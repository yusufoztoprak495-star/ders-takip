import { useEffect, useState } from "react";

// Chart.js renkleri canvas'a gerçek renk metni olarak verilir (CSS değişkeni olarak değil),
// bu yüzden index.css'teki belirteçler okunur. Açık/koyu mod değişince yeniden okunur.
function readChartTheme() {
  const style = getComputedStyle(document.documentElement);
  const get = (name) => style.getPropertyValue(name).trim();
  return {
    surface: get("--surface"),
    ink: get("--text"),
    muted: get("--muted"),
    grid: get("--chart-grid"),
    axis: get("--chart-axis"),
    dim: get("--series-dim"),
    series: [get("--series-1"), get("--series-2"), get("--series-3")],
  };
}

export function useChartTheme() {
  const [theme, setTheme] = useState(readChartTheme);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setTheme(readChartTheme());
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return theme;
}
