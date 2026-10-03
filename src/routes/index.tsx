import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Download, RotateCcw, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import teacherPortrait from "@/assets/deepa-raman.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateResult, getDetailedFeedback, metrics, type EvaluationMode } from "@/lib/evaluation";
import { downloadEvaluationReport } from "@/lib/evaluation-report";
import { saveEvaluation } from "@/lib/evaluations.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EquiTeach — Objective Teacher Evaluation" },
      { name: "description", content: "Run a calibrated classroom observation and turn evidence into a hiring verdict or teacher coaching plan." },
      { property: "og:title", content: "EquiTeach — Objective Teacher Evaluation" },
      { property: "og:description", content: "Behavior-anchored classroom observation with instant, actionable results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquiTeach,
});

const GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const SUBJECTS = [
  "English", "Hindi", "Mathematics", "Science", "Physics", "Chemistry", "Biology",
  "Social Studies", "History", "Geography", "Civics", "Economics", "Computer Science",
  "Environmental Studies", "Physical Education", "Art", "Music", "Sanskrit", "Regional Language",
];

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type Stage = "setup" | "observe" | "result";
type SavedResult = ReturnType<typeof calculateResult> & { id?: string; action?: string };

function EquiTeach() {
  const save = useServerFn(saveEvaluation);
  const [stage, setStage] = useState<Stage>("setup");
  const [teacherName, setTeacherName] = useState("Deepa Raman");
  const [grade, setGrade] = useState("8");
  const [subject, setSubject] = useState("Science");
  const classSubject = `Class ${grade} · ${subject}`;
  const [mode, setMode] = useState<EvaluationMode>("recruitment");
  const [scores, setScores] = useState<number[]>(Array(10).fill(0));
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [exporting, setExporting] = useState(false);

  const completed = scores.filter(Boolean).length;
  const current = metrics[activeIndex] ?? metrics[0];
  const liveTotal = scores.reduce((sum, score) => sum + score, 0);
  const projectedTotal = completed ? Math.round((liveTotal / completed) * 10) : 0;
  const liveTier = projectedTotal <= 24 ? "Critical" : projectedTotal <= 39 ? "Developing" : "Proficient";
  const currentScore = scores[activeIndex] ?? 0;

  const lowestCurrent = useMemo(() => {
    const scored = scores.map((score, index) => ({ score, index })).filter(({ score }) => score > 0);
    scored.sort((a, b) => a.score - b.score);
    return scored[0] ? (metrics[scored[0].index] ?? metrics[0]) : current;
  }, [scores, current]);

  const selectScore = (score: number) => {
    setScores((existing) => existing.map((value, index) => (index === activeIndex ? score : value)));
  };

  const continueObservation = () => {
    if (!currentScore) return;
    const nextUnscored = scores.findIndex((score, index) => index > activeIndex && score === 0);
    if (nextUnscored >= 0) setActiveIndex(nextUnscored);
    else {
      const anyUnscored = scores.findIndex((score) => score === 0);
      if (anyUnscored >= 0) setActiveIndex(anyUnscored);
    }
  };

  const submitEvaluation = async () => {
    if (completed !== 10) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await save({ data: { teacherName, classSubject, mode, scores } });
      const local = calculateResult(scores, mode);
      setSavedResult({ ...local, id: result.id, action: result.action });
      setStage("result");
    } catch (error) {
      console.error(error);
      setSaveError("We couldn't save this evaluation. Your scores are still here — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const fillSample = () => {
    setScores([4, 3, 2, 4, 2, 3, 5, 4, 3, 3]);
    setActiveIndex(9);
  };

  useEffect(() => {
    if (stage !== "observe") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      const n = Number(event.key);
      if (n >= 1 && n <= 5) setScores((existing) => existing.map((v, i) => (i === activeIndex ? n : v)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, activeIndex]);

  const reset = () => {
    setScores(Array(10).fill(0));
    setActiveIndex(0);
    setSavedResult(null);
    setSaveError("");
    setStage("setup");
  };

  const exportReport = async () => {
    if (!savedResult) return;
    setExporting(true);
    try {
      await downloadEvaluationReport({
        teacherName,
        classSubject,
        mode,
        scores,
        total: savedResult.total,
        tier: savedResult.tier,
        verdict: savedResult.verdict,
        ...(savedResult.id ? { recordId: savedResult.id } : {}),
      });
    } finally {
      setExporting(false);
    }
  };

  const detailedFeedback = useMemo(() => getDetailedFeedback(scores), [scores]);

  return (
    <div className="min-h-screen bg-paper text-foreground antialiased">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-[10px] bg-foreground font-display text-lg font-semibold text-background">E</span>
            <div className="leading-tight">
              <p className="font-display text-[15px] font-semibold">EquiTeach</p>
              <p className="font-mono text-[10px] uppercase text-ink-soft">Observation instrument</p>
            </div>
          </div>
          {stage !== "setup" && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-medium uppercase text-accent-foreground ring-1 ring-primary/20">
              <span className="size-1.5 rounded-full bg-primary" />
              {mode === "recruitment" ? "Recruitment mode" : "In-service review"}
            </span>
          )}
          {stage !== "setup" && (
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-[13px] font-semibold">{teacherName}</p>
                <p className="font-mono text-[10px] text-ink-soft">{classSubject}</p>
              </div>
              <img src={teacherPortrait} alt="Deepa Raman" width={64} height={64} className="size-9 rounded-full object-cover ring-1 ring-border" />
            </div>
          )}
        </div>
      </header>

      {stage === "setup" && (
        <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <section className="rise max-w-2xl">
            <p className="font-mono text-[11px] font-medium uppercase text-primary">For school leaders who hire and coach teachers</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.04] sm:text-6xl">Evaluate what teachers do, not how they perform.</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">Score 10 visible classroom behaviors against written anchors. Get a defensible hiring verdict or a practical coaching plan in under three minutes.</p>
            <dl className="mt-8 grid max-w-xl gap-4 border-t border-line pt-5 sm:grid-cols-3">
              {[
                ['Problem', 'Demo-lesson hiring and reviews rely on gut feel and charisma.'],
                ['Solution', 'Each score is tied to a written behavior anchor you can point to.'],
                ['Different', 'Same scores give the same result every time. Every score comes with a next step.'],
              ].map(([label, text]) => (
                <div key={label}><dt className="font-mono text-[10px] font-medium uppercase text-primary">{label}</dt><dd className="mt-1.5 text-[13px] leading-snug text-ink-soft">{text}</dd></div>
              ))}
            </dl>
          </section>
          <section className="rise rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3 border-b border-line pb-5">
              <img src={teacherPortrait} alt="Deepa Raman" width={128} height={128} className="size-14 rounded-2xl object-cover ring-1 ring-border" />
              <div><p className="font-mono text-[10px] uppercase text-primary">New observation</p><h2 className="font-display text-xl font-semibold">Set the classroom context</h2></div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="space-y-2"><Label htmlFor="teacher">Teacher name</Label><Input id="teacher" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="grade">Class</Label>
                  <select id="grade" value={grade} onChange={(event) => setGrade(event.target.value)} className={selectClassName}>
                    {GRADES.map((g) => <option key={g} value={g}>Class {g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <select id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} className={selectClassName}>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Evaluation mode</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([['recruitment', 'Recruitment demo', 'Hire / conditional / decline'], ['in_service', 'In-service review', 'Detailed coaching plan']] as const).map(([value, label, hint]) => (
                    <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={cn("rounded-xl border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]", mode === value ? "border-primary/50 bg-accent ring-1 ring-primary/25" : "border-line bg-background/50 hover:border-primary/30")}>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-soft">{hint}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <Button variant="instrument" className="mt-2 h-11 w-full" disabled={teacherName.trim().length < 2} onClick={() => setStage("observe")}>
                Begin guided observation <ChevronRight />
              </Button>
              <p className="text-center text-[11px] text-ink-soft">10 metrics · about 2 minutes · no sign-in</p>
            </div>
          </section>
        </main>
      )}

      {stage === "observe" && (
        <main className="mx-auto grid max-w-6xl grid-cols-12 gap-5 px-4 py-5 sm:px-5 sm:py-6">
          <aside className="rise col-span-12 lg:col-span-3">
            <div className="rounded-[26px] border border-line bg-card p-4 backdrop-blur-xl">
              <div className="flex items-baseline justify-between"><p className="font-mono text-[10px] uppercase text-ink-soft">Rubric · 10 metrics</p><p className="font-mono text-[11px] font-medium">{String(completed).padStart(2, '0')}/10</p></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completed * 10}%` }} /></div>
              <ol className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-5 lg:grid-cols-1">
                {metrics.map((metric, index) => {
                  const score = scores[index];
                  const active = index === activeIndex;
                  return (
                    <li key={metric.name}>
                      <button type="button" aria-current={active ? "step" : undefined} onClick={() => setActiveIndex(index)} className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-accent ring-1 ring-primary/25" : "hover:bg-muted")}>
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full font-mono text-[10px] font-medium transition-colors", score ? "bg-foreground text-background" : active ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-ink-soft")}>{score ? <Check className="size-3" /> : index + 1}</span>
                        <span className={cn("min-w-0 flex-1 truncate", active && "font-semibold")}>{metric.shortName}</span>
                        <span className="font-mono text-[12px] text-ink-soft">{score || '–'}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {completed < 10 && <button type="button" onClick={fillSample} className="mt-3 w-full rounded-xl border border-dashed border-line px-3 py-2 text-[12px] text-ink-soft transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Demo: fill a sample observation</button>}
            </div>
          </aside>

          <section className="rise col-span-12 lg:col-span-6">
            <div className="rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] uppercase text-ink-soft">Metric {activeIndex + 1} of 10</span><span className="rounded-full bg-amber-soft px-2.5 py-1 font-mono text-[10px] font-medium uppercase text-amber ring-1 ring-amber/30">Behavior anchors</span></div>
              <h1 key={activeIndex} className="rise mt-2 font-display text-[28px] font-semibold leading-tight">{current.name}</h1>
              <p className="mt-2 text-sm text-ink-soft">Tap the behavior closest to what you saw. Use 2 or 4 when it falls between two anchors. Keys 1–5 also work.</p>
              <div className="mt-5 space-y-2.5">
                {([1, 3, 5] as const).map((anchor) => (
                  <button key={anchor} type="button" aria-pressed={currentScore === anchor} onClick={() => selectScore(anchor)} className={cn("flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]", currentScore === anchor ? "border-primary/40 bg-accent ring-1 ring-primary/20" : "border-line bg-background/40 hover:border-primary/30")}>
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-medium", currentScore === anchor ? "bg-primary text-primary-foreground" : "bg-foreground/5")}>{anchor}</span>
                    <span className="text-[13px] leading-snug text-ink-soft">{current.anchors[anchor]}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6"><div className="flex items-baseline justify-between"><p className="font-mono text-[10px] uppercase text-ink-soft">Your score</p><p className="font-display text-xl font-semibold text-primary">{currentScore || '–'} / 5</p></div>
                <div className="mt-2.5 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((score) => <Button key={score} type="button" aria-label={`Score ${score}`} aria-pressed={currentScore === score} variant={currentScore === score ? "scoreActive" : "score"} onClick={() => selectScore(score)}>{score}</Button>)}</div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                {completed < 10 && <Button variant="instrument" disabled={!currentScore} onClick={continueObservation}>Next metric <ChevronRight /></Button>}
                {activeIndex > 0 && <Button variant="ghost" onClick={() => setActiveIndex((index) => index - 1)}><ChevronLeft /> Previous</Button>}
                {completed === 10 && <Button className="sm:ml-auto" onClick={submitEvaluation} disabled={saving}>{saving ? "Saving evaluation…" : "Complete evaluation"}<ClipboardCheck /></Button>}
                {completed < 10 && <p className="text-[12px] text-ink-soft sm:ml-auto">{10 - completed} left to score</p>}
              </div>
              {saveError && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"><p className="text-sm text-destructive">{saveError}</p><Button size="sm" variant="outline" onClick={submitEvaluation} disabled={saving}><RotateCcw /> Try again</Button></div>}
            </div>
          </section>

          <aside className="rise col-span-12 lg:col-span-3">
            <div className="rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl lg:min-h-full">
              <p className="font-mono text-[10px] uppercase text-ink-soft">Live calibration</p>
              <div className="mt-3 flex items-end gap-2"><p className="font-display text-4xl font-semibold leading-none text-amber">{projectedTotal || '–'}</p><p className="pb-1 font-mono text-[12px] text-ink-soft">/ 50 projected</p></div>
              {completed > 0 && <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-2.5 py-1 ring-1 ring-amber/30"><span className="size-1.5 rounded-full bg-amber" /><span className="font-mono text-[10px] font-medium uppercase text-amber">{liveTier}</span></div>}
              <div className="mt-4 rounded-2xl border border-line bg-background/40 p-3.5"><p className="font-mono text-[10px] uppercase text-ink-soft">Evidence rule</p><p className="mt-1 text-[13px] leading-snug">Score the behavior you saw—not intent, reputation, or presentation style.</p></div>
              {completed > 0 && <div className="mt-3 rounded-2xl border border-line bg-background/40 p-3.5"><p className="font-mono text-[10px] uppercase text-ink-soft">Current focus</p><p className="mt-1 text-[13px] font-medium">{lowestCurrent.name}</p><p className="mt-1 text-[12px] leading-snug text-ink-soft">This will shape the final coaching script.</p></div>}
            </div>
          </aside>
        </main>
      )}

      {stage === "result" && savedResult && (
        <main className="mx-auto max-w-6xl px-5 py-8">
          <div className="rise flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6"><div><p className="font-mono text-[10px] uppercase text-primary">Evaluation saved</p><h1 className="mt-2 font-display text-4xl font-semibold">A clear decision, with a next step.</h1><p className="mt-2 text-ink-soft">{teacherName} · {classSubject}</p></div><div className="flex flex-wrap gap-2"><Button variant="instrument" onClick={exportReport} disabled={exporting}><Download />{exporting ? "Preparing PDF…" : "Export PDF report"}</Button><Button variant="outline" onClick={reset}><RotateCcw /> New observation</Button></div></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-[26px] border border-line bg-card p-6 backdrop-blur-xl"><p className="font-mono text-[10px] uppercase text-ink-soft">Final result</p><div className="mt-4 flex items-end gap-3"><p className="font-display text-6xl font-semibold text-primary">{savedResult.total}</p><p className="pb-2 font-mono text-sm text-ink-soft">/ 50 points</p></div><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"><Check className="size-4" />{savedResult.tier}</div>
              <div className="mt-5" role="img" aria-label={`Score ${savedResult.total} of 50 on the tier scale`}>
                <div className="relative flex h-2 gap-0.5">
                  <div className="h-full rounded-l-full bg-destructive/25" style={{ width: "50%" }} />
                  <div className="h-full bg-amber/35" style={{ width: "30%" }} />
                  <div className="h-full rounded-r-full bg-primary/40" style={{ width: "20%" }} />
                  <span className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-background bg-foreground shadow" style={{ left: `${savedResult.total * 2}%` }} />
                </div>
                <div className="mt-2 flex font-mono text-[10px] uppercase text-ink-soft"><span style={{ width: "50%" }}>Critical 0–24</span><span style={{ width: "30%" }}>Developing</span><span>40+</span></div>
              </div><div className="mt-6 border-t border-line pt-5"><p className="font-mono text-[10px] uppercase text-ink-soft">{mode === 'recruitment' ? 'Hiring verdict' : 'Growth pathway'}</p><p className="mt-2 font-display text-2xl font-semibold">{savedResult.verdict}</p></div></section>
            <section className="rounded-[26px] border border-line bg-card p-6 backdrop-blur-xl"><p className="font-mono text-[10px] uppercase text-primary">Priority coaching focus</p><h2 className="mt-2 font-display text-3xl font-semibold">{savedResult.focus.name}</h2><p className="mt-2 text-sm text-ink-soft">Lowest observed metric. Improve one visible behavior before adding complexity.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{[
              ['Ask', `“How did you decide whether every student understood ${savedResult.focus.name.toLowerCase()} today?”`],
              ['Describe', `“I observed a score of ${Math.min(...scores)} here. The visible gap was: ${savedResult.focus.anchors[1]}”`],
              ['Ask', `“What would change if you tried this next lesson: ${savedResult.action ?? savedResult.focus.action}”`]
            ].map(([label, text], index) => <div key={`${label}-${index}`} className="rounded-2xl border border-line bg-background/45 p-4"><p className="font-mono text-[10px] font-medium uppercase text-primary">{label}</p><p className="mt-2 text-[13px] leading-relaxed">{text}</p></div>)}</div></section>
          </div>
          <section className="mt-5 rounded-[26px] border border-line bg-card p-5 backdrop-blur-xl"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase text-ink-soft">Behavior profile</p><p className="mt-1 text-sm text-ink-soft">All ten evidence points remain visible for a defensible conversation.</p></div><p className="font-mono text-[10px] text-ink-soft">Record {savedResult.id?.slice(0, 8)}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map((metric, index) => { const score = scores[index] ?? 0; const isFocus = metric.name === savedResult.focus.name; return <div key={metric.name} className={cn("rounded-xl border p-3", isFocus ? "border-amber/50 bg-amber-soft ring-1 ring-amber/30" : "border-line bg-background/45")}><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-medium">{metric.shortName}</p><span className="font-display text-lg font-semibold">{score}</span></div><div className="mt-2 h-1.5 rounded-full bg-foreground/10"><div className={cn("h-full rounded-full", isFocus ? "bg-amber" : score >= 4 ? "bg-primary" : "bg-primary/55")} style={{ width: `${score * 20}%` }} /></div>{isFocus && <p className="mt-1.5 font-mono text-[9px] font-medium uppercase text-amber">Coaching focus</p>}</div>; })}</div></section>
          {mode === "in_service" && <section className="mt-5 border-t border-line pt-7"><div className="max-w-3xl"><p className="font-mono text-[10px] uppercase text-primary">Detailed development feedback</p><h2 className="mt-2 font-display text-3xl font-semibold">What to strengthen next</h2><p className="mt-3 text-sm leading-relaxed text-ink-soft">{detailedFeedback.summary}</p></div><div className="mt-6 grid gap-4 lg:grid-cols-3">{detailedFeedback.improvements.map((area, index) => <article key={area.metric.name} className="rounded-[22px] border border-line bg-card p-5"><div className="flex items-center justify-between gap-3"><span className="grid size-8 place-items-center rounded-lg bg-accent font-mono text-xs font-semibold text-accent-foreground">{index + 1}</span><span className="font-mono text-xs text-ink-soft">{area.score}/5</span></div><h3 className="mt-4 font-display text-xl font-semibold">{area.metric.name}</h3><div className="mt-4 space-y-4 text-sm leading-relaxed"><div><p className="font-mono text-[10px] uppercase text-ink-soft">Observed area</p><p className="mt-1">{area.observedGap}</p></div><div><p className="font-mono text-[10px] uppercase text-primary">Better next lesson</p><p className="mt-1 font-medium">{area.nextStep}</p></div><div><p className="font-mono text-[10px] uppercase text-ink-soft">Evidence of progress</p><p className="mt-1 text-ink-soft">{area.evidenceToLookFor}</p></div></div></article>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"><div className="rounded-[22px] border border-line bg-card p-5"><div className="flex items-center gap-2"><Target className="size-4 text-primary"/><h3 className="font-display text-xl font-semibold">Four-step practice cycle</h3></div><ol className="mt-4 space-y-3">{detailedFeedback.practicePlan.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-relaxed"><span className="font-mono text-xs font-semibold text-primary">0{index + 1}</span><span>{step}</span></li>)}</ol></div><div className="rounded-[22px] border border-line bg-accent/60 p-5"><p className="font-mono text-[10px] uppercase text-primary">Build from strength</p>{detailedFeedback.strengths.map((strength) => <div key={strength.metric.name} className="mt-4"><div className="flex justify-between gap-3"><p className="font-semibold">{strength.metric.name}</p><span className="font-mono text-xs">{strength.score}/5</span></div><p className="mt-1 text-xs leading-relaxed text-ink-soft">{strength.evidence}</p></div>)}<p className="mt-5 border-t border-primary/15 pt-4 text-sm font-medium leading-relaxed">{detailedFeedback.reviewPrompt}</p></div></div></section>}
        </main>
      )}
    </div>
  );
}
