import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, LineChart, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getEvaluationHistory } from "@/lib/evaluations.functions";
import { buildEducatorProgress, trendLabel, type EducatorProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress Dashboard — EquiTeach" },
      { name: "description", content: "Compare an educator's saved observation scores across review dates and see which behaviors are moving." },
      { property: "og:title", content: "Progress Dashboard — EquiTeach" },
      { property: "og:description", content: "Score trends across review dates, with the behaviors improving and slipping." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(historyQueryOptions());
  },
  component: ProgressDashboard,
  errorComponent: ProgressError,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Nothing to show</h1>
      <p className="mt-2 text-sm text-ink-soft">No evaluation history is available for this view.</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" /> Back to the observation
      </Link>
    </div>
  ),
});

const historyQueryOptions = () =>
  queryOptions({
    queryKey: ["evaluation-history"],
    queryFn: () => getEvaluationHistory(),
  });

function ProgressError({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md px-5 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">The dashboard didn't load</h1>
      <p className="mt-2 text-sm text-ink-soft">Saved observations couldn't be read. Check your connection and try again.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => { router.invalidate(); reset(); }}><RotateCcw /> Try again</Button>
        <Button variant="outline" asChild><Link to="/"><ArrowLeft /> Back</Link></Button>
      </div>
    </div>
  );
}

const deltaChipClass = (delta: number | null) =>
  delta === null
    ? "bg-muted text-ink-soft"
    : delta > 0
      ? "bg-good/10 text-good ring-1 ring-good/25"
      : delta < 0
        ? "bg-amber-soft text-amber ring-1 ring-amber/30"
        : "bg-muted text-ink-soft";

const DeltaChip = ({ delta, suffix = "" }: { delta: number | null; suffix?: string }) => {
  if (delta === null) return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium", deltaChipClass(delta))}>first</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium", deltaChipClass(delta))}>
      {delta > 0 ? <TrendingUp className="size-3" /> : delta < 0 ? <TrendingDown className="size-3" /> : null}
      {trendLabel(delta)}{suffix}
    </span>
  );
};

function TrendSparkline({ points }: { points: EducatorProgress["points"] }) {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last || points.length < 2) return null;
  const width = 640;
  const height = 150;
  const padding = { top: 18, bottom: 30, left: 8, right: 8 };
  const totals = points.map((point) => point.total);
  const min = Math.max(0, Math.min(...totals) - 3);
  const max = Math.min(50, Math.max(...totals) + 3);
  const span = Math.max(1, max - min);
  const stepX = (width - padding.left - padding.right) / (points.length - 1);
  const yFor = (total: number) => padding.top + (1 - (total - min) / span) * (height - padding.top - padding.bottom);
  const coordinates = points.map((point, index) => ({ x: padding.left + index * stepX, y: yFor(point.total), point }));
  const start = coordinates[0];
  if (!start) return null;
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `${start.x},${height - padding.bottom} ${line} ${coordinates[coordinates.length - 1]?.x ?? start.x},${height - padding.bottom}`;
  const rising = last.total >= first.total;
  const stroke = rising ? "var(--color-good)" : "var(--color-amber)";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full" role="img" aria-label={`Total score trend across ${points.length} review dates, from ${first.total} to ${last.total} of 50`}>
      <polygon points={area} fill={stroke} opacity={0.09} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {coordinates.map(({ x, y, point }) => (
        <g key={point.date}>
          <circle cx={x} cy={y} r={4} fill="var(--color-background)" stroke={stroke} strokeWidth={2.5} />
          <text x={x} y={y - 10} textAnchor="middle" className="fill-foreground" fontSize={11} fontWeight={600}>{point.total}</text>
          <text x={x} y={height - 10} textAnchor="middle" className="fill-current text-ink-soft" fontSize={10}>{point.label}</text>
        </g>
      ))}
    </svg>
  );
}

