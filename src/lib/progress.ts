import { metrics } from "@/lib/evaluation";

export type EvaluationRecord = {
  id: string;
  teacherName: string;
  classSubject: string;
  mode: string;
  scores: Record<string, number>;
  totalScore: number;
  tier: string;
  verdict: string;
  focusMetric: string;
  createdAt: string;
};

export type ReviewPoint = {
  date: string;
  label: string;
  total: number;
  tier: string;
  verdict: string;
  focusMetric: string;
  mode: string;
  delta: number | null;
  scores: Record<string, number>;
};

export type MetricTrend = {
  name: string;
  shortName: string;
  first: number;
  latest: number;
  delta: number;
};

export type EducatorProgress = {
  key: string;
  teacherName: string;
  classSubject: string;
  observationCount: number;
  points: ReviewPoint[];
  firstTotal: number;
  latestTotal: number;
  change: number;
  tier: string;
  metricTrends: MetricTrend[];
  biggestGain: MetricTrend | null;
  biggestDrop: MetricTrend | null;
};

const dayKey = (iso: string) => iso.slice(0, 10);

const labelFor = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const buildMetricTrends = (points: ReviewPoint[]): MetricTrend[] => {
  const first = points[0]?.scores ?? {};
  const latest = points[points.length - 1]?.scores ?? {};
  return metrics.map((metric) => {
    const firstScore = first[metric.name] ?? 0;
    const latestScore = latest[metric.name] ?? 0;
    return { name: metric.name, shortName: metric.shortName, first: firstScore, latest: latestScore, delta: latestScore - firstScore };
  });
};

export function buildEducatorProgress(records: EvaluationRecord[]): EducatorProgress[] {
  const groups = new Map<string, EvaluationRecord[]>();
  for (const record of records) {
    const key = `${record.teacherName} · ${record.classSubject}`;
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }

  const educators = [...groups.entries()].map(([key, rows]) => {
    const sorted = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    // One review point per calendar date — the day's latest observation wins.
    const byDay = new Map<string, EvaluationRecord>();
    for (const row of sorted) byDay.set(dayKey(row.createdAt), row);
    const dayRows = [...byDay.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const points: ReviewPoint[] = dayRows.map((row, index) => {
      const previous = index > 0 ? dayRows[index - 1].totalScore : null;
      return {
        date: dayKey(row.createdAt),
        label: labelFor(dayKey(row.createdAt)),
        total: row.totalScore,
        tier: row.tier,
        verdict: row.verdict,
        focusMetric: row.focusMetric,
        mode: row.mode,
        delta: previous === null ? null : row.totalScore - previous,
        scores: row.scores,
      };
    });
    const metricTrends = buildMetricTrends(points);
    const gains = metricTrends.filter((trend) => trend.delta > 0).sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name));
    const drops = metricTrends.filter((trend) => trend.delta < 0).sort((a, b) => a.delta - b.delta || a.name.localeCompare(b.name));
    return {
      key,
      teacherName: sorted[0]?.teacherName ?? "",
      classSubject: sorted[0]?.classSubject ?? "",
      observationCount: rows.length,
      points,
      firstTotal: points[0]?.total ?? 0,
      latestTotal: points[points.length - 1]?.total ?? 0,
      change: (points[points.length - 1]?.total ?? 0) - (points[0]?.total ?? 0),
      tier: points[points.length - 1]?.tier ?? "",
      metricTrends,
      biggestGain: gains[0] ?? null,
      biggestDrop: drops[0] ?? null,
    };
  });

  // Most recently reviewed educator first.
  return educators.sort((a, b) => (b.points[b.points.length - 1]?.date ?? "").localeCompare(a.points[a.points.length - 1]?.date ?? ""));
}

export function trendLabel(delta: number) {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "0";
}
