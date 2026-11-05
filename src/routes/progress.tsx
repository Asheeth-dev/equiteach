import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Link, createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, ClipboardCheck, LayoutDashboard, LineChart, RotateCcw, Search, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const initials = educator.teacherName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return (
    <section className="rise space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(230px,0.72fr)_minmax(0,1.7fr)]">
        <section className="rounded-xl bg-primary p-5 text-primary-foreground sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-primary-foreground/15 font-display text-xl font-semibold">{initials || "E"}</div>
            <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 font-mono text-[10px] uppercase">Educator</span>
          </div>
          <h2 className="mt-5 break-words font-display text-2xl font-semibold">{educator.teacherName}</h2>
          <p className="mt-1 text-sm text-primary-foreground/75">{educator.classSubject}</p>
          <div className="mt-6 border-t border-primary-foreground/20 pt-4">
            <p className="font-mono text-[10px] uppercase text-primary-foreground/70">Latest observation</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="font-display text-4xl font-semibold leading-none">{educator.latestTotal}<span className="ml-1 text-base font-medium text-primary-foreground/70">/ 50</span></p>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold", educator.change > 0 ? "bg-background text-good" : educator.change < 0 ? "bg-background text-amber" : "bg-primary-foreground/15 text-primary-foreground")}>
                {educator.change > 0 ? <TrendingUp className="size-3" /> : educator.change < 0 ? <TrendingDown className="size-3" /> : null}
                {educator.change === 0 ? "No change" : `${educator.change > 0 ? "+" : ""}${educator.change} pts`}
              </span>
            </div>
            <p className="mt-2 text-xs text-primary-foreground/75">{educator.observationCount} saved observation{educator.observationCount === 1 ? "" : "s"} · {educator.points.length} review date{educator.points.length === 1 ? "" : "s"}</p>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-line bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase text-ink-soft">Performance over time</p>
              <h3 className="mt-1 font-display text-xl font-semibold">Review score trend</h3>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase text-ink-soft">First → latest</p>
              <p className="font-display text-lg font-semibold">{educator.firstTotal} <ArrowRight className="inline size-3.5 text-ink-soft" /> {educator.latestTotal}</p>
            </div>
          </div>
          {multipleDates ? (
            <>
              <TrendSparkline points={educator.points} />
              <p className="mt-1 text-center text-xs text-ink-soft">
                {educator.biggestGain ? <>Biggest gain: <strong className="font-semibold text-good">{educator.biggestGain.name} ({trendLabel(educator.biggestGain.delta)})</strong>.</> : null}
                {educator.biggestDrop ? <> Needs attention: <strong className="font-semibold text-amber">{educator.biggestDrop.name} ({trendLabel(educator.biggestDrop.delta)})</strong>.</> : null}
              </p>
            </>
          ) : (
            <div className="mt-5 grid min-h-36 place-items-center rounded-lg border border-dashed border-line bg-muted/40 p-5 text-center">
              <p className="max-w-sm text-sm leading-relaxed text-ink-soft">One review so far. A later observation will add a comparison point and reveal the score trend here.</p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="rounded-xl border border-line bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-primary" /><h3 className="font-display text-lg font-semibold">Review history</h3></div>
          <ol className="mt-4 divide-y divide-line">
            {[...educator.points].reverse().map((point) => (
              <li key={point.date} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{point.label}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">{point.mode === "recruitment" ? "Recruitment" : "In-service"} · Focus: {point.focusMetric}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="font-display text-lg font-semibold text-primary">{point.total}<span className="font-mono text-[10px] text-ink-soft"> / 50</span></p>
                  <DeltaChip delta={point.delta} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-line bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2"><LineChart className="size-4 text-primary" /><h3 className="font-display text-lg font-semibold">Behavior movement</h3></div>
          <p className="mt-1 text-xs text-ink-soft">First review compared with latest</p>
          <ul className="mt-4 space-y-3">
            {educator.metricTrends.map((trend) => {
              const isGain = educator.biggestGain?.name === trend.name;
              const isDrop = educator.biggestDrop?.name === trend.name;
              return (
                <li key={trend.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
                  <p className="truncate text-xs font-medium">{trend.name}</p>
                  <p className="flex items-center gap-2 font-mono text-[10px] text-ink-soft">
                    {trend.first} → {trend.latest}
                    <span className={cn("rounded-full px-1.5 py-0.5 font-medium", deltaChipClass(trend.delta))}>{trendLabel(trend.delta)}</span>
                  </p>
                  <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", isGain ? "bg-good" : isDrop ? "bg-amber" : "bg-primary")} style={{ width: `${trend.latest * 20}%` }} /></div>
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
  const [search, setSearch] = useState("");
  const visibleEducators = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return educators;
    return educators.filter((educator) => `${educator.teacherName} ${educator.classSubject}`.toLocaleLowerCase().includes(term));
  }, [educators, search]);
  const selected = visibleEducators.find((educator) => educator.key === selectedKey) ?? visibleEducators[0] ?? null;
  const observationCount = educators.reduce((sum, educator) => sum + educator.observationCount, 0);
  const averageLatest = educators.length ? Math.round(educators.reduce((sum, educator) => sum + educator.latestTotal, 0) / educators.length) : 0;

  return (
    <div className="min-h-screen bg-accent/30 text-foreground antialiased">
      <div className="min-h-screen lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden bg-foreground px-5 py-6 text-background lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <Link to="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">
            <span className="grid size-10 place-items-center rounded-lg border border-background/30 font-display text-xl font-semibold">E</span>
            <span className="font-display text-lg font-semibold">EquiTeach</span>
          </Link>
          <p className="mb-3 mt-10 px-3 font-mono text-[10px] uppercase text-background/55">Workspace</p>
          <nav className="space-y-1" aria-label="Main navigation">
            <span aria-current="page" className="flex items-center gap-3 rounded-md bg-primary-foreground px-3 py-2.5 text-sm font-semibold text-foreground"><LayoutDashboard className="size-4" /> Progress dashboard</span>
            <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-background/75 transition-colors hover:bg-background/10 hover:text-background"><ClipboardCheck className="size-4" /> New observation</Link>
          </nav>
          <div className="mt-auto border-t border-background/15 pt-5">
            <p className="px-3 text-xs leading-relaxed text-background/60">Objective observations. Clearer coaching. Measurable growth.</p>
            <Link to="/" className="mt-4 flex items-center gap-2 px-3 text-xs font-medium text-background/80 hover:text-background"><ArrowLeft className="size-3.5" /> Back to observation</Link>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,280px)] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase text-primary-foreground/70 sm:text-[10px]">EquiTeach / Progress</p>
                <h1 className="truncate font-display text-lg font-semibold sm:text-xl">Educator progress</h1>
              </div>
              <label className="relative block min-w-0">
                <span className="sr-only">Search educators</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an educator" className="h-10 border-transparent bg-background pl-9 text-foreground placeholder:text-ink-soft focus-visible:ring-primary-foreground" />
              </label>
            </div>
          </header>

          <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase text-primary">Observation insights</p>
                <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Progress, made visible.</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">Compare review scores over time and see which classroom practices are moving.</p>
              </div>
              <Button variant="instrument" size="sm" className="shrink-0" asChild><Link to="/"><BookOpen /> <span className="hidden sm:inline">New observation</span><span className="sm:hidden">New</span></Link></Button>
            </div>

        {educators.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-line bg-card p-10 text-center">
            <p className="font-display text-xl font-semibold">No saved observations yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Run an observation and complete the evaluation. Each saved review is added here so you can track progress over time.</p>
            <Button variant="instrument" className="mt-6" asChild><Link to="/">Begin an observation <ArrowRight /></Link></Button>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3.5"><span className="grid size-9 place-items-center rounded-lg bg-accent text-primary"><Users className="size-4" /></span><div><p className="font-mono text-[10px] uppercase text-ink-soft">Educators tracked</p><p className="font-display text-xl font-semibold">{educators.length}</p></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3.5"><span className="grid size-9 place-items-center rounded-lg bg-accent text-primary"><ClipboardCheck className="size-4" /></span><div><p className="font-mono text-[10px] uppercase text-ink-soft">Saved observations</p><p className="font-display text-xl font-semibold">{observationCount}</p></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3.5"><span className="grid size-9 place-items-center rounded-lg bg-accent text-primary"><LineChart className="size-4" /></span><div><p className="font-mono text-[10px] uppercase text-ink-soft">Average latest score</p><p className="font-display text-xl font-semibold">{averageLatest}<span className="ml-1 font-mono text-[10px] text-ink-soft">/ 50</span></p></div></div>
            </div>

            <div className="mt-7 grid items-start gap-5 xl:grid-cols-[minmax(230px,0.64fr)_minmax(0,1.8fr)]">
              <section className="overflow-hidden rounded-xl border border-line bg-card">
                <div className="flex items-center justify-between border-b border-line px-4 py-4">
                  <div><h3 className="font-display text-lg font-semibold">Educators</h3><p className="text-xs text-ink-soft">{visibleEducators.length} shown</p></div>
                  <Users className="size-4 text-primary" />
                </div>
                <div className="max-h-[560px] overflow-y-auto p-2">
                  {visibleEducators.length ? visibleEducators.map((educator) => (
                    <Button key={educator.key} type="button" variant="ghost" aria-pressed={selected?.key === educator.key} onClick={() => setSelectedKey(educator.key)} className={cn("mb-1 h-auto w-full justify-start whitespace-normal rounded-lg px-3 py-3 text-left", selected?.key === educator.key ? "bg-accent text-foreground" : "text-foreground hover:bg-muted")}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{educator.teacherName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{educator.teacherName}</span><span className="mt-0.5 block truncate text-xs text-ink-soft">{educator.classSubject}</span></span>
                      <span className="shrink-0 text-right"><span className="block font-display text-lg font-semibold text-primary">{educator.latestTotal}</span><span className={cn("font-mono text-[10px]", educator.change > 0 ? "text-good" : educator.change < 0 ? "text-amber" : "text-ink-soft")}>{trendLabel(educator.change)}</span></span>
                    </Button>
                  )) : <p className="px-3 py-8 text-center text-sm text-ink-soft">No educators match that search.</p>}
                </div>
              </section>
              {selected && <EducatorPanel educator={selected} />}
            </div>
          </>
        )}
          </main>
        </div>
      </div>
    </div>
  );
}