function EducatorPanel({ educator }: { educator: EducatorProgress }) {
  const multipleDates = educator.points.length > 1;
  return (
    <section className="rise space-y-5">
      <div className="rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase text-primary">Score trend</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{educator.teacherName}</h2>
            <p className="text-sm text-ink-soft">{educator.classSubject} · {educator.observationCount} observation{educator.observationCount === 1 ? "" : "s"} across {educator.points.length} review date{educator.points.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="font-mono text-[10px] uppercase text-ink-soft">First → latest</p>
              <p className="font-display text-2xl font-semibold">{educator.firstTotal} <ArrowRight className="inline size-4 text-ink-soft" /> {educator.latestTotal}</p>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs font-semibold", deltaChipClass(educator.change))}>
              {educator.change > 0 ? <TrendingUp className="size-3.5" /> : educator.change < 0 ? <TrendingDown className="size-3.5" /> : null}
              {educator.change === 0 ? "No change" : `${educator.change > 0 ? "+" : ""}${educator.change} pts`}
            </span>
          </div>
        </div>
        {multipleDates ? (
          <>
            <TrendSparkline points={educator.points} />
            <p className="mt-2 text-center text-[12px] text-ink-soft">
              {educator.biggestGain ? <>Biggest gain: <strong className="font-semibold text-good">{educator.biggestGain.name} ({trendLabel(educator.biggestGain.delta)})</strong>.</> : null}
              {educator.biggestDrop ? <> Slipping: <strong className="font-semibold text-amber">{educator.biggestDrop.name} ({trendLabel(educator.biggestDrop.delta)})</strong>.</> : null}
            </p>
          </>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-line bg-background/40 p-4 text-center text-sm text-ink-soft">
            One review so far. Run another observation on a later date and this panel will chart the trend.
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl sm:p-6">
          <p className="font-mono text-[10px] uppercase text-ink-soft">Review dates</p>
          <ol className="mt-4 space-y-3">
            {[...educator.points].reverse().map((point) => (
              <li key={point.date} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-background/45 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{point.label}</p>
                  <p className="font-mono text-[10px] uppercase text-ink-soft">{point.mode === "recruitment" ? "Recruitment" : "In-service"} · focus: {point.focusMetric}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <p className="font-display text-xl font-semibold text-primary">{point.total}<span className="font-mono text-[10px] text-ink-soft"> / 50</span></p>
                  <DeltaChip delta={point.delta} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl sm:p-6">
          <p className="font-mono text-[10px] uppercase text-ink-soft">Behavior movement · first review vs latest</p>
          <ul className="mt-4 space-y-2.5">
            {educator.metricTrends.map((trend) => {
              const isGain = educator.biggestGain?.name === trend.name;
              const isDrop = educator.biggestDrop?.name === trend.name;
              return (
                <li key={trend.name} className={cn("rounded-xl border px-3.5 py-2.5", isGain ? "border-good/40 bg-good/5" : isDrop ? "border-amber/40 bg-amber-soft/60" : "border-line bg-background/45")}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-medium">{trend.name}</p>
                    <p className="flex items-center gap-2 font-mono text-[11px] text-ink-soft">
                      {trend.first} → {trend.latest}
                      <span className={cn("rounded-full px-1.5 py-0.5 font-medium", deltaChipClass(trend.delta))}>{trendLabel(trend.delta)}</span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className={cn("h-full rounded-full", isDrop ? "bg-amber" : "bg-primary")} style={{ width: `${trend.latest * 20}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </section>
  );
}

function ProgressDashboard() {
  const { data } = useSuspenseQuery(historyQueryOptions());
  const educators = useMemo(() => buildEducatorProgress(data.records), [data.records]);
  const [selectedKey, setSelectedKey] = useState<string | null>(educators[0]?.key ?? null);
  const selected = educators.find((educator) => educator.key === selectedKey) ?? educators[0] ?? null;

  return (
    <div className="min-h-screen bg-paper text-foreground antialiased">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-5">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <span className="grid size-9 place-items-center rounded-[10px] bg-foreground font-display text-lg font-semibold text-background">E</span>
            <div className="leading-tight">
              <p className="font-display text-[15px] font-semibold">EquiTeach</p>
              <p className="font-mono text-[10px] uppercase text-ink-soft">Progress dashboard</p>
            </div>
          </Link>
          <Button variant="outline" size="sm" className="ml-auto" asChild>
            <Link to="/"><ArrowLeft /> New observation</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase text-primary">Across review dates</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">Is the coaching working?</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">Every saved observation is compared against the educator's earlier reviews — totals, tiers, and which behaviors moved.</p>
        </div>

        {educators.length === 0 ? (
          <div className="mt-8 rounded-[26px] border border-dashed border-line bg-card p-10 text-center">
            <p className="font-display text-xl font-semibold">No saved observations yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Run an observation and complete the evaluation. Each saved review is added here so you can track progress over time.</p>
            <Button variant="instrument" className="mt-6" asChild><Link to="/">Begin an observation <ArrowRight /></Link></Button>
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {educators.map((educator) => (
                <button key={educator.key} type="button" aria-pressed={selected?.key === educator.key} onClick={() => setSelectedKey(educator.key)} className={cn("rounded-2xl border px-4 py-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]", selected?.key === educator.key ? "border-primary/50 bg-accent ring-1 ring-primary/25" : "border-line bg-card hover:border-primary/30")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{educator.teacherName}</p>
                    <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] font-medium", deltaChipClass(educator.change))}>{trendLabel(educator.change)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-ink-soft">{educator.classSubject}</p>
                  <p className="mt-2 font-mono text-[11px] text-ink-soft"><span className="font-display text-lg font-semibold text-primary">{educator.latestTotal}</span> / 50 · {educator.points.length} review date{educator.points.length === 1 ? "" : "s"}</p>
                </button>
              ))}
            </div>
            {selected && <div className="mt-5"><EducatorPanel educator={selected} /></div>}
          </>
        )}
      </main>
    </div>
  );
}
